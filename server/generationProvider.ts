import { ENV } from "./_core/env";
import { invokeLLM, type InvokeParams, type InvokeResult, type Message, type MessageContent } from "./_core/llm";
import { circuitOpenMessage, classifyCircuitOpen } from "./generationOptimization";
import { closeGenerationCircuit, getGenerationProviderSettings, getOpenGenerationCircuit, openGenerationCircuit } from "./db";

export type GenerationProvider = "managed_llm" | "gemini_byok";

export type ProviderTokenUsage = {
  inputTokens: number | null;
  outputTokens: number | null;
  cachedTokens: number | null;
  totalTokens: number | null;
};

export type GenerationProviderTelemetry = {
  provider: GenerationProvider;
  fallbackUsed: boolean;
  primaryFailureType: string | null;
  managedRetryAttempts: number;
  geminiRetryAttempts: number;
  usage?: ProviderTokenUsage;
};

export type ProviderGenerationResult = {
  response: InvokeResult;
  telemetry: GenerationProviderTelemetry;
};

export type ProviderFailureEvidence = {
  provider: GenerationProvider;
  classification: "transient_rate_limit" | "quota_exhaustion" | "provider_error";
  httpStatus: number | null;
  retryAttempts: number;
  circuitOpen: boolean;
  retryAfterSeconds: number | null;
  primaryFailureType: string | null;
};

type ProviderFailureCarrier = Error & { providerFailure?: ProviderFailureEvidence };

// One provider-directed retry avoids repeated early calls while keeping the request within a practical server timeout.
const MAX_TRANSIENT_RETRY_ATTEMPTS = 2;
const GEMINI_MODEL = "gemini-3.6-flash";
const MAX_PROVIDER_RETRY_DELAY_MS = 45_000;

function messageText(content: MessageContent | MessageContent[]) {
  const entries = Array.isArray(content) ? content : [content];
  return entries.map((entry) => typeof entry === "string" ? entry : entry.type === "text" ? entry.text : "").filter(Boolean).join("\n");
}

export function retryDelayMs(attempt: number, retryAfterHeader: string | null, providerResponseText = "") {
  const retryAfterSeconds = Number.parseFloat(retryAfterHeader ?? "");
  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds >= 0) return Math.min(MAX_PROVIDER_RETRY_DELAY_MS, Math.ceil(retryAfterSeconds * 1_000));
  const providerHint = providerResponseText.match(/retry\s+in\s+([0-9]+(?:\.[0-9]+)?)\s*(?:s|seconds?)/i);
  if (providerHint?.[1]) {
    const providerRetrySeconds = Number.parseFloat(providerHint[1]);
    if (Number.isFinite(providerRetrySeconds) && providerRetrySeconds >= 0) {
      return Math.min(MAX_PROVIDER_RETRY_DELAY_MS, Math.ceil(providerRetrySeconds * 1_000));
    }
  }
  const base = Math.min(4_000, 400 * 2 ** attempt);
  return base + Math.floor(Math.random() * Math.max(1, Math.floor(base * 0.25)));
}

function isTransientStatus(status: number) {
  return [408, 425, 429, 500, 502, 503, 504].includes(status);
}

function parseRetryAfterSeconds(message: string) {
  const match = message.match(/retry\s+(?:in|after)\s+([0-9]+(?:\.[0-9]+)?)\s*(?:s|seconds?)/i);
  if (!match?.[1]) return null;
  const seconds = Number.parseFloat(match[1]);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : null;
}

export function getProviderFailureEvidence(error: unknown): ProviderFailureEvidence | null {
  if (error && typeof error === "object" && "providerFailure" in error) {
    const evidence = (error as ProviderFailureCarrier).providerFailure;
    if (evidence) return evidence;
  }
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (!message) return null;
  const normalized = message.toLowerCase();
  const transportDetails = error && typeof error === "object" ? error as { httpStatus?: unknown; retryAttempts?: unknown; retryAfterSeconds?: unknown } : undefined;
  const statusMatch = message.match(/\b(408|412|425|429|500|502|503|504)\b/);
  const httpStatus = typeof transportDetails?.httpStatus === "number" ? transportDetails.httpStatus : statusMatch ? Number.parseInt(statusMatch[1]!, 10) : null;
  const policy = classifyCircuitOpen(message);
  return {
    provider: normalized.includes("gemini fallback") ? "gemini_byok" : "managed_llm",
    classification: policy?.failureType === "quota_exhaustion" ? "quota_exhaustion" : policy?.failureType === "transient_rate_limit" || httpStatus === 429 ? "transient_rate_limit" : "provider_error",
    httpStatus,
    retryAttempts: typeof transportDetails?.retryAttempts === "number" ? transportDetails.retryAttempts : 0,
    circuitOpen: normalized.includes("temporarily paused") && normalized.includes("no new model call"),
    retryAfterSeconds: typeof transportDetails?.retryAfterSeconds === "number" ? transportDetails.retryAfterSeconds : parseRetryAfterSeconds(message),
    primaryFailureType: null,
  };
}

function createProviderFailureError(message: string, providerFailure: ProviderFailureEvidence) {
  const error = new Error(message) as ProviderFailureCarrier;
  error.providerFailure = providerFailure;
  return error;
}

function toProviderTokenUsage(usage: InvokeResult["usage"] | undefined): ProviderTokenUsage | undefined {
  if (!usage) return undefined;
  return {
    inputTokens: usage.prompt_tokens ?? null,
    outputTokens: usage.completion_tokens ?? null,
    cachedTokens: usage.cached_tokens ?? null,
    totalTokens: usage.total_tokens ?? null,
  };
}

async function invokeGeminiFallback(params: InvokeParams): Promise<InvokeResult> {
  if (!ENV.geminiApiKey) throw new Error("Gemini fallback is enabled but its secure server credential is unavailable.");
  const systemText = params.messages.filter((message) => message.role === "system").map((message) => messageText(message.content)).filter(Boolean).join("\n\n");
  const conversationText = params.messages.filter((message) => message.role !== "system").map((message) => `${message.role.toUpperCase()}:\n${messageText(message.content)}`).filter(Boolean).join("\n\n");
  const format = params.response_format ?? params.responseFormat;
  const body: Record<string, unknown> = {
    model: GEMINI_MODEL,
    input: `${systemText ? `SYSTEM INSTRUCTIONS:\n${systemText}\n\n` : ""}${conversationText}`,
    store: false,
  };
  if (format?.type === "json_schema") body.response_format = { type: "text", mime_type: "application/json", schema: format.json_schema.schema };

  for (let attempt = 0; attempt < MAX_TRANSIENT_RETRY_ATTEMPTS; attempt += 1) {
    let response: Response;
    try {
      response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": ENV.geminiApiKey },
        body: JSON.stringify(body),
      });
    } catch (error) {
      if (attempt === MAX_TRANSIENT_RETRY_ATTEMPTS - 1) throw new Error(`Gemini fallback invoke failed after ${MAX_TRANSIENT_RETRY_ATTEMPTS} transient attempts: ${error instanceof Error ? error.message : "Unknown network failure"}`);
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs(attempt, null)));
      continue;
    }
    if (response.ok) {
      const payload = await response.json() as { id?: string; created?: string | number; model?: string; output_text?: string; steps?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }>; usage?: { total_input_tokens?: number; total_output_tokens?: number; total_cached_tokens?: number; total_tokens?: number } };
      const outputText = payload.output_text ?? payload.steps?.filter((step) => step.type === "model_output").flatMap((step) => step.content ?? []).filter((content) => content.type === "text").map((content) => content.text ?? "").join("");
      if (!outputText) throw new Error("Gemini fallback returned no structured content.");
      return {
        id: payload.id ?? `gemini-byok-${Date.now()}`,
        created: typeof payload.created === "string" ? Math.floor(new Date(payload.created).getTime() / 1_000) : payload.created ?? Math.floor(Date.now() / 1_000),
        model: payload.model ?? GEMINI_MODEL,
        choices: [{ index: 0, message: { role: "assistant", content: outputText }, finish_reason: "stop" }],
        usage: payload.usage ? { prompt_tokens: payload.usage.total_input_tokens ?? 0, completion_tokens: payload.usage.total_output_tokens ?? 0, cached_tokens: payload.usage.total_cached_tokens, total_tokens: payload.usage.total_tokens ?? 0 } : undefined,
        retryAttempts: attempt,
      };
    }
    const text = await response.text();
    const message = `Gemini fallback invoke failed: ${response.status} ${response.statusText} – ${text}`;
    if (!isTransientStatus(response.status) || attempt === MAX_TRANSIENT_RETRY_ATTEMPTS - 1) {
      const policy = classifyCircuitOpen(message);
      throw createProviderFailureError(message, {
        provider: "gemini_byok",
        classification: policy?.failureType === "quota_exhaustion" ? "quota_exhaustion" : policy?.failureType === "transient_rate_limit" || response.status === 429 ? "transient_rate_limit" : "provider_error",
        httpStatus: response.status,
        retryAttempts: attempt,
        circuitOpen: false,
        retryAfterSeconds: parseRetryAfterSeconds(text),
        primaryFailureType: null,
      });
    }
    await new Promise((resolve) => setTimeout(resolve, retryDelayMs(attempt, response.headers.get("retry-after"), text)));
  }
  throw new Error("Gemini fallback invoke failed after retry attempts were exhausted.");
}

function quotaFailureType(message: string) {
  return classifyCircuitOpen(message)?.failureType === "quota_exhaustion" ? "quota_exhaustion" : null;
}

async function tryGeminiFallback(params: InvokeParams, primaryFailureType: string, managedRetryAttempts: number): Promise<ProviderGenerationResult> {
  const openGeminiCircuit = await getOpenGenerationCircuit("gemini_byok");
  if (openGeminiCircuit?.openUntil && openGeminiCircuit.failureType) {
    throw createProviderFailureError(circuitOpenMessage(openGeminiCircuit.failureType, openGeminiCircuit.openUntil), {
      provider: "gemini_byok",
      classification: openGeminiCircuit.failureType === "quota_exhaustion" ? "quota_exhaustion" : "transient_rate_limit",
      httpStatus: null,
      retryAttempts: 0,
      circuitOpen: true,
      retryAfterSeconds: Math.max(0, Math.ceil((openGeminiCircuit.openUntil.getTime() - Date.now()) / 1_000)),
      primaryFailureType,
    });
  }
  try {
    const response = await invokeGeminiFallback(params);
    await closeGenerationCircuit("gemini_byok");
    return { response, telemetry: { provider: "gemini_byok", fallbackUsed: true, primaryFailureType, managedRetryAttempts, geminiRetryAttempts: response.retryAttempts ?? 0, usage: toProviderTokenUsage(response.usage) } };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const policy = classifyCircuitOpen(message);
    if (policy) await openGenerationCircuit({ ...policy, serviceKey: "gemini_byok" });
    const evidence = getProviderFailureEvidence(error) ?? {
      provider: "gemini_byok" as const,
      classification: policy?.failureType === "quota_exhaustion" ? "quota_exhaustion" as const : policy?.failureType === "transient_rate_limit" ? "transient_rate_limit" as const : "provider_error" as const,
      httpStatus: null,
      retryAttempts: 0,
      circuitOpen: false,
      retryAfterSeconds: null,
      primaryFailureType: null,
    };
    throw createProviderFailureError(message, { ...evidence, provider: "gemini_byok", primaryFailureType });
  }
}

export async function invokeGenerationProvider(params: InvokeParams): Promise<ProviderGenerationResult> {
  const settings = await getGenerationProviderSettings();
  const managedCircuit = await getOpenGenerationCircuit("managed_llm");
  const fallbackEligible = settings.geminiFallbackEnabled === 1 && Boolean(ENV.geminiApiKey);
  if (managedCircuit?.openUntil && managedCircuit.failureType) {
    if (managedCircuit.failureType !== "quota_exhaustion" || !fallbackEligible) {
      throw createProviderFailureError(circuitOpenMessage(managedCircuit.failureType, managedCircuit.openUntil), {
        provider: "managed_llm",
        classification: managedCircuit.failureType === "quota_exhaustion" ? "quota_exhaustion" : "transient_rate_limit",
        httpStatus: null,
        retryAttempts: 0,
        circuitOpen: true,
        retryAfterSeconds: Math.max(0, Math.ceil((managedCircuit.openUntil.getTime() - Date.now()) / 1_000)),
        primaryFailureType: null,
      });
    }
    return tryGeminiFallback(params, "quota_exhaustion", 0);
  }
  try {
    const response = await invokeLLM(params);
    await closeGenerationCircuit("managed_llm");
    return { response, telemetry: { provider: "managed_llm", fallbackUsed: false, primaryFailureType: null, managedRetryAttempts: response.retryAttempts ?? 0, geminiRetryAttempts: 0, usage: toProviderTokenUsage(response.usage) } };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const policy = classifyCircuitOpen(message);
    if (policy) await openGenerationCircuit({ ...policy, serviceKey: "managed_llm" });
    if (!fallbackEligible || !quotaFailureType(message)) {
      const evidence = getProviderFailureEvidence(error) ?? {
        provider: "managed_llm" as const,
        classification: policy?.failureType === "quota_exhaustion" ? "quota_exhaustion" as const : policy?.failureType === "transient_rate_limit" ? "transient_rate_limit" as const : "provider_error" as const,
        httpStatus: null,
        retryAttempts: 0,
        circuitOpen: false,
        retryAfterSeconds: null,
        primaryFailureType: null,
      };
      throw createProviderFailureError(message, { ...evidence, provider: "managed_llm" });
    }
    return tryGeminiFallback(params, "quota_exhaustion", 0);
  }
}

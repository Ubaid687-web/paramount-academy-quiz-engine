import { ENV } from "./_core/env";
import { invokeLLM, type InvokeParams, type InvokeResult, type Message, type MessageContent } from "./_core/llm";
import { circuitOpenMessage, classifyCircuitOpen } from "./generationOptimization";
import { closeGenerationCircuit, getGenerationProviderSettings, getOpenGenerationCircuit, openGenerationCircuit } from "./db";

export type GenerationProvider = "managed_llm" | "gemini_byok";

export type GenerationProviderTelemetry = {
  provider: GenerationProvider;
  fallbackUsed: boolean;
  primaryFailureType: string | null;
  managedRetryAttempts: number;
  geminiRetryAttempts: number;
};

export type ProviderGenerationResult = {
  response: InvokeResult;
  telemetry: GenerationProviderTelemetry;
};

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
      const payload = await response.json() as { id?: string; created?: string | number; model?: string; output_text?: string; steps?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }>; usage?: { total_input_tokens?: number; total_output_tokens?: number; total_tokens?: number } };
      const outputText = payload.output_text ?? payload.steps?.filter((step) => step.type === "model_output").flatMap((step) => step.content ?? []).filter((content) => content.type === "text").map((content) => content.text ?? "").join("");
      if (!outputText) throw new Error("Gemini fallback returned no structured content.");
      return {
        id: payload.id ?? `gemini-byok-${Date.now()}`,
        created: typeof payload.created === "string" ? Math.floor(new Date(payload.created).getTime() / 1_000) : payload.created ?? Math.floor(Date.now() / 1_000),
        model: payload.model ?? GEMINI_MODEL,
        choices: [{ index: 0, message: { role: "assistant", content: outputText }, finish_reason: "stop" }],
        usage: payload.usage ? { prompt_tokens: payload.usage.total_input_tokens ?? 0, completion_tokens: payload.usage.total_output_tokens ?? 0, total_tokens: payload.usage.total_tokens ?? 0 } : undefined,
        retryAttempts: attempt,
      };
    }
    const text = await response.text();
    const message = `Gemini fallback invoke failed: ${response.status} ${response.statusText} – ${text}`;
    if (!isTransientStatus(response.status) || attempt === MAX_TRANSIENT_RETRY_ATTEMPTS - 1) throw new Error(message);
    await new Promise((resolve) => setTimeout(resolve, retryDelayMs(attempt, response.headers.get("retry-after"), text)));
  }
  throw new Error("Gemini fallback invoke failed after retry attempts were exhausted.");
}

function quotaFailureType(message: string) {
  return classifyCircuitOpen(message)?.failureType === "quota_exhaustion" ? "quota_exhaustion" : null;
}

async function tryGeminiFallback(params: InvokeParams, primaryFailureType: string, managedRetryAttempts: number): Promise<ProviderGenerationResult> {
  const openGeminiCircuit = await getOpenGenerationCircuit("gemini_byok");
  if (openGeminiCircuit?.openUntil && openGeminiCircuit.failureType) throw new Error(circuitOpenMessage(openGeminiCircuit.failureType, openGeminiCircuit.openUntil));
  try {
    const response = await invokeGeminiFallback(params);
    await closeGenerationCircuit("gemini_byok");
    return { response, telemetry: { provider: "gemini_byok", fallbackUsed: true, primaryFailureType, managedRetryAttempts, geminiRetryAttempts: response.retryAttempts ?? 0 } };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const policy = classifyCircuitOpen(message);
    if (policy) await openGenerationCircuit({ ...policy, serviceKey: "gemini_byok" });
    throw error;
  }
}

export async function invokeGenerationProvider(params: InvokeParams): Promise<ProviderGenerationResult> {
  const settings = await getGenerationProviderSettings();
  const managedCircuit = await getOpenGenerationCircuit("managed_llm");
  const fallbackEligible = settings.geminiFallbackEnabled === 1 && Boolean(ENV.geminiApiKey);
  if (managedCircuit?.openUntil && managedCircuit.failureType) {
    if (managedCircuit.failureType !== "quota_exhaustion" || !fallbackEligible) throw new Error(circuitOpenMessage(managedCircuit.failureType, managedCircuit.openUntil));
    return tryGeminiFallback(params, "quota_exhaustion", 0);
  }
  try {
    const response = await invokeLLM(params);
    await closeGenerationCircuit("managed_llm");
    return { response, telemetry: { provider: "managed_llm", fallbackUsed: false, primaryFailureType: null, managedRetryAttempts: response.retryAttempts ?? 0, geminiRetryAttempts: 0 } };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const policy = classifyCircuitOpen(message);
    if (policy) await openGenerationCircuit({ ...policy, serviceKey: "managed_llm" });
    if (!fallbackEligible || !quotaFailureType(message)) throw error;
    return tryGeminiFallback(params, "quota_exhaustion", 0);
  }
}

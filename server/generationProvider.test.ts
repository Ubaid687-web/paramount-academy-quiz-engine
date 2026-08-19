import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  invokeLLM: vi.fn(),
  getGenerationProviderSettings: vi.fn(),
  getOpenGenerationCircuit: vi.fn(),
  openGenerationCircuit: vi.fn(),
  closeGenerationCircuit: vi.fn(),
}));

vi.mock("./_core/env", () => ({ ENV: { geminiApiKey: "test-gemini-key" } }));
vi.mock("./_core/llm", () => ({ invokeLLM: mocks.invokeLLM }));
vi.mock("./db", () => ({
  getGenerationProviderSettings: mocks.getGenerationProviderSettings,
  getOpenGenerationCircuit: mocks.getOpenGenerationCircuit,
  openGenerationCircuit: mocks.openGenerationCircuit,
  closeGenerationCircuit: mocks.closeGenerationCircuit,
}));

import { invokeGenerationProvider } from "./generationProvider";

const request = {
  messages: [
    { role: "system" as const, content: "Return JSON." },
    { role: "user" as const, content: "Generate one question." },
  ],
  response_format: { type: "json_schema" as const, json_schema: { name: "paper", strict: true, schema: { type: "object", properties: { mcqs: { type: "array" } }, required: ["mcqs"], additionalProperties: false } } },
};

describe("generation provider fallback", () => {
  beforeEach(() => {
    mocks.invokeLLM.mockReset();
    mocks.getGenerationProviderSettings.mockReset().mockResolvedValue({ geminiFallbackEnabled: 1 });
    mocks.getOpenGenerationCircuit.mockReset().mockResolvedValue(undefined);
    mocks.openGenerationCircuit.mockReset().mockResolvedValue(undefined);
    mocks.closeGenerationCircuit.mockReset().mockResolvedValue(undefined);
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => vi.unstubAllGlobals());

  it("uses Gemini only after a managed-provider quota exhaustion and records isolated provider telemetry", async () => {
    mocks.invokeLLM.mockRejectedValue(new Error("LLM invoke failed: 412 Precondition Failed – usage exhausted"));
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ created: "2026-08-19T00:00:00Z", model: "gemini-3.6-flash", steps: [{ type: "model_output", content: [{ type: "text", text: '{"mcqs":[]}' }] }] }), { status: 200 }));

    const result = await invokeGenerationProvider(request);

    expect(result.telemetry).toMatchObject({ provider: "gemini_byok", fallbackUsed: true, primaryFailureType: "quota_exhaustion" });
    expect(mocks.openGenerationCircuit).toHaveBeenCalledWith(expect.objectContaining({ serviceKey: "managed_llm", failureType: "quota_exhaustion" }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toContain("/interactions");
  });

  it("does not route a transient managed-provider rate limit to Gemini", async () => {
    mocks.invokeLLM.mockRejectedValue(new Error("LLM invoke failed: 429 Too Many Requests – rate limit"));

    await expect(invokeGenerationProvider(request)).rejects.toThrow("429");

    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
    expect(mocks.openGenerationCircuit).toHaveBeenCalledWith(expect.objectContaining({ serviceKey: "managed_llm", failureType: "transient_rate_limit" }));
  });

  it("uses Gemini directly when only the managed-provider quota circuit is open", async () => {
    mocks.getOpenGenerationCircuit.mockImplementation(async (serviceKey?: string) => serviceKey === "managed_llm" ? { failureType: "quota_exhaustion", openUntil: new Date(Date.now() + 60_000) } : undefined);
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ created: "2026-08-19T00:00:00Z", model: "gemini-3.6-flash", steps: [{ type: "model_output", content: [{ type: "text", text: '{"mcqs":[]}' }] }] }), { status: 200 }));

    const result = await invokeGenerationProvider(request);

    expect(mocks.invokeLLM).not.toHaveBeenCalled();
    expect(result.telemetry.provider).toBe("gemini_byok");
  });
});

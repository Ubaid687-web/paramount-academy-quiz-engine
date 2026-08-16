import { afterEach, describe, expect, it, vi } from "vitest";
import { invokeLLM } from "./_core/llm";

function installImmediateTimers() {
  return vi.spyOn(globalThis, "setTimeout").mockImplementation(((callback: TimerHandler) => {
    if (typeof callback === "function") callback();
    return 0 as unknown as ReturnType<typeof setTimeout>;
  }) as typeof setTimeout);
}

describe("LLM transient retry transport", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("retries transient rate limits and service failures with backoff before returning a successful response", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response("rate limited", { status: 429, statusText: "Too Many Requests", headers: { "retry-after": "0" } }))
      .mockResolvedValueOnce(new Response("temporary outage", { status: 503, statusText: "Service Unavailable" }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "result-1", created: 1, model: "test", choices: [] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    installImmediateTimers();

    const result = await invokeLLM({ messages: [{ role: "user", content: "Generate one MCQ." }] });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result).toMatchObject({ id: "result-1", choices: [] });
  });

  it("does not retry quota and billing failures that require account action", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("usage exhausted", { status: 412, statusText: "Precondition Failed" })
    );
    vi.stubGlobal("fetch", fetchMock);
    installImmediateTimers();

    await expect(invokeLLM({ messages: [{ role: "user", content: "Generate one MCQ." }] })).rejects.toThrow("412 Precondition Failed");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

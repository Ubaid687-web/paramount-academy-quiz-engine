import { describe, expect, it } from "vitest";
import { buildBudgetedSourceText, buildGenerationRequestFingerprint, circuitOpenMessage, classifyCircuitOpen } from "./generationOptimization";

describe("generation optimization controls", () => {
  it("changes an exact-request key when prior paper coverage changes", () => {
    const base = {
      mode: "mcq" as const,
      contentText: "Approved textbook source content.",
      difficulty: "balanced",
      requestedCount: 10,
      sourceSnapshot: { chapters: [{ id: 1, title: "Motion" }] },
    };
    const first = buildGenerationRequestFingerprint({ ...base, priorQuestionHistory: [] });
    const afterSavedDraft = buildGenerationRequestFingerprint({
      ...base,
      priorQuestionHistory: [{ question: "Define velocity.", conceptKey: "velocity", facetKey: "definition", answerTarget: "rate of displacement" }],
    });
    expect(afterSavedDraft).not.toBe(first);
  });

  it("keeps small selected sources intact and budgets only oversized source prompts", () => {
    const small = buildBudgetedSourceText("Short reviewed source.");
    const large = buildBudgetedSourceText("A long source paragraph with verified textbook content.\n\n".repeat(3000));
    expect(small.compacted).toBe(false);
    expect(small.text).toBe("Short reviewed source.");
    expect(large.compacted).toBe(true);
    expect(large.sentChars).toBeLessThan(large.sourceChars);
    expect(large.text).toContain("SOURCE EXCERPT");
  });

  it("opens a long hold for quota/billing failures and a short hold for transient rate limits", () => {
    expect(classifyCircuitOpen("LLM invoke failed: 412 usage exhausted")).toEqual({ failureType: "quota_exhaustion", holdMinutes: 30 });
    expect(classifyCircuitOpen("HTTP 429 Too Many Requests")).toEqual({ failureType: "transient_rate_limit", holdMinutes: 2 });
    expect(classifyCircuitOpen("source validation failed")).toBeNull();
  });

  it("explains that an open circuit prevented a new model call", () => {
    const message = circuitOpenMessage("quota_exhaustion", new Date("2026-08-17T06:30:00.000Z"));
    expect(message).toContain("No new model call was made");
    expect(message).toContain("quota or billing restriction");
  });
});

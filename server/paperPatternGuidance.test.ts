import { describe, expect, it } from "vitest";
import { buildVerifiedPaperPatternSummary, getVerifiedMarkRule } from "./paperPatternGuidance";

describe("verified paper-pattern guidance", () => {
  const computerScienceAnnuals = [
    { sourceId: 1, sourceKind: "past_paper" as const, academicYear: "2024", mcqCount: 13, mcqMarksEach: 1, shortOrPairCount: 11, shortMarksEach: 2, longOrPairCount: 4, longMarksEach: 5, orRule: "OR verified" },
    { sourceId: 2, sourceKind: "past_paper" as const, academicYear: "2025", mcqCount: 13, mcqMarksEach: 1, shortOrPairCount: 11, shortMarksEach: 2, longOrPairCount: 4, longMarksEach: 5, orRule: "OR verified" },
  ];

  it("preserves verified Section A, B, C, marks, and OR structure as format-only guidance", () => {
    const summary = buildVerifiedPaperPatternSummary(computerScienceAnnuals);

    expect(summary).toContain("13 MCQs of 1 mark each");
    expect(summary).toContain("11 brief parts of 2 marks each");
    expect(summary).toContain("4 long-question slots of 5 marks each");
    expect(summary).toContain("OR alternatives are verified");
    expect(summary).not.toContain("answer facts");
    expect(getVerifiedMarkRule("short", computerScienceAnnuals)).toBe(2);
    expect(getVerifiedMarkRule("long", computerScienceAnnuals)).toBe(5);
  });

  it("does not invent a shared mark rule when reviewed profiles differ or omit it", () => {
    expect(getVerifiedMarkRule("short", [
      { sourceKind: "model_paper", academicYear: "2022-2023", shortMarksEach: 2 },
      { sourceKind: "past_paper", academicYear: "2026", shortMarksEach: 3 },
    ])).toBeNull();
  });
});

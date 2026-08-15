import { describe, expect, it } from "vitest";
import { assertDistinctPrintableBatchTopics, buildPrintablePairBatches, buildPrintablePaperPatternInstruction, normalizePrintablePaperPayload } from "./printablePaper";

const shortGenerated = {
  estimatedDurationMinutes: 30,
  items: [{ question: "State the speed relationship.", expectedAnswer: "Speed is distance divided by time.", markingGuide: ["States the correct relationship."], difficulty: "easy", sourceReference: "Motion", learningObjective: "Relate speed, distance and time.", cognitiveLevel: "K", orGroup: 1, marks: 3 }],
};

const longGenerated = {
  estimatedDurationMinutes: 45,
  items: [{ question: "Explain a source-grounded concept.", expectedKeyPoints: ["First verified point.", "Second verified point."], markingRubric: [{ criterion: "Explains the first point.", marks: 3 }, { criterion: "Explains the second point.", marks: 3 }], difficulty: "medium", sourceReference: "Verified topic", learningObjective: "Explain the selected concept.", cognitiveLevel: "U", orGroup: 1, marks: 6 }],
};

describe("printable paper payload normalization", () => {
  it("uses paper-pattern records for wording and K/U/A guidance only, not answer evidence", () => {
    const instruction = buildPrintablePaperPatternInstruction({
      sourceType: "curriculum_scope",
      sourceTitle: "Computer Science Unit 3",
      paperPatternGuidance: [{ sourceKind: "past_paper", academicYear: "2025", mcqCount: 13, mcqMarksEach: 1, shortOrPairCount: 11, shortMarksEach: 2, longOrPairCount: 4, longMarksEach: 5, orRule: "OR verified" }],
    });
    expect(instruction).toContain("past paper 2025");
    expect(instruction).toContain("11 brief parts of 2 marks each");
    expect(instruction).toContain("OR alternatives are verified");
    expect(instruction).toContain("Do not copy paper questions or use them as answer evidence");
  });

  it("adds the required short-item type before contract validation", () => {
    const payload = normalizePrintablePaperPayload("short", "Motion short paper", shortGenerated);
    expect(payload.mode).toBe("short");
    expect(payload.items[0]?.kind).toBe("short");
  });

  it("adds the required long-item type before contract validation", () => {
    const payload = normalizePrintablePaperPayload("long", "Physics long paper", longGenerated);
    expect(payload.mode).toBe("long");
    expect(payload.items[0]?.kind).toBe("long");
  });

  it("splits a large paper into small complete OR-pair batches", () => {
    expect(buildPrintablePairBatches(10)).toEqual([2, 2, 2, 2, 2]);
    expect(buildPrintablePairBatches(5)).toEqual([2, 2, 1]);
  });

  it("rejects repeated printable-paper topics and mismatched OR-pair objectives before a draft can be returned", () => {
    const conversionPair = [
      { topicLabel: "octal conversion", learningObjective: "Convert an octal number to binary.", sourceReference: "Unit 1: Octal number system" },
      { topicLabel: "octal conversion", learningObjective: "Convert an octal number to binary.", sourceReference: "Unit 1: Octal number system" },
    ];
    const usedTopics = new Set<string>();
    expect(assertDistinctPrintableBatchTopics(conversionPair, usedTopics)).toEqual(new Set(["octal conversion"]));
    usedTopics.add("octal conversion");
    expect(() => assertDistinctPrintableBatchTopics(conversionPair, usedTopics)).toThrow(/repeated/i);
    expect(() => assertDistinctPrintableBatchTopics([
      { topicLabel: "system software", learningObjective: "Explain the role of system software.", sourceReference: "Unit 1: System software" },
      { topicLabel: "system software", learningObjective: "Describe device-driver communication.", sourceReference: "Unit 1: System software" },
    ], new Set())).toThrow(/matching learning objective/i);
  });
});

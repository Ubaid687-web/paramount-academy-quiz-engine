import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ invokeLLM: vi.fn() }));
vi.mock("./_core/llm", () => ({ invokeLLM: mocks.invokeLLM }));

import { buildPrintablePairBatches, buildPrintablePaperPatternInstruction, generatePrintablePaperFromContent, normalizePrintablePaperPayload } from "./printablePaper";

const shortGenerated = {
  estimatedDurationMinutes: 30,
  items: [{ question: "State the speed relationship.", expectedAnswer: "Speed is distance divided by time.", markingGuide: ["States the correct relationship."], difficulty: "easy", conceptKey: "speed distance time relationship", sourceReference: "Motion", learningObjective: "Relate speed, distance and time.", cognitiveLevel: "K", orGroup: 1, marks: 3 }],
};

const longGenerated = {
  estimatedDurationMinutes: 45,
  items: [{ question: "Explain a source-grounded concept.", expectedKeyPoints: ["First verified point.", "Second verified point."], markingRubric: [{ criterion: "Explains the first point.", marks: 3 }, { criterion: "Explains the second point.", marks: 3 }], difficulty: "medium", conceptKey: "selected verified concept", sourceReference: "Verified topic", learningObjective: "Explain the selected concept.", cognitiveLevel: "U", orGroup: 1, marks: 6 }],
};

describe("printable paper payload normalization", () => {
  beforeEach(() => mocks.invokeLLM.mockReset());
  it("uses paper-pattern records for wording and K/U/A guidance only, not answer evidence", () => {
    const instruction = buildPrintablePaperPatternInstruction({
      sourceType: "curriculum_scope",
      sourceTitle: "Computer Science Unit 3",
      paperPatternGuidance: [{ sourceKind: "past_paper", academicYear: "2025" }],
    });
    expect(instruction).toContain("past paper 2025");
    expect(instruction).toContain("K/U/A balance only");
    expect(instruction).toContain("use them as answer evidence");
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

  it("keeps one shared concept inside an OR pair while presenting two different assessment angles", async () => {
    const sameConceptPair = [
      { ...longGenerated.items[0], question: "Describe the Daniel cell.", conceptKey: "daniel cell", sourceReference: "Daniel cell", learningObjective: "Explain the Daniel cell." },
      { ...longGenerated.items[0], question: "Explain the working of a galvanic Daniel cell.", conceptKey: "daniel cell", sourceReference: "Daniel cell", learningObjective: "Explain the Daniel cell." },
    ];
    mocks.invokeLLM.mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ estimatedDurationMinutes: 20, items: sameConceptPair }) } }] });

    const paper = await generatePrintablePaperFromContent({
      paperType: "long",
      title: "Electrochemistry revision",
      contentText: "The source covers Daniel cells, hydrogen-oxygen fuel cells, electrolysis, and refining. ".repeat(5),
      pairCount: 1,
      difficulty: "balanced",
      sourceContext: { sourceType: "curriculum_scope", sourceTitle: "Electrochemistry" },
    });

    expect(paper.items).toHaveLength(2);
    expect(paper.items[0]?.orGroup).toBe(paper.items[1]?.orGroup);
  });

  it("rejects a second numbered pair that repeats the first pair's underlying concept", async () => {
    const repeatedPairItems = [
      { ...longGenerated.items[0], question: "Describe the Daniel cell.", conceptKey: "daniel cell", sourceReference: "Daniel cell", learningObjective: "Explain the Daniel cell." },
      { ...longGenerated.items[0], question: "Explain the working of a Daniel cell.", conceptKey: "daniel cell", sourceReference: "Daniel cell", learningObjective: "Explain the Daniel cell." },
      { ...longGenerated.items[0], question: "State the purpose of a Daniel cell.", conceptKey: "daniel cell", sourceReference: "Daniel cell", learningObjective: "Explain the Daniel cell." },
      { ...longGenerated.items[0], question: "Compare a Daniel cell with another cell.", conceptKey: "daniel cell", sourceReference: "Daniel cell", learningObjective: "Explain the Daniel cell." },
    ];
    mocks.invokeLLM.mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ estimatedDurationMinutes: 20, items: repeatedPairItems }) } }] });

    await expect(generatePrintablePaperFromContent({
      paperType: "long",
      title: "Electrochemistry revision",
      contentText: "The source covers Daniel cells, hydrogen-oxygen fuel cells, electrolysis, and refining. ".repeat(5),
      pairCount: 2,
      difficulty: "balanced",
      sourceContext: { sourceType: "curriculum_scope", sourceTitle: "Electrochemistry" },
    })).rejects.toThrow(/does not provide 2 distinct examinable concepts/i);
  });

  it("rejects an OR pair when both alternatives are the same question", async () => {
    const duplicatePromptPair = [
      { ...longGenerated.items[0], question: "Explain the Daniel cell.", conceptKey: "daniel cell", sourceReference: "Daniel cell", learningObjective: "Explain the Daniel cell." },
      { ...longGenerated.items[0], question: "Explain the Daniel cell.", conceptKey: "daniel cell", sourceReference: "Daniel cell", learningObjective: "Explain the Daniel cell." },
    ];
    mocks.invokeLLM.mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ estimatedDurationMinutes: 20, items: duplicatePromptPair }) } }] });

    await expect(generatePrintablePaperFromContent({
      paperType: "long",
      title: "Electrochemistry revision",
      contentText: "The source covers Daniel cells, hydrogen-oxygen fuel cells, electrolysis, and refining. ".repeat(5),
      pairCount: 1,
      difficulty: "balanced",
      sourceContext: { sourceType: "curriculum_scope", sourceTitle: "Electrochemistry" },
    })).rejects.toThrow(/does not provide 1 distinct examinable concepts/i);
  });
});

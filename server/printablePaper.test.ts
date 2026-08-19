import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ invokeGenerationProvider: vi.fn() }));
vi.mock("./generationProvider", () => ({ invokeGenerationProvider: mocks.invokeGenerationProvider }));

import { buildPrintablePairBatches, buildPrintablePaperPatternInstruction, buildPrintableUpstreamFailure, generatePrintablePaperFromContent, normalizePrintablePaperPayload } from "./printablePaper";

const shortGenerated = {
  estimatedDurationMinutes: 30,
  items: [{ question: "State the speed relationship.", expectedAnswer: "Speed is distance divided by time.", markingGuide: ["States the correct relationship."], difficulty: "easy", conceptKey: "speed distance time relationship", facetKey: "formula", answerTarget: "speed equals distance divided by time", sourceReference: "Motion", learningObjective: "Relate speed, distance and time.", cognitiveLevel: "K", orGroup: 1, marks: 3 }],
};

const longGenerated = {
  estimatedDurationMinutes: 45,
  items: [{ question: "Explain a source-grounded concept.", expectedKeyPoints: ["First verified point.", "Second verified point."], markingRubric: [{ criterion: "Explains the first point.", marks: 3 }, { criterion: "Explains the second point.", marks: 3 }], difficulty: "medium", conceptKey: "selected verified concept", facetKey: "explanation", answerTarget: "selected concept explanation", sourceReference: "Verified topic", learningObjective: "Explain the selected concept.", cognitiveLevel: "U", orGroup: 1, marks: 6 }],
};

describe("printable paper payload normalization", () => {
  beforeEach(() => mocks.invokeGenerationProvider.mockReset());
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

  it("classifies an upstream quota or billing failure without blaming the selected source", () => {
    const failure = buildPrintableUpstreamFailure(new Error('LLM invoke failed: 412 Precondition Failed – {"code":9,"message":"your account has hit a usage exhausted"}'));
    expect(failure?.message).toMatch(/usage quota limit or billing pause/i);
    expect(failure?.message).not.toMatch(/source|narrower scope/i);
  });

  it("keeps one shared concept inside an OR pair while presenting two different assessment angles", async () => {
    const sameConceptPair = [
      { ...longGenerated.items[0], question: "Describe the construction of a Daniel cell.", conceptKey: "daniel cell", facetKey: "construction", answerTarget: "zinc and copper electrodes in electrolyte solutions", sourceReference: "Daniel cell", learningObjective: "Describe the construction of a Daniel cell." },
      { ...longGenerated.items[0], question: "Explain the working of a galvanic Daniel cell.", conceptKey: "daniel cell", facetKey: "working", answerTarget: "electron flow from zinc to copper", sourceReference: "Daniel cell", learningObjective: "Explain the working of a Daniel cell." },
    ];
    mocks.invokeGenerationProvider.mockResolvedValue({ response: { choices: [{ message: { content: JSON.stringify({ estimatedDurationMinutes: 20, items: sameConceptPair }) } }] }, telemetry: { provider: "managed_llm", fallbackUsed: false, primaryFailureType: null, managedRetryAttempts: 0, geminiRetryAttempts: 0 } });

    const paper = await generatePrintablePaperFromContent({
      paperType: "long",
      title: "Electrochemistry revision",
      contentText: "The source covers Daniel cells, hydrogen-oxygen fuel cells, electrolysis, and refining. ".repeat(5),
      pairCount: 1,
      difficulty: "balanced",
      sourceContext: { sourceType: "curriculum_scope", sourceTitle: "Electrochemistry" },
    });

    expect(paper.payload.items).toHaveLength(2);
    expect(paper.payload.items[0]?.orGroup).toBe(paper.payload.items[1]?.orGroup);
  });

  it("allows multiple source-supported facets of the same concept across numbered pairs", async () => {
    const distinctDanielCellFacets = [
      { ...longGenerated.items[0], question: "Describe the construction of a Daniel cell.", conceptKey: "daniel cell", facetKey: "construction", answerTarget: "zinc and copper electrodes in electrolyte solutions", sourceReference: "Daniel cell", learningObjective: "Describe Daniel cell construction." },
      { ...longGenerated.items[0], question: "Explain the working of a Daniel cell.", conceptKey: "daniel cell", facetKey: "working", answerTarget: "electron flow from zinc to copper", sourceReference: "Daniel cell", learningObjective: "Explain Daniel cell working." },
      { ...longGenerated.items[0], question: "State the function of the salt bridge in a Daniel cell.", conceptKey: "daniel cell", facetKey: "salt bridge function", answerTarget: "maintains electrical neutrality", sourceReference: "Daniel cell", learningObjective: "State the salt bridge function." },
      { ...longGenerated.items[0], question: "State the role of zinc in a Daniel cell.", conceptKey: "daniel cell", facetKey: "electrode role", answerTarget: "zinc acts as an anode", sourceReference: "Daniel cell", learningObjective: "State the anode role." },
    ];
    mocks.invokeGenerationProvider.mockResolvedValue({ response: { choices: [{ message: { content: JSON.stringify({ estimatedDurationMinutes: 20, items: distinctDanielCellFacets }) } }] }, telemetry: { provider: "managed_llm", fallbackUsed: false, primaryFailureType: null, managedRetryAttempts: 0, geminiRetryAttempts: 0 } });

    const paper = await generatePrintablePaperFromContent({
      paperType: "long",
      title: "Electrochemistry revision",
      contentText: "The source covers Daniel cells, hydrogen-oxygen fuel cells, electrolysis, and refining. ".repeat(5),
      pairCount: 2,
      difficulty: "balanced",
      sourceContext: { sourceType: "curriculum_scope", sourceTitle: "Electrochemistry" },
    });

    expect(paper.payload.items).toHaveLength(4);
  });

  it("rejects a second numbered pair that repeats an earlier facet and answer target", async () => {
    const repeatedPairItems = [
      { ...longGenerated.items[0], question: "Describe the construction of a Daniel cell.", conceptKey: "daniel cell", facetKey: "construction", answerTarget: "zinc and copper electrodes in electrolyte solutions", sourceReference: "Daniel cell", learningObjective: "Describe construction." },
      { ...longGenerated.items[0], question: "Explain the working of a Daniel cell.", conceptKey: "daniel cell", facetKey: "working", answerTarget: "electron flow from zinc to copper", sourceReference: "Daniel cell", learningObjective: "Explain working." },
      { ...longGenerated.items[0], question: "How is a Daniel cell constructed?", conceptKey: "daniel cell", facetKey: "construction", answerTarget: "zinc and copper electrodes in electrolyte solutions", sourceReference: "Daniel cell", learningObjective: "Describe construction." },
      { ...longGenerated.items[0], question: "State the function of the salt bridge in a Daniel cell.", conceptKey: "daniel cell", facetKey: "salt bridge function", answerTarget: "maintains electrical neutrality", sourceReference: "Daniel cell", learningObjective: "State salt bridge function." },
    ];
    mocks.invokeGenerationProvider.mockResolvedValue({ response: { choices: [{ message: { content: JSON.stringify({ estimatedDurationMinutes: 20, items: repeatedPairItems }) } }] }, telemetry: { provider: "managed_llm", fallbackUsed: false, primaryFailureType: null, managedRetryAttempts: 0, geminiRetryAttempts: 0 } });

    await expect(generatePrintablePaperFromContent({
      paperType: "long",
      title: "Electrochemistry revision",
      contentText: "The source covers Daniel cells, hydrogen-oxygen fuel cells, electrolysis, and refining. ".repeat(5),
      pairCount: 2,
      difficulty: "balanced",
      sourceContext: { sourceType: "curriculum_scope", sourceTitle: "Electrochemistry" },
    })).rejects.toThrow(/does not provide 2 distinct source-supported question targets/i);
  });

  it("rejects an OR pair when both alternatives are the same question", async () => {
    const duplicatePromptPair = [
      { ...longGenerated.items[0], question: "Explain the Daniel cell.", conceptKey: "daniel cell", facetKey: "working", answerTarget: "electron flow from zinc to copper", sourceReference: "Daniel cell", learningObjective: "Explain the Daniel cell." },
      { ...longGenerated.items[0], question: "Explain the Daniel cell.", conceptKey: "daniel cell", facetKey: "working", answerTarget: "electron flow from zinc to copper", sourceReference: "Daniel cell", learningObjective: "Explain the Daniel cell." },
    ];
    mocks.invokeGenerationProvider.mockResolvedValue({ response: { choices: [{ message: { content: JSON.stringify({ estimatedDurationMinutes: 20, items: duplicatePromptPair }) } }] }, telemetry: { provider: "managed_llm", fallbackUsed: false, primaryFailureType: null, managedRetryAttempts: 0, geminiRetryAttempts: 0 } });

    await expect(generatePrintablePaperFromContent({
      paperType: "long",
      title: "Electrochemistry revision",
      contentText: "The source covers Daniel cells, hydrogen-oxygen fuel cells, electrolysis, and refining. ".repeat(5),
      pairCount: 1,
      difficulty: "balanced",
      sourceContext: { sourceType: "curriculum_scope", sourceTitle: "Electrochemistry" },
    })).rejects.toThrow(/does not provide 1 distinct source-supported question targets/i);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ invokeGenerationProvider: vi.fn(), getProviderFailureEvidence: vi.fn() }));
vi.mock("./generationProvider", () => ({ invokeGenerationProvider: mocks.invokeGenerationProvider, getProviderFailureEvidence: mocks.getProviderFailureEvidence }));

import { buildPrintablePairBatches, buildPrintablePaperPatternInstruction, buildPrintableUpstreamFailure, generatePrintablePaperBatch, generatePrintablePaperFromContent, normalizePrintablePaperPayload } from "./printablePaper";

const shortGenerated = {
  estimatedDurationMinutes: 30,
  items: [{ question: "State the speed relationship.", expectedAnswer: "Speed is distance divided by time.", markingGuide: ["States the correct relationship."], solutionPoints: ["Speed is distance travelled per unit time."], difficulty: "easy", conceptKey: "speed distance time relationship", facetKey: "formula", answerTarget: "speed equals distance divided by time", sourceReference: "Motion", sourceExcerpt: "Speed is the distance travelled per unit time.", learningObjective: "Relate speed, distance and time.", cognitiveLevel: "K", orGroup: 1, marks: 3 }],
};

const longGenerated = {
  estimatedDurationMinutes: 45,
  items: [{ question: "Explain a source-grounded concept.", expectedKeyPoints: ["First verified point.", "Second verified point."], markingRubric: [{ criterion: "Explains the first point.", marks: 3 }, { criterion: "Explains the second point.", marks: 3 }], solutionPoints: ["First verified point.", "Second verified point."], difficulty: "medium", conceptKey: "selected verified concept", facetKey: "explanation", answerTarget: "selected concept explanation", sourceReference: "Verified topic", sourceExcerpt: "The source covers Daniel cells, hydrogen-oxygen fuel cells, electrolysis, and refining.", learningObjective: "Explain the selected concept.", cognitiveLevel: "U", orGroup: 1, marks: 6 }],
};

describe("printable paper payload normalization", () => {
  beforeEach(() => {
    mocks.invokeGenerationProvider.mockReset();
    mocks.getProviderFailureEvidence.mockReset().mockReturnValue(null);
  });
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

  it("splits a large paper into bounded OR-pair batches that reduce provider calls", () => {
    expect(buildPrintablePairBatches(10)).toEqual([4, 4, 2]);
    expect(buildPrintablePairBatches(5)).toEqual([4, 1]);
    expect(buildPrintablePairBatches(9).every((batch) => batch <= 4)).toBe(true);
  });

  it("classifies an upstream quota or billing failure without blaming the selected source", () => {
    const failure = buildPrintableUpstreamFailure(new Error('LLM invoke failed: 412 Precondition Failed – {"code":9,"message":"your account has hit a usage exhausted"}'));
    expect(failure?.message).toMatch(/usage quota limit or billing pause/i);
    expect(failure?.message).not.toMatch(/source|narrower scope/i);
  });

  it("keeps a Gemini 429 resource-exhaustion response distinct from a long quota pause", () => {
    const failure = buildPrintableUpstreamFailure(new Error("Gemini fallback invoke failed: 429 Too Many Requests – RESOURCE_EXHAUSTED quota temporarily exceeded"));
    expect(failure?.message).toMatch(/temporarily rate-limited/i);
    expect(failure?.message).not.toMatch(/billing pause/i);
  });

  it("preserves a short provider rate-limit circuit as a temporary service state instead of blaming the approved source", () => {
    mocks.getProviderFailureEvidence.mockReturnValue({ provider: "gemini_byok", classification: "transient_rate_limit", httpStatus: 429, retryAttempts: 1, circuitOpen: false, retryAfterSeconds: 39, primaryFailureType: "quota_exhaustion" });
    const failure = buildPrintableUpstreamFailure(new Error("Generation is temporarily paused because the AI service is rate-limited. No new model call was made. Try again after 2026-08-19T17:45:00.000Z."));

    expect(failure?.message).toMatch(/temporarily rate-limited/i);
    expect(failure?.message).toMatch(/no new model call was made/i);
    expect(failure?.message).not.toMatch(/approved material|narrower scope/i);
    expect((failure as Error & { providerFailure?: { provider?: string; httpStatus?: number | null } }).providerFailure).toMatchObject({ provider: "gemini_byok", httpStatus: 429 });
  });

  it("passes the shared style anchor into printable generation before provider routing", async () => {
    const pair = [
      { ...shortGenerated.items[0], question: "State the speed relationship.", conceptKey: "speed", facetKey: "formula", answerTarget: "speed equals distance divided by time" },
      { ...shortGenerated.items[0], question: "State the SI unit of speed.", conceptKey: "speed", facetKey: "unit", answerTarget: "metre per second" },
    ];
    mocks.invokeGenerationProvider.mockResolvedValue({ response: { choices: [{ message: { content: JSON.stringify({ estimatedDurationMinutes: 10, items: pair }) } }] }, telemetry: { provider: "managed_llm", fallbackUsed: false, primaryFailureType: null, managedRetryAttempts: 0, geminiRetryAttempts: 0 } });

    await generatePrintablePaperFromContent({
      paperType: "short",
      title: "Motion short paper",
      contentText: "Speed is the distance travelled per unit time. The SI unit of speed is metre per second.".repeat(4),
      pairCount: 1,
      difficulty: "balanced",
      sourceContext: { sourceType: "curriculum_scope", sourceTitle: "Motion", styleAnchor: { fingerprint: "style-v1", approvedExampleCount: 0, instruction: "\n\nSHARED FBISE STYLE ANCHOR — FORMAT ONLY\nUse concise approved wording." } },
    });

    expect(mocks.invokeGenerationProvider.mock.calls[0]?.[0].messages[0].content).toContain("SHARED FBISE STYLE ANCHOR");
  });

  it("uses labelled textbook excerpts and explicitly forbids internal source language in student-facing prompts", async () => {
    const pair = [
      { ...shortGenerated.items[0], question: "State the speed relationship.", conceptKey: "speed", facetKey: "formula", answerTarget: "speed equals distance divided by time" },
      { ...shortGenerated.items[0], question: "State the SI unit of speed.", conceptKey: "speed", facetKey: "unit", answerTarget: "metre per second", sourceExcerpt: "The SI unit of speed is metre per second.", solutionPoints: ["The SI unit of speed is metre per second."] },
    ];
    const contentText = "Speed is the distance travelled per unit time. The SI unit of speed is metre per second.".repeat(12);
    mocks.invokeGenerationProvider.mockResolvedValue({ response: { choices: [{ message: { content: JSON.stringify({ estimatedDurationMinutes: 10, items: pair }) } }] }, telemetry: { provider: "managed_llm", fallbackUsed: false, primaryFailureType: null, managedRetryAttempts: 0, geminiRetryAttempts: 0 } });

    await generatePrintablePaperBatch({ paperType: "short", title: "Motion short paper", contentText, pairCount: 1, difficulty: "balanced", sourceContext: { sourceType: "curriculum_scope", sourceTitle: "Motion" } });

    const systemPrompt = mocks.invokeGenerationProvider.mock.calls[0]?.[0].messages[0].content ?? "";
    const sourcePrompt = mocks.invokeGenerationProvider.mock.calls[0]?.[0].messages[1].content ?? "";
    expect(sourcePrompt).toContain("TEXTBOOK EXCERPT:");
    expect(systemPrompt).toContain("Never write “source text”");
    expect(sourcePrompt).not.toContain("SOURCE SECTION");
  });

  it("rejects internal source wording instead of saving a linguistically generic printable question", async () => {
    const invalidPair = [
      { ...shortGenerated.items[0], question: "State the definition in the source text.", conceptKey: "speed", facetKey: "definition", answerTarget: "speed definition" },
      { ...shortGenerated.items[0], question: "State the SI unit of speed.", conceptKey: "speed", facetKey: "unit", answerTarget: "metre per second", sourceExcerpt: "The SI unit of speed is metre per second.", solutionPoints: ["The SI unit of speed is metre per second."] },
    ];
    const contentText = "Speed is the distance travelled per unit time. The SI unit of speed is metre per second.".repeat(12);
    mocks.invokeGenerationProvider.mockResolvedValue({ response: { choices: [{ message: { content: JSON.stringify({ estimatedDurationMinutes: 10, items: invalidPair }) } }] }, telemetry: { provider: "managed_llm", fallbackUsed: false, primaryFailureType: null, managedRetryAttempts: 0, geminiRetryAttempts: 0 } });

    await expect(generatePrintablePaperBatch({ paperType: "short", title: "Motion short paper", contentText, pairCount: 1, difficulty: "balanced", sourceContext: { sourceType: "curriculum_scope", sourceTitle: "Motion" } })).rejects.toThrow(/internal source wording/i);
  });

  it("rejects a narrative printable stem even when it is otherwise supported by the textbook excerpt", async () => {
    const narrativePair = [
      { ...shortGenerated.items[0], question: "During a student activity, speed is discussed with distance and time. What is the relationship?", conceptKey: "speed", facetKey: "formula", answerTarget: "speed equals distance divided by time" },
      { ...shortGenerated.items[0], question: "State the SI unit of speed.", conceptKey: "speed", facetKey: "unit", answerTarget: "metre per second", sourceExcerpt: "The SI unit of speed is metre per second.", solutionPoints: ["The SI unit of speed is metre per second."] },
    ];
    const contentText = "Speed is the distance travelled per unit time. The SI unit of speed is metre per second.".repeat(12);
    mocks.invokeGenerationProvider.mockResolvedValue({ response: { choices: [{ message: { content: JSON.stringify({ estimatedDurationMinutes: 10, items: narrativePair }) } }] }, telemetry: { provider: "managed_llm", fallbackUsed: false, primaryFailureType: null, managedRetryAttempts: 0, geminiRetryAttempts: 0 } });

    await expect(generatePrintablePaperBatch({ paperType: "short", title: "Motion short paper", contentText, pairCount: 1, difficulty: "balanced", sourceContext: { sourceType: "curriculum_scope", sourceTitle: "Motion" } })).rejects.toThrow(/narrative prompt/i);
  });

  it("sends persisted verified prompts to a later batch so their concept facets cannot be regenerated", async () => {
    const pair = [
      { ...shortGenerated.items[0], question: "State the SI unit of speed.", conceptKey: "speed", facetKey: "unit", answerTarget: "metre per second" },
      { ...shortGenerated.items[0], question: "State the SI unit of velocity.", conceptKey: "velocity", facetKey: "unit", answerTarget: "metre per second" },
    ];
    mocks.invokeGenerationProvider.mockResolvedValue({ response: { choices: [{ message: { content: JSON.stringify({ estimatedDurationMinutes: 10, items: pair }) } }] }, telemetry: { provider: "managed_llm", fallbackUsed: false, primaryFailureType: null, managedRetryAttempts: 0, geminiRetryAttempts: 0 } });

    await generatePrintablePaperBatch({
      paperType: "short",
      title: "Motion short paper",
      contentText: "Speed is the distance travelled per unit time. The SI unit of speed is metre per second. Velocity is displacement per unit time.".repeat(4),
      pairCount: 1,
      difficulty: "balanced",
      sourceContext: { sourceType: "curriculum_scope", sourceTitle: "Motion" },
      existingItems: [{ ...shortGenerated.items[0], kind: "short", conceptKey: "speed", facetKey: "formula", answerTarget: "speed equals distance divided by time", orGroup: 1 }],
      batchIndex: 1,
      totalBatches: 2,
    });

    expect(mocks.invokeGenerationProvider).toHaveBeenCalledWith(expect.objectContaining({
      messages: expect.arrayContaining([expect.objectContaining({ content: expect.stringContaining("speed") })]),
    }));
  });

  it("aggregates provider-reported usage across printable batches without fabricating absent metrics", async () => {
    const topics = ["velocity", "acceleration", "momentum", "force", "work", "power", "energy", "pressure", "density", "impulse"];
    const makeItem = (index: number) => ({ ...shortGenerated.items[0], question: `State the verified relationship for ${topics[index - 1]}.`, conceptKey: topics[index - 1], facetKey: "definition", answerTarget: `${topics[index - 1]} verified outcome`, sourceReference: `Verified ${topics[index - 1]} topic`, sourceExcerpt: `${topics[index - 1][0]!.toUpperCase()}${topics[index - 1].slice(1)} Relationship explains`, solutionPoints: [`${topics[index - 1]} verified outcome.`], learningObjective: `State the verified relationship for ${topics[index - 1]}.` });
    const firstBatch = Array.from({ length: 8 }, (_, index) => makeItem(index + 1));
    const secondBatch = Array.from({ length: 2 }, (_, index) => makeItem(index + 9));
    mocks.invokeGenerationProvider
      .mockResolvedValueOnce({ response: { choices: [{ message: { content: JSON.stringify({ estimatedDurationMinutes: 30, items: firstBatch }) } }] }, telemetry: { provider: "managed_llm", fallbackUsed: false, primaryFailureType: null, managedRetryAttempts: 0, geminiRetryAttempts: 0, usage: { inputTokens: 100, outputTokens: 40, cachedTokens: null, totalTokens: 140 } } })
      .mockResolvedValueOnce({ response: { choices: [{ message: { content: JSON.stringify({ estimatedDurationMinutes: 10, items: secondBatch }) } }] }, telemetry: { provider: "managed_llm", fallbackUsed: false, primaryFailureType: null, managedRetryAttempts: 0, geminiRetryAttempts: 0, usage: { inputTokens: 120, outputTokens: 50, cachedTokens: 30, totalTokens: 170 } } });

    const paper = await generatePrintablePaperFromContent({
      paperType: "short",
      title: "Motion short paper",
      contentText: ["Velocity Relationship explains displacement per unit time.", "Acceleration Relationship explains change in velocity per unit time.", "Momentum Relationship explains mass multiplied by velocity.", "Force Relationship explains mass multiplied by acceleration.", "Work Relationship explains force multiplied by displacement.", "Power Relationship explains work per unit time.", "Energy Relationship explains the capacity to perform work.", "Pressure Relationship explains force per unit area.", "Density Relationship explains mass per unit volume.", "Impulse Relationship explains force multiplied by time."].join("\n\n").repeat(6),
      pairCount: 5,
      difficulty: "balanced",
      sourceContext: { sourceType: "curriculum_scope", sourceTitle: "Motion" },
    });

    expect(paper.providerTelemetry.usage).toEqual({ inputTokens: 220, outputTokens: 90, cachedTokens: 30, totalTokens: 310 });
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

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({
  getActiveCurriculumScopeCatalog: vi.fn(),
  listActiveAssessmentPatternSources: vi.fn(),
  listReviewedAssessmentPatternGuidance: vi.fn(),
  listApprovedStyleAnchorExamples: vi.fn(),
  listPriorGeneratedQuestionHistory: vi.fn(),
  createAssessmentDraft: vi.fn(),
  generatePrintablePaperFromContent: vi.fn(),
  generatePrintablePaperBatch: vi.fn(),
  getCachedGenerationResponse: vi.fn(),
  getOpenGenerationCircuit: vi.fn(),
  openGenerationCircuit: vi.fn(),
  closeGenerationCircuit: vi.fn(),
  putCachedGenerationResponse: vi.fn(),
  createGenerationJob: vi.fn(),
  getGenerationJob: vi.fn(),
  updateGenerationJob: vi.fn(),
}));

vi.mock("./db", () => ({
  getActiveCurriculumScopeCatalog: mocks.getActiveCurriculumScopeCatalog,
  listActiveAssessmentPatternSources: mocks.listActiveAssessmentPatternSources,
  listReviewedAssessmentPatternGuidance: mocks.listReviewedAssessmentPatternGuidance,
  listApprovedStyleAnchorExamples: mocks.listApprovedStyleAnchorExamples,
  listPriorGeneratedQuestionHistory: mocks.listPriorGeneratedQuestionHistory,
  createAssessmentDraft: mocks.createAssessmentDraft,
  getCachedGenerationResponse: mocks.getCachedGenerationResponse,
  getOpenGenerationCircuit: mocks.getOpenGenerationCircuit,
  openGenerationCircuit: mocks.openGenerationCircuit,
  closeGenerationCircuit: mocks.closeGenerationCircuit,
  putCachedGenerationResponse: mocks.putCachedGenerationResponse,
  createGenerationJob: mocks.createGenerationJob,
  getGenerationJob: mocks.getGenerationJob,
  updateGenerationJob: mocks.updateGenerationJob,
}));
vi.mock("./printablePaper", () => ({
  buildPrintablePairBatches: (pairCount: number) => {
    const batches: number[] = [];
    for (let remaining = pairCount; remaining > 0; remaining -= 4) batches.push(Math.min(4, remaining));
    return batches;
  },
  generatePrintablePaperFromContent: mocks.generatePrintablePaperFromContent,
  generatePrintablePaperBatch: mocks.generatePrintablePaperBatch,
}));

import { appRouter } from "./routers";

function createAdminContext(): TrpcContext {
  return {
    user: { id: 7, openId: "admin-printable-history", email: "admin@example.com", name: "Admin", loginMethod: "manus", role: "admin", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function shortItem(conceptKey: string, facetKey: string, answerTarget: string, orGroup: number) {
  return {
    kind: "short" as const,
    question: `State the ${conceptKey} ${facetKey}.`,
    sourceReference: `Motion — ${conceptKey}`,
    learningObjective: `Explain ${conceptKey}.`,
    conceptKey,
    facetKey,
    answerTarget,
    cognitiveLevel: "U" as const,
    orGroup,
    marks: 3,
    difficulty: "medium" as const,
    expectedAnswer: answerTarget,
    markingGuide: [answerTarget],
  };
}

describe("printable paper history persistence", () => {
  beforeEach(() => {
    mocks.getCachedGenerationResponse.mockReset();
    mocks.getOpenGenerationCircuit.mockReset();
    mocks.openGenerationCircuit.mockReset();
    mocks.closeGenerationCircuit.mockReset();
    mocks.putCachedGenerationResponse.mockReset();
    mocks.createGenerationJob.mockReset();
    mocks.getGenerationJob.mockReset();
    mocks.updateGenerationJob.mockReset();
    mocks.generatePrintablePaperBatch.mockReset();
    mocks.getCachedGenerationResponse.mockResolvedValue(undefined);
    mocks.getOpenGenerationCircuit.mockResolvedValue(undefined);
    mocks.openGenerationCircuit.mockResolvedValue(undefined);
    mocks.closeGenerationCircuit.mockResolvedValue(undefined);
    mocks.putCachedGenerationResponse.mockResolvedValue(undefined);
    mocks.createGenerationJob.mockResolvedValue({ id: 700 });
    mocks.getGenerationJob.mockResolvedValue(undefined);
    mocks.updateGenerationJob.mockResolvedValue(undefined);
  });
  it("stores an approved-scope generated paper with its concept keys for future exclusion", async () => {
    mocks.getActiveCurriculumScopeCatalog.mockResolvedValue({
      curriculumSet: { id: 77, grade: "10", subject: "physics", label: "FBISE Grade 10 Physics", editionLabel: "2026" },
      chapters: [{ id: 10, curriculumSetId: 77, sequence: 1, code: "Ch. 10", title: "Kinematics", blockKey: null, partKey: null, startPage: 1, endPage: 20, contentText: "Kinematics explains displacement, velocity, acceleration, and their relationships. ".repeat(4), isActive: 1 }],
      segments: [], templates: [], templateMemberships: [],
    });
    mocks.listActiveAssessmentPatternSources.mockResolvedValue([{ sourceKind: "past_paper", academicYear: "2025" }]);
    mocks.listReviewedAssessmentPatternGuidance.mockResolvedValue([]);
    mocks.listApprovedStyleAnchorExamples.mockResolvedValue([]);
    mocks.listPriorGeneratedQuestionHistory.mockResolvedValue([{ conceptKey: "velocity", question: "Define velocity." }]);
    mocks.generatePrintablePaperFromContent.mockResolvedValue({
      payload: { mode: "long", title: "Kinematics revision", estimatedDurationMinutes: 10,
        items: [
        { kind: "long", question: "Explain displacement.", conceptKey: "displacement", sourceReference: "Kinematics — displacement", learningObjective: "Explain displacement.", cognitiveLevel: "U", orGroup: 1, marks: 5, difficulty: "medium", expectedKeyPoints: ["A verified point."], markingRubric: [{ criterion: "Explains displacement.", marks: 5 }] },
        { kind: "long", question: "Explain acceleration.", conceptKey: "acceleration", sourceReference: "Kinematics — acceleration", learningObjective: "Explain acceleration.", cognitiveLevel: "U", orGroup: 1, marks: 5, difficulty: "medium", expectedKeyPoints: ["A verified point."], markingRubric: [{ criterion: "Explains acceleration.", marks: 5 }] },
        ], },
      providerTelemetry: { provider: "gemini_byok", fallbackUsed: true, primaryFailureType: "quota_exhaustion", managedRetryAttempts: 0, geminiRetryAttempts: 1, usage: { inputTokens: 750, outputTokens: 280, cachedTokens: 120, totalTokens: 1_030 } },
    });
    mocks.createAssessmentDraft.mockResolvedValue({ id: 901 });

    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.aiAgent.generatePrintablePaper({
      paperType: "long", title: "Kinematics revision", pairCount: 12, difficulty: "balanced",
      scope: { grade: "10", subject: "physics", scopeType: "single_chapter", chapterIds: [10] },
    });

    expect(result.assessmentDraftId).toBe(901);
    expect(mocks.generatePrintablePaperFromContent).toHaveBeenCalledWith(expect.objectContaining({
      pairCount: 12,
      sourceContext: expect.objectContaining({ priorQuestionHistory: [expect.objectContaining({ conceptKey: "velocity" })] }),
    }));
    expect(mocks.createAssessmentDraft).toHaveBeenCalledWith(expect.objectContaining({
      curriculumSetId: 77,
      totalMarks: 5,
      draftPayload: expect.stringContaining("acceleration"),
    }));
    expect(mocks.updateGenerationJob).toHaveBeenCalledWith(700, expect.objectContaining({ generationProvider: "gemini_byok", fallbackUsed: 1, primaryFailureType: "quota_exhaustion", providerInputTokens: 750, providerOutputTokens: 280, providerCachedTokens: 120, providerTotalTokens: 1_030 }));
  });

  it("records private provider failure evidence when a printable request is rate-limited", async () => {
    mocks.getActiveCurriculumScopeCatalog.mockResolvedValue({
      curriculumSet: { id: 77, grade: "10", subject: "physics", label: "FBISE Grade 10 Physics", editionLabel: "2026" },
      chapters: [{ id: 10, curriculumSetId: 77, sequence: 1, code: "Ch. 10", title: "Kinematics", blockKey: null, partKey: null, startPage: 1, endPage: 20, contentText: "Kinematics explains displacement, velocity, acceleration, and their relationships. ".repeat(4), isActive: 1 }],
      segments: [], templates: [], templateMemberships: [],
    });
    mocks.listActiveAssessmentPatternSources.mockResolvedValue([]);
    mocks.listReviewedAssessmentPatternGuidance.mockResolvedValue([]);
    mocks.listApprovedStyleAnchorExamples.mockResolvedValue([]);
    mocks.listPriorGeneratedQuestionHistory.mockResolvedValue([]);
    mocks.generatePrintablePaperFromContent.mockRejectedValue(new Error("Gemini fallback invoke failed: 429 Too Many Requests – RESOURCE_EXHAUSTED. Please retry in 39 seconds."));

    const caller = appRouter.createCaller(createAdminContext());

    await expect(caller.aiAgent.generatePrintablePaper({
      paperType: "short", title: "Kinematics revision", pairCount: 2, difficulty: "balanced",
      scope: { grade: "10", subject: "physics", scopeType: "single_chapter", chapterIds: [10] },
    })).rejects.toThrow("429");

    expect(mocks.updateGenerationJob).toHaveBeenCalledWith(700, expect.objectContaining({
      status: "failed",
      generationProvider: "gemini_byok",
      fallbackUsed: 1,
      providerFailure: expect.stringContaining('"httpStatus":429'),
    }));
  });

  it("persists each verified batch, passes accepted prompts into the next batch, and returns a paper only after the final batch", async () => {
    let printableState = "";
    mocks.createGenerationJob.mockImplementation(async (record) => {
      printableState = record.printableState;
      return { id: 700 };
    });
    mocks.getGenerationJob.mockImplementation(async () => ({
      id: 700,
      userId: 7,
      generationMode: "short",
      printableState,
      contentText: "Motion describes speed, velocity, acceleration, momentum, force, work, power, and energy. ".repeat(4),
      requestFingerprint: "progressive-printable-fingerprint",
    }));
    mocks.updateGenerationJob.mockImplementation(async (_jobId, updates) => {
      if (updates.printableState) printableState = updates.printableState;
    });
    mocks.listActiveAssessmentPatternSources.mockResolvedValue([]);
    mocks.listReviewedAssessmentPatternGuidance.mockResolvedValue([]);
    mocks.listApprovedStyleAnchorExamples.mockResolvedValue([]);
    mocks.listPriorGeneratedQuestionHistory.mockResolvedValue([]);
    mocks.generatePrintablePaperBatch
      .mockResolvedValueOnce({
        items: [
          shortItem("speed", "definition", "speed is distance per unit time", 1),
          shortItem("velocity", "definition", "velocity is displacement per unit time", 1),
          shortItem("acceleration", "definition", "acceleration is change in velocity per unit time", 2),
          shortItem("momentum", "formula", "momentum equals mass multiplied by velocity", 2),
          shortItem("work", "formula", "work equals force multiplied by displacement", 3),
          shortItem("energy", "definition", "energy is the capacity to do work", 3),
          shortItem("density", "formula", "density equals mass per unit volume", 4),
          shortItem("pressure", "formula", "pressure equals force per unit area", 4),
        ],
        providerTelemetry: { provider: "gemini_byok", fallbackUsed: true, primaryFailureType: "quota_exhaustion", managedRetryAttempts: 0, geminiRetryAttempts: 1 },
      })
      .mockResolvedValueOnce({
        items: [
          shortItem("force", "formula", "force equals mass multiplied by acceleration", 1),
          shortItem("power", "formula", "power equals work per unit time", 1),
        ],
        providerTelemetry: { provider: "gemini_byok", fallbackUsed: true, primaryFailureType: "quota_exhaustion", managedRetryAttempts: 0, geminiRetryAttempts: 0 },
      })
      ;

    const caller = appRouter.createCaller(createAdminContext());
    const start = await caller.aiAgent.startPrintableGeneration({
      paperType: "short",
      title: "Motion revision",
      pairCount: 5,
      difficulty: "balanced",
      contentText: "Motion describes speed, velocity, acceleration, momentum, force, work, power, and energy. ".repeat(4),
      patternProgramme: { board: "FBISE", grade: "10", subject: "physics" },
    });

    expect(start).toMatchObject({ status: "pending", completedPairs: 0, totalPairs: 5, totalBatches: 2 });
    const firstAdvance = await caller.aiAgent.advancePrintableGeneration({ jobId: start.jobId });
    expect(firstAdvance).toMatchObject({ status: "pending", completedPairs: 4, totalPairs: 5 });
    expect(JSON.parse(printableState).completedItems).toHaveLength(8);
    expect(mocks.putCachedGenerationResponse).not.toHaveBeenCalled();

    const finalAdvance = await caller.aiAgent.advancePrintableGeneration({ jobId: start.jobId });
    expect(mocks.generatePrintablePaperBatch).toHaveBeenLastCalledWith(expect.objectContaining({
      existingItems: expect.arrayContaining([expect.objectContaining({ conceptKey: "speed" })]),
      pairCount: 1,
    }));
    expect(finalAdvance).toMatchObject({ status: "completed", completedPairs: 5, totalPairs: 5 });
    expect(finalAdvance.payload).toMatchObject({ mode: "short", items: expect.arrayContaining([expect.objectContaining({ orGroup: 5, conceptKey: "force" })]) });
    expect(mocks.putCachedGenerationResponse).toHaveBeenCalledWith(expect.objectContaining({ requestFingerprint: "progressive-printable-fingerprint" }));
  });

  it("resumes an interrupted printable job without discarding its saved batch state", async () => {
    const resumableState = JSON.stringify({
      version: 1,
      input: { paperType: "short", title: "Motion revision", pairCount: 1, difficulty: "balanced" },
      sourceContext: { sourceType: "raw_text", sourceTitle: "Teacher-provided custom source", priorQuestionHistory: [] },
      batchPlan: [1],
      completedItems: [],
      providerTelemetry: { providers: [], fallbackUsed: false, primaryFailureType: null, managedRetryAttempts: 0, geminiRetryAttempts: 0 },
    });
    let printableState = resumableState;
    mocks.getGenerationJob.mockImplementation(async () => ({
      id: 701,
      userId: 7,
      generationMode: "short",
      printableState,
      contentText: "Motion explains speed, velocity, and acceleration using verified textbook definitions. ".repeat(4),
      requestFingerprint: "resume-printable-fingerprint",
    }));
    mocks.updateGenerationJob.mockImplementation(async (_jobId, updates) => {
      if (updates.printableState) printableState = updates.printableState;
    });
    mocks.generatePrintablePaperBatch
      .mockRejectedValueOnce(new Error("Temporary provider interruption"))
      .mockResolvedValueOnce({
        items: [
          shortItem("speed", "definition", "speed is distance per unit time", 1),
          shortItem("velocity", "definition", "velocity is displacement per unit time", 1),
        ],
        providerTelemetry: { provider: "managed_llm", fallbackUsed: false, primaryFailureType: null, managedRetryAttempts: 0, geminiRetryAttempts: 0 },
      });

    const caller = appRouter.createCaller(createAdminContext());
    await expect(caller.aiAgent.advancePrintableGeneration({ jobId: 701 })).rejects.toThrow("Temporary provider interruption");
    expect(mocks.updateGenerationJob).toHaveBeenCalledWith(701, expect.objectContaining({ status: "failed", progress: 0 }));
    expect(JSON.parse(printableState).completedItems).toEqual([]);

    const resumed = await caller.aiAgent.advancePrintableGeneration({ jobId: 701 });
    expect(resumed).toMatchObject({ status: "completed", completedPairs: 1, totalPairs: 1 });
    expect(mocks.generatePrintablePaperBatch).toHaveBeenCalledTimes(2);
  });
});

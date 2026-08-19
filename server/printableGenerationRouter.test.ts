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
  getCachedGenerationResponse: vi.fn(),
  getOpenGenerationCircuit: vi.fn(),
  openGenerationCircuit: vi.fn(),
  closeGenerationCircuit: vi.fn(),
  putCachedGenerationResponse: vi.fn(),
  createGenerationJob: vi.fn(),
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
  updateGenerationJob: mocks.updateGenerationJob,
}));
vi.mock("./printablePaper", () => ({ generatePrintablePaperFromContent: mocks.generatePrintablePaperFromContent }));

import { appRouter } from "./routers";

function createAdminContext(): TrpcContext {
  return {
    user: { id: 7, openId: "admin-printable-history", email: "admin@example.com", name: "Admin", loginMethod: "manus", role: "admin", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
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
    mocks.updateGenerationJob.mockReset();
    mocks.getCachedGenerationResponse.mockResolvedValue(undefined);
    mocks.getOpenGenerationCircuit.mockResolvedValue(undefined);
    mocks.openGenerationCircuit.mockResolvedValue(undefined);
    mocks.closeGenerationCircuit.mockResolvedValue(undefined);
    mocks.putCachedGenerationResponse.mockResolvedValue(undefined);
    mocks.createGenerationJob.mockResolvedValue({ id: 700 });
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
      providerTelemetry: { provider: "gemini_byok", fallbackUsed: true, primaryFailureType: "quota_exhaustion", managedRetryAttempts: 0, geminiRetryAttempts: 1 },
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
    expect(mocks.updateGenerationJob).toHaveBeenCalledWith(700, expect.objectContaining({ generationProvider: "gemini_byok", fallbackUsed: 1, primaryFailureType: "quota_exhaustion" }));
  });
});

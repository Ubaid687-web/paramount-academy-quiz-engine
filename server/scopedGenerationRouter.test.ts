import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({
  getActiveCurriculumScopeCatalog: vi.fn(),
  listActiveAssessmentPatternSources: vi.fn(),
  listReviewedAssessmentPatternGuidance: vi.fn(),
  listApprovedStyleAnchorExamples: vi.fn(),
  listPriorGeneratedQuestionHistory: vi.fn(),
  generateMCQsFromContent: vi.fn(),
}));

vi.mock("./db", () => ({
  getActiveCurriculumScopeCatalog: mocks.getActiveCurriculumScopeCatalog,
  listActiveAssessmentPatternSources: mocks.listActiveAssessmentPatternSources,
  listReviewedAssessmentPatternGuidance: mocks.listReviewedAssessmentPatternGuidance,
  listApprovedStyleAnchorExamples: mocks.listApprovedStyleAnchorExamples,
  listPriorGeneratedQuestionHistory: mocks.listPriorGeneratedQuestionHistory,
}));
vi.mock("./aiAgent", () => ({ generateMCQsFromContent: mocks.generateMCQsFromContent }));

import { appRouter } from "./routers";

function createAdminContext(): TrpcContext {
  return {
    user: {
      id: 7,
      openId: "admin-scoped-generation",
      email: "admin@example.com",
      name: "Admin",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("scoped curriculum draft generation", () => {
  it("resolves the reviewed chapter server-side and passes its immutable provenance to the draft engine", async () => {
    mocks.listApprovedStyleAnchorExamples.mockResolvedValue([]);
    mocks.listActiveAssessmentPatternSources.mockResolvedValue([{ sourceKind: "past_paper", academicYear: "2025" }]);
    mocks.listReviewedAssessmentPatternGuidance.mockResolvedValue([{
      sourceKind: "past_paper",
      academicYear: "2025",
      sectionAInstruction: "Answer all 13 one-mark MCQs.",
      sectionBInstruction: "Use direct command wording.",
      sectionCInstruction: null,
      orRule: "Each alternative has equal marks.",
      profileEvidenceNotes: "The reviewed paper uses concise direct wording.",
    }]);
    mocks.listPriorGeneratedQuestionHistory.mockResolvedValue([{
      conceptKey: "velocity",
      question: "Define velocity.",
      sourceReference: "Kinematics",
      learningObjective: "Define velocity.",
      assessmentMode: "mcq",
    }]);
    mocks.getActiveCurriculumScopeCatalog.mockResolvedValue({
      curriculumSet: { id: 77, grade: "10", subject: "physics", label: "FBISE Grade 10 Physics", editionLabel: "2026" },
      chapters: [{
        id: 10, curriculumSetId: 77, sequence: 1, code: "Ch. 10", title: "Kinematics", blockKey: null, partKey: null,
        startPage: 1, endPage: 20, contentText: "Kinematics explains displacement, velocity, acceleration, and the relationships between them. ".repeat(4), isActive: 1,
      }],
      segments: [],
      templates: [],
      templateMemberships: [],
    });
    mocks.generateMCQsFromContent.mockResolvedValue({ jobId: 200, mcqs: [], analysis: {}, draft: { status: "success" } });

    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.aiAgent.generateMCQs({
      numQuestions: 12,
      difficulty: "balanced",
      scope: { subject: "physics", scopeType: "single_chapter", chapterIds: [10] },
    });

    expect(result).toMatchObject({ jobId: 200, draft: { status: "success" } });
    expect(mocks.generateMCQsFromContent).toHaveBeenCalledWith(
      7,
      expect.stringContaining("Kinematics explains displacement"),
      12,
      "balanced",
      expect.objectContaining({
        sourceType: "curriculum_scope",
        sourceTitle: "Kinematics",
        curriculumSetId: 77,
        scopeType: "single_chapter",
        selectedChapterIds: [10],
        scopeSnapshot: expect.objectContaining({ displayLabel: "Kinematics" }),
        paperPatternGuidance: [expect.objectContaining({ sourceKind: "past_paper", academicYear: "2025", sectionAInstruction: "Answer all 13 one-mark MCQs." })],
        priorQuestionHistory: [expect.objectContaining({ conceptKey: "velocity" })],
      })
    );
  });

  it("rejects raw teacher text before the generation provider can be called", async () => {
    mocks.generateMCQsFromContent.mockClear();
    const caller = appRouter.createCaller(createAdminContext());

    await expect((caller.aiAgent.generateMCQs as any)({
      numQuestions: 2,
      difficulty: "balanced",
      contentText: "Unreviewed teacher material must never become factual source text. ".repeat(3),
    })).rejects.toThrow("scope");

    expect(mocks.generateMCQsFromContent).not.toHaveBeenCalled();
  });
});

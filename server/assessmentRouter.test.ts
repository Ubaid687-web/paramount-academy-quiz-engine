import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({
  getActiveCurriculumScopeCatalog: vi.fn(),
  listActiveAssessmentPatternSources: vi.fn(),
  listAssessmentPatternSourcesByIds: vi.fn(),
  createAssessmentDraft: vi.fn(),
  getAssessmentDraft: vi.fn(),
  updateAssessmentDraft: vi.fn(),
  resolveCurriculumScope: vi.fn(),
}));

vi.mock("./db", () => ({
  getActiveCurriculumScopeCatalog: mocks.getActiveCurriculumScopeCatalog,
  listActiveAssessmentPatternSources: mocks.listActiveAssessmentPatternSources,
  listAssessmentPatternSourcesByIds: mocks.listAssessmentPatternSourcesByIds,
  createAssessmentDraft: mocks.createAssessmentDraft,
  getAssessmentDraft: mocks.getAssessmentDraft,
  updateAssessmentDraft: mocks.updateAssessmentDraft,
}));

vi.mock("./curriculumScope", () => ({
  resolveCurriculumScope: mocks.resolveCurriculumScope,
}));

import { appRouter } from "./routers";

function createAdminContext(): TrpcContext {
  return {
    user: {
      id: 7,
      openId: "assessment-admin",
      email: "admin@example.com",
      name: "Assessment Admin",
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

const physicsCatalog = {
  curriculumSet: { id: 1, grade: "10", subject: "physics", label: "Physics", editionLabel: "Reviewed source" },
  chapters: [],
  segments: [],
  templates: [],
  templateMemberships: [],
};

const physicsScope = {
  subject: "physics" as const,
  scopeType: "single_chapter" as const,
  chapterIds: [10],
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listActiveAssessmentPatternSources.mockResolvedValue([]);
  mocks.listAssessmentPatternSourcesByIds.mockResolvedValue([]);
  mocks.resolveCurriculumScope.mockReturnValue({
    snapshot: { curriculumSetId: 1, chapterIds: [10] },
    sourceText: "Approved Physics content.",
    scopeType: "single_chapter",
    scopeTemplateId: null,
    chapterIds: [10],
    segmentIds: [],
  });
});

describe("assessment router", () => {
  it("keeps all assessment modes unavailable for a subject without an active approved textbook", async () => {
    mocks.getActiveCurriculumScopeCatalog.mockResolvedValue(undefined);
    const caller = appRouter.createCaller(createAdminContext());

    const availability = await caller.assessment.getAvailability({ subject: "computer_science" });

    expect(availability).toMatchObject({
      textbookReady: false,
      paperPatternReady: false,
      supportedModes: { mcq: false, short: false, long: false, full_paper: false },
    });
  });

  it("enables the Computer Science full-paper workflow only when active supplied paper evidence accompanies its active textbook", async () => {
    mocks.getActiveCurriculumScopeCatalog.mockResolvedValue({
      ...physicsCatalog,
      curriculumSet: { id: 60001, grade: "10", subject: "computer_science", label: "Computer Science", editionLabel: "Supplied textbook" },
    });
    mocks.listActiveAssessmentPatternSources.mockResolvedValue([
      { id: 70001, sourceKind: "past_paper", academicYear: "2024", originalFileName: "class-10-computer-science-past-paper-2024.pdf" },
    ]);
    const caller = appRouter.createCaller(createAdminContext());

    const availability = await caller.assessment.getAvailability({ subject: "computer_science" });

    expect(availability).toMatchObject({
      textbookReady: true,
      paperPatternReady: true,
      supportedModes: { mcq: true, short: true, long: true, full_paper: true },
      paperSources: [{ id: 70001, sourceKind: "past_paper", academicYear: "2024" }],
    });
  });

  it("saves a validated short-question draft only with an approved textbook scope", async () => {
    mocks.getActiveCurriculumScopeCatalog.mockResolvedValue(physicsCatalog);
    mocks.createAssessmentDraft.mockResolvedValue({ id: 801 });
    const caller = appRouter.createCaller(createAdminContext());

    const result = await caller.assessment.saveDraft({
      assessmentMode: "short",
      scope: physicsScope,
      payload: {
        mode: "short",
        title: "Physics short-question draft",
        estimatedDurationMinutes: 8,
        items: [{
          kind: "short",
          question: "State the supported concept.",
          expectedAnswer: "A source-grounded answer.",
          markingGuide: ["Identifies the supported concept"],
          difficulty: "easy",
          marks: 2,
          sourceReference: "Unit 10, page 18",
          learningObjective: "State the key concept accurately.",
        }],
      },
    });

    expect(result).toMatchObject({ success: true, assessmentDraftId: 801 });
    expect(mocks.createAssessmentDraft).toHaveBeenCalledWith(expect.objectContaining({
      assessmentMode: "short",
      sourceState: "ready",
      curriculumSetId: 1,
      totalMarks: 2,
      createdBy: 7,
    }));
  });

  it("blocks full-paper drafts when no active supplied paper-pattern source is attached", async () => {
    mocks.getActiveCurriculumScopeCatalog.mockResolvedValue(physicsCatalog);
    const caller = appRouter.createCaller(createAdminContext());

    await expect(caller.assessment.saveDraft({
      assessmentMode: "full_paper",
      scope: physicsScope,
      payload: {
        mode: "full_paper",
        title: "Blocked paper",
        estimatedDurationMinutes: null,
        patternReferences: ["Supplied paper reference"],
        totalMarks: 1,
        sections: [{
          label: "Section A",
          instructions: "Attempt the question.",
          items: [{
            kind: "short",
            question: "State the concept.",
            expectedAnswer: "Supported answer.",
            markingGuide: ["Correctly states the concept"],
            difficulty: "easy",
            marks: 1,
            sourceReference: "Unit 10, page 18",
            learningObjective: "State the concept.",
          }],
        }],
      },
    })).rejects.toThrow("A full-paper draft requires active, extracted paper-pattern sources supplied for the selected subject.");
  });

  it("revalidates and places a saved draft into review when Portal Admin revises it", async () => {
    mocks.getAssessmentDraft.mockResolvedValue({ id: 801, createdBy: 7, assessmentMode: "short" });
    mocks.updateAssessmentDraft.mockResolvedValue({ id: 801 });
    const caller = appRouter.createCaller(createAdminContext());

    const result = await caller.assessment.reviseDraft({
      assessmentDraftId: 801,
      payload: {
        mode: "short",
        title: "Revised short draft",
        estimatedDurationMinutes: null,
        items: [{
          kind: "short",
          question: "State the supported concept.",
          expectedAnswer: "A supported answer.",
          markingGuide: ["States the concept"],
          difficulty: "easy",
          marks: 2,
          sourceReference: "Unit 10, page 18",
          learningObjective: "State the concept accurately.",
        }],
      },
    });

    expect(result).toMatchObject({ success: true, assessmentDraftId: 801 });
    expect(mocks.updateAssessmentDraft).toHaveBeenCalledWith(801, expect.objectContaining({ status: "in_review", totalMarks: 2, reviewedBy: 7 }));
  });
});

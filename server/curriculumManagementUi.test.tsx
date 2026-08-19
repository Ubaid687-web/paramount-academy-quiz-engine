import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import CurriculumManagement from "../client/src/pages/CurriculumManagement";

const noOpMutation = { mutateAsync: vi.fn(), isPending: false };
const invalidate = vi.fn();
const authMock = vi.hoisted(() => ({ role: "admin" as "admin" | "teacher" }));
const queryOptions = vi.hoisted(() => ({ listSets: [] as boolean[], listProgrammes: [] as boolean[], staffDirectory: [] as boolean[] }));

const managementDetails = {
  curriculumSet: { id: 1, board: "FBISE", grade: "10", subject: "physics", label: "FBISE Grade 10 Physics", editionLabel: "2026 edition", status: "draft" },
  sources: [{ id: 2, originalFileName: "physics.pdf", extractionStatus: "extracted", extractedText: "Approved textbook text", pageCount: 200 }],
  sourcePageReviews: [{ sourceId: 2, pageNumber: 7, qualityScore: 28, reviewStatus: "needs_review", reviewReasons: "very little extracted text" }],
  ocrJobs: [],
  paperPatternSources: [{ id: 3, originalFileName: "physics-2025.pdf", sourceKind: "past_paper", academicYear: "2025", extractionStatus: "extracted", status: "draft" }],
  paperPatternProfiles: [{ patternSourceId: 3, sectionAInstruction: "Attempt all MCQs.", sectionBInstruction: null, sectionCInstruction: null, mcqCount: 12, mcqMarksEach: 1, shortOrPairCount: null, shortMarksEach: null, longOrPairCount: null, longMarksEach: null, totalMarks: 60, durationMinutes: 180, orRule: null, profileEvidenceNotes: "Page 1 confirms the MCQ section.", reviewStatus: "reviewed" }],
  chapters: [{ id: 4, code: "Ch. 1", title: "Motion", contentText: "A reviewed source chapter containing sufficient source content for the management interface." }],
  chapterSegments: [],
  scopeTemplates: [],
  readiness: { sourceStored: true, sourceExtracted: true, reviewedActiveChapters: 1, weakOcrPages: 1, ocrReviewComplete: false, patternSourcesExtracted: 1, patternProfilesReviewed: 1 },
};

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ curriculum: { listSets: { invalidate }, listProgrammes: { invalidate }, getManagementDetails: { invalidate } }, generation: { getProviderSettings: { invalidate }, listHistory: { invalidate } } }),
    curriculum: {
      listSets: { useQuery: (_input?: unknown, options?: { enabled?: boolean }) => { queryOptions.listSets.push(Boolean(options?.enabled)); return { data: [managementDetails.curriculumSet], isLoading: false, error: null }; } },
      listProgrammes: { useQuery: (_input?: unknown, options?: { enabled?: boolean }) => { queryOptions.listProgrammes.push(Boolean(options?.enabled)); return { data: [{ id: 11, board: "FBISE", grade: "10", subject: "physics", teacherLabel: "Physics", status: "ready" }], isLoading: false, error: null }; } },
      getManagementDetails: { useQuery: () => ({ data: managementDetails, isLoading: false }) },
      proposeChaptersFromSource: { useQuery: () => ({ data: undefined, isLoading: false, isFetching: false, error: null, refetch: vi.fn() }) },
      createProgramme: { useMutation: () => noOpMutation }, activateProgramme: { useMutation: () => noOpMutation }, createSet: { useMutation: () => noOpMutation }, replaceActiveSet: { useMutation: () => noOpMutation }, ingestSource: { useMutation: () => noOpMutation }, ingestPaperPatternSource: { useMutation: () => noOpMutation }, activatePaperPatternSource: { useMutation: () => noOpMutation }, savePaperPatternProfile: { useMutation: () => noOpMutation }, createChapter: { useMutation: () => noOpMutation }, saveHalfChapterSegments: { useMutation: () => noOpMutation }, createScopeTemplate: { useMutation: () => noOpMutation }, activateSet: { useMutation: () => noOpMutation }, reviewSourcePage: { useMutation: () => noOpMutation },
    },
    staff: {
      listRoleDirectory: { useQuery: (_input?: unknown, options?: { enabled?: boolean }) => { queryOptions.staffDirectory.push(Boolean(options?.enabled)); return { data: [{ id: 1, name: "Portal Admin", email: "admin@example.com", role: "admin" }, { id: 2, name: "Teacher", email: "teacher@example.com", role: "teacher" }], isLoading: false, error: null, refetch: vi.fn() }; } },
      updateRole: { useMutation: () => noOpMutation },
      listTeacherProvisionRules: { useQuery: () => ({ data: [{ id: 5, email: "teacher@example.com", addedBy: 1, createdAt: new Date() }], isLoading: false, error: null, refetch: vi.fn() }) },
      approveTeacherEmail: { useMutation: () => noOpMutation },
      removeTeacherEmailApproval: { useMutation: () => noOpMutation },
    },
    generation: {
      getProviderSettings: { useQuery: () => ({ data: { id: 1, geminiFallbackEnabled: 0, geminiCredentialConfigured: true }, isLoading: false, error: null }) },
      setGeminiFallbackEnabled: { useMutation: () => noOpMutation },
      listHistory: { useQuery: () => ({ data: [{ id: 99, status: "completed", createdAt: new Date("2026-08-19T00:00:00.000Z"), completedAt: new Date("2026-08-19T00:00:02.000Z"), generationProvider: "gemini_byok", fallbackUsed: 1, primaryFailureType: "quota_exhaustion", retryAttempts: 2, managedRetryAttempts: 0, geminiRetryAttempts: 2, cacheHit: 0, promptSourceChars: 24000, promptInputChars: 12000, errorMessage: null, staffName: "Teacher", staffEmail: "teacher@example.com" }], isLoading: false, error: null }) },
    },
  },
}));

vi.mock("@/components/AcademyShell", () => ({ AcademyShell: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: 1, role: authMock.role }, loading: false }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe("Curriculum Library Release 1", () => {
  afterEach(() => { cleanup(); invalidate.mockReset(); queryOptions.listSets.length = 0; queryOptions.listProgrammes.length = 0; queryOptions.staffDirectory.length = 0; authMock.role = "admin"; window.history.pushState({}, "", "/"); });

  it("shows evidence-based edition readiness and the linked reviewed paper-pattern profile", () => {
    render(<CurriculumManagement />);

    expect(screen.getByText("Add another grade or subject")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Add another grade" }).getAttribute("href")).toBe("#programme-catalogue");
    expect(screen.getByText("Staff access")).toBeTruthy();
    expect(screen.getByText("Automatic teacher sign-in")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Approve teacher email" })).toBeTruthy();
    expect(screen.getByText("AI generation controls")).toBeTruthy();
    expect(screen.getByLabelText("Enable Gemini fallback after managed-provider quota exhaustion")).toBeTruthy();
    expect(screen.getByText("AI generation history")).toBeTruthy();
    expect(screen.getByText(/Gemini fallback · fallback used/)).toBeTruthy();
    expect(screen.getByText("Edition readiness checklist")).toBeTruthy();
    expect(screen.getByText("Textbook extraction completed")).toBeTruthy();
    expect(screen.getByText("At least one reviewed active chapter")).toBeTruthy();
    expect(screen.getByText("Pattern profile reviewed (optional for book activation)")).toBeTruthy();
    expect(screen.getByText("OCR pages need review")).toBeTruthy();
    expect(screen.getByText(/physics\.pdf · page 7/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Mark reviewed" })).toBeTruthy();
    expect(screen.getByText("Review Paper-Pattern Profile")).toBeTruthy();
    expect((screen.getByLabelText("MCQ count") as HTMLInputElement).value).toBe("12");
    expect(screen.getByDisplayValue("Page 1 confirms the MCQ section.")).toBeTruthy();
  });

  it("keeps a teacher out of the Portal Admin curriculum route", () => {
    authMock.role = "teacher";
    render(<CurriculumManagement />);

    expect(screen.getByText("Portal Admin access required")).toBeTruthy();
    expect(screen.queryByText("Add another grade or subject")).toBeNull();
    expect(queryOptions.listSets.length).toBeGreaterThan(0);
    expect(queryOptions.listProgrammes.length).toBeGreaterThan(0);
    expect(queryOptions.staffDirectory.length).toBeGreaterThan(0);
    expect(queryOptions.listSets.every((enabled) => !enabled)).toBe(true);
    expect(queryOptions.listProgrammes.every((enabled) => !enabled)).toBe(true);
    expect(queryOptions.staffDirectory.every((enabled) => !enabled)).toBe(true);
  });

  it("shows only subject naming for the focused Grade 9 intake handoff", () => {
    window.history.pushState({}, "", "/curriculum?grade=9&intake=subject");
    render(<CurriculumManagement />);

    expect(screen.getByRole("heading", { name: "Add one subject at a time." })).toBeTruthy();
    expect(screen.getByLabelText("Subject name")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Continue to textbook upload" })).toBeTruthy();
    expect(screen.queryByText("Add a grade or subject")).toBeNull();
    expect(screen.queryByText("Edition readiness checklist")).toBeNull();
  });

  it("offers approved photographed textbook formats in the controlled upload control", () => {
    render(<CurriculumManagement />);

    const upload = screen.getByLabelText("Curriculum source upload") as HTMLInputElement;
    expect(upload.accept).toContain(".pdf");
    expect(upload.accept).toContain(".jpg");
    expect(upload.accept).toContain(".png");
    expect(upload.accept).toContain(".webp");
  });
});

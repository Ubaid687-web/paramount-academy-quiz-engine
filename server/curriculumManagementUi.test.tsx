import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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
  chapters: [{ id: 4, sourceId: 2, code: "Ch. 1", title: "Motion", startPage: 1, endPage: 12, isActive: 1, contentText: "A reviewed source chapter containing sufficient source content for the management interface." }],
  chapterSegments: [],
  scopeTemplates: [],
  readiness: { sourceStored: true, sourceExtracted: true, reviewedActiveChapters: 1, weakOcrPages: 1, ocrReviewComplete: false, patternSourcesExtracted: 1, patternProfilesReviewed: 1 },
};

const archivedChemistrySet = {
  id: 99,
  board: "FBISE",
  grade: "10",
  subject: "chemistry",
  label: "FBISE Grade 10 Chemistry — retired 2020 edition",
  editionLabel: "2020 NBF textbook",
  status: "archived",
};

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ curriculum: { listSets: { invalidate }, listProgrammes: { invalidate }, getManagementDetails: { invalidate } }, generation: { getProviderSettings: { invalidate }, listHistory: { invalidate }, getStyleAnchor: { invalidate } } }),
    curriculum: {
      listSets: { useQuery: (_input?: unknown, options?: { enabled?: boolean }) => { queryOptions.listSets.push(Boolean(options?.enabled)); return { data: [managementDetails.curriculumSet, archivedChemistrySet], isLoading: false, error: null }; } },
      listProgrammes: { useQuery: (_input?: unknown, options?: { enabled?: boolean }) => { queryOptions.listProgrammes.push(Boolean(options?.enabled)); return { data: [{ id: 11, board: "FBISE", grade: "10", subject: "physics", teacherLabel: "Physics", status: "ready" }], isLoading: false, error: null }; } },
      getManagementDetails: { useQuery: () => ({ data: managementDetails, isLoading: false }) },
      proposeChaptersFromSource: { useQuery: () => ({ data: undefined, isLoading: false, isFetching: false, error: null, refetch: vi.fn() }) },
      createProgramme: { useMutation: () => noOpMutation }, activateProgramme: { useMutation: () => noOpMutation }, createSet: { useMutation: () => noOpMutation }, replaceActiveSet: { useMutation: () => noOpMutation }, ingestSource: { useMutation: () => noOpMutation }, ingestPaperPatternSource: { useMutation: () => noOpMutation }, activatePaperPatternSource: { useMutation: () => noOpMutation }, savePaperPatternProfile: { useMutation: () => noOpMutation }, createChapter: { useMutation: () => noOpMutation }, saveHalfChapterSegments: { useMutation: () => noOpMutation }, createScopeTemplate: { useMutation: () => noOpMutation }, activateSet: { useMutation: () => noOpMutation }, reviewSourcePage: { useMutation: () => noOpMutation }, getOcrReviewPage: { useQuery: () => ({ data: { pageNumber: 7, pageText: "Extracted source text for review.", previewUrl: "/api/ocr-review/source/2/page/7" }, isLoading: false, error: null }) }, correctOcrReviewPage: { useMutation: () => noOpMutation }, setChapterGenerationAvailability: { useMutation: () => noOpMutation },
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
      getStyleAnchor: { useQuery: () => ({ data: { anchor: { fingerprint: "anchor-v1", approvedExampleCount: 0, hasReviewedPatternRules: true }, approvedExamples: [], eligibleExamples: [] }, isLoading: false, error: null }) },
      approveStyleAnchorExample: { useMutation: () => noOpMutation },
      removeStyleAnchorExample: { useMutation: () => noOpMutation },
    },
  },
}));

vi.mock("@/components/AcademyShell", () => ({ AcademyShell: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: 1, role: authMock.role }, loading: false }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe("Curriculum Library Release 1", () => {
  afterEach(() => { cleanup(); invalidate.mockReset(); queryOptions.listSets.length = 0; queryOptions.listProgrammes.length = 0; queryOptions.staffDirectory.length = 0; authMock.role = "admin"; window.history.pushState({}, "", "/"); });

  it("shows one focused Portal Admin task at a time while preserving every administrative workflow", async () => {
    render(<CurriculumManagement />);

    expect(screen.getByRole("heading", { name: "What do you need to manage?" })).toBeTruthy();
    expect(screen.queryByText("Staff access")).toBeNull();
    expect(screen.queryByText("AI generation controls")).toBeNull();
    expect(screen.queryByText("Edition readiness checklist")).toBeNull();

    fireEvent.click(screen.getByRole("tab", { name: /Staff/i }));
    expect(screen.getByText("Staff access")).toBeTruthy();
    expect(screen.getByText("Automatic teacher sign-in")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Approve teacher email" })).toBeTruthy();
    expect(screen.queryByText("AI generation controls")).toBeNull();

    fireEvent.click(screen.getByRole("tab", { name: /^AI/i }));
    expect(screen.getByText("AI generation controls")).toBeTruthy();
    expect(screen.getByLabelText("Enable Gemini fallback after managed-provider quota exhaustion")).toBeTruthy();
    expect(screen.queryByText("AI generation history")).toBeNull();
    fireEvent.click(screen.getByRole("tab", { name: "History" }));
    expect(screen.getByText("AI generation history")).toBeTruthy();
    expect(screen.getByText(/Gemini fallback · fallback used/)).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: /^Review/i }));
    expect(screen.getByText("Generation availability")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Exclude from generation" })).toBeTruthy();
    expect(screen.getByText("Edition readiness checklist")).toBeTruthy();
    expect(screen.getByText("Textbook extraction completed")).toBeTruthy();
    expect(screen.getByText("At least one reviewed active chapter")).toBeTruthy();
    expect(screen.getByText("Pattern profile reviewed (optional for book activation)")).toBeTruthy();
    expect(screen.getByText("OCR pages need review")).toBeTruthy();
    expect(screen.getByText(/physics\.pdf · page 7/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Compare and correct" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Mark reviewed without changes" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Compare and correct" }));
    expect(await screen.findByText("OCR page comparison")).toBeTruthy();
    expect(screen.getByAltText("Original source page 7")).toBeTruthy();
    expect(screen.getByDisplayValue("Extracted source text for review.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Save correction and mark reviewed" })).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: "Paper pattern" }));
    expect(screen.getByText("Review Paper-Pattern Profile")).toBeTruthy();
    expect((screen.getByLabelText("MCQ count") as HTMLInputElement).value).toBe("12");
    expect(screen.getByDisplayValue("Page 1 confirms the MCQ section.")).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: /^Curriculum/i }));
    expect(screen.getByText("Add another grade or subject")).toBeTruthy();
    expect(screen.queryByText("FBISE Grade 10 Chemistry — retired 2020 edition")).toBeNull();
    expect(screen.getByRole("button", { name: "Back to Quiz Centre" })).toBeTruthy();
    expect(screen.getByText("Teacher availability")).toBeTruthy();
    expect(screen.queryByText("OCR pages need review")).toBeNull();
    fireEvent.click(screen.getByRole("tab", { name: "Chapters" }));
    expect(screen.getByText("Propose chapters from extracted text")).toBeTruthy();
    expect(screen.getByText("Review and save a chapter")).toBeTruthy();
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

    fireEvent.click(screen.getByRole("tab", { name: /^Curriculum/i }));

    const upload = screen.getByLabelText("Curriculum source upload") as HTMLInputElement;
    expect(upload.accept).toContain(".pdf");
    expect(upload.accept).toContain(".jpg");
    expect(upload.accept).toContain(".png");
    expect(upload.accept).toContain(".webp");
  });
});

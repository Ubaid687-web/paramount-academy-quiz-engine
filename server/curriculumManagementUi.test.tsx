import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import CurriculumManagement from "../client/src/pages/CurriculumManagement";

const noOpMutation = { mutateAsync: vi.fn(), isPending: false };
const binaryChunkFetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
  const headers = (init?.headers ?? {}) as Record<string, string>;
  const input = {
    uploadToken: headers["x-upload-token"],
    chunkIndex: Number(headers["x-chunk-index"]),
    expectedRevision: Number(headers["x-expected-revision"]),
    fileBuffer: "binary-test-fixture",
  };
  try {
    const payload = await noOpMutation.mutateAsync(input);
    return { ok: true, status: 200, text: async () => JSON.stringify(payload) } as Response;
  } catch (error) {
    return { ok: false, status: 400, text: async () => JSON.stringify({ error: error instanceof Error ? error.message : "upload failed" }) } as Response;
  }
});
vi.stubGlobal("fetch", binaryChunkFetch);
const invalidate = vi.fn();
const getLargePdfUploadStatus = vi.fn();
const getPaperPatternSourceDownload = vi.fn();
const setPaperSourceStudentLibraryStatus = { mutateAsync: vi.fn(), isPending: false };
type ChunkAcknowledgement = { receivedBytes: number; fileSize: number; complete: boolean; nextChunkIndex: number; revision?: number; expiresAt: number; acknowledgement?: "committed" | "already_committed" };

function largePdfFixture(name: string, size: number, lastModified?: number) {
  const file = new File(["x"], name, { type: "application/pdf", lastModified });
  Object.defineProperty(file, "size", { configurable: true, value: size });
  Object.defineProperty(file, "slice", { configurable: true, value: () => new Blob(["x"], { type: "application/pdf" }) });
  return file;
}
const authMock = vi.hoisted(() => ({ role: "admin" as "admin" | "teacher" }));
const queryOptions = vi.hoisted(() => ({ listSets: [] as boolean[], listProgrammes: [] as boolean[], staffDirectory: [] as boolean[] }));

const managementDetails = {
  curriculumSet: { id: 1, board: "FBISE", grade: "10", subject: "physics", label: "FBISE Grade 10 Physics", editionLabel: "2026 edition", status: "draft" },
  sources: [{ id: 2, originalFileName: "physics.pdf", extractionStatus: "extracted", extractedText: "Approved textbook text", pageCount: 200 }],
  sourcePageReviews: [{ sourceId: 2, pageNumber: 7, qualityScore: 28, reviewStatus: "needs_review", reviewReasons: "very little extracted text" }],
  ocrJobs: [],
  paperPatternSources: [{ id: 3, originalFileName: "physics-2025.pdf", sourceKind: "past_paper", academicYear: "2025", timelineOrder: 1, timelineLabel: null, mimeType: "application/pdf", extractionStatus: "extracted", status: "active", studentLibraryStatus: "hidden" }],
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

const grade9ChemistryProgramme = { id: 12, board: "FBISE", grade: "9", subject: "chemistry", teacherLabel: "Chemistry", status: "intake_only" };
const grade9ChemistrySet = { id: 13, board: "FBISE", grade: "9", subject: "chemistry", label: "Grade 9 Chemistry textbook", editionLabel: "Intake draft", status: "draft" };
const grade9ChemistryDetails = {
  ...managementDetails,
  curriculumSet: grade9ChemistrySet,
  sources: [],
  sourcePageReviews: [],
  ocrJobs: [],
  chapters: [],
  readiness: { ...managementDetails.readiness, sourceStored: false, sourceExtracted: false, reviewedActiveChapters: 0, weakOcrPages: 0, ocrReviewComplete: true },
};

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ curriculum: { listSets: { invalidate }, listProgrammes: { invalidate }, getManagementDetails: { invalidate }, getLargePdfUploadStatus: { fetch: getLargePdfUploadStatus }, getPaperPatternSourceDownload: { fetch: getPaperPatternSourceDownload } }, generation: { getProviderSettings: { invalidate }, listHistory: { invalidate }, getStyleAnchor: { invalidate } } }),
    curriculum: {
      listSets: { useQuery: (_input?: unknown, options?: { enabled?: boolean }) => { queryOptions.listSets.push(Boolean(options?.enabled)); return { data: [managementDetails.curriculumSet, grade9ChemistrySet, archivedChemistrySet], isLoading: false, error: null }; } },
      listProgrammes: { useQuery: (_input?: unknown, options?: { enabled?: boolean }) => { queryOptions.listProgrammes.push(Boolean(options?.enabled)); return { data: [{ id: 11, board: "FBISE", grade: "10", subject: "physics", teacherLabel: "Physics", status: "ready" }, grade9ChemistryProgramme], isLoading: false, error: null }; } },
      getManagementDetails: { useQuery: (input: { curriculumSetId: number }) => ({ data: input.curriculumSetId === grade9ChemistrySet.id ? grade9ChemistryDetails : managementDetails, isLoading: false }) },
      proposeChaptersFromSource: { useQuery: () => ({ data: undefined, isLoading: false, isFetching: false, error: null, refetch: vi.fn() }) },
      createProgramme: { useMutation: () => noOpMutation }, activateProgramme: { useMutation: () => noOpMutation }, createSet: { useMutation: () => noOpMutation }, replaceActiveSet: { useMutation: () => noOpMutation }, ingestSource: { useMutation: () => noOpMutation }, prepareLargePdfUpload: { useMutation: () => noOpMutation }, appendLargePdfChunk: { useMutation: () => noOpMutation }, completeLargePdfUpload: { useMutation: () => noOpMutation }, ingestPaperPatternSource: { useMutation: () => noOpMutation }, activatePaperPatternSource: { useMutation: () => noOpMutation }, setPaperSourceStudentLibraryStatus: { useMutation: () => setPaperSourceStudentLibraryStatus }, savePaperPatternProfile: { useMutation: () => noOpMutation }, createChapter: { useMutation: () => noOpMutation }, saveHalfChapterSegments: { useMutation: () => noOpMutation }, createScopeTemplate: { useMutation: () => noOpMutation }, activateSet: { useMutation: () => noOpMutation }, reviewSourcePage: { useMutation: () => noOpMutation }, getOcrReviewPage: { useQuery: () => ({ data: { pageNumber: 7, pageText: "Extracted source text for review.", previewUrl: "/api/ocr-review/source/2/page/7" }, isLoading: false, error: null }) }, correctOcrReviewPage: { useMutation: () => noOpMutation }, setChapterGenerationAvailability: { useMutation: () => noOpMutation },
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
      listHistory: { useQuery: () => ({ data: [{ id: 100, status: "completed", createdAt: new Date("2026-08-20T00:00:00.000Z"), completedAt: new Date("2026-08-20T00:00:02.000Z"), generationProvider: "gemini_byok", fallbackUsed: 1, primaryFailureType: "quota_exhaustion", retryAttempts: 2, managedRetryAttempts: 0, geminiRetryAttempts: 2, cacheHit: 0, promptSourceChars: 24000, promptInputChars: 12000, providerInputTokens: 1200, providerOutputTokens: 450, providerCachedTokens: 600, providerTotalTokens: 1650, generationMode: "short", errorMessage: null, staffName: "Most recent teacher", staffEmail: "recent@example.com" }, { id: 99, status: "completed", createdAt: new Date("2026-08-19T00:00:00.000Z"), completedAt: new Date("2026-08-19T00:00:02.000Z"), generationProvider: "managed_llm", fallbackUsed: 0, primaryFailureType: null, retryAttempts: 0, managedRetryAttempts: 0, geminiRetryAttempts: 0, cacheHit: 0, promptSourceChars: 12000, promptInputChars: 9000, providerInputTokens: null, providerOutputTokens: null, providerCachedTokens: null, providerTotalTokens: null, generationMode: "mcq", errorMessage: null, staffName: "Earlier teacher", staffEmail: "earlier@example.com" }], isLoading: false, error: null }) },
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
  afterEach(() => { cleanup(); invalidate.mockReset(); getLargePdfUploadStatus.mockReset(); getPaperPatternSourceDownload.mockReset(); noOpMutation.mutateAsync.mockReset(); binaryChunkFetch.mockClear(); setPaperSourceStudentLibraryStatus.mutateAsync.mockReset(); window.sessionStorage.clear(); Object.defineProperty(document, "hidden", { configurable: true, value: false }); Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" }); queryOptions.listSets.length = 0; queryOptions.listProgrammes.length = 0; queryOptions.staffDirectory.length = 0; authMock.role = "admin"; window.history.pushState({}, "", "/"); });

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
    expect(screen.getByText(/Provider tokens — input: 1,200 · output: 450 · total: 1,650 · cache hits: 600/)).toBeTruthy();
    const recentEntry = screen.getByText(/Most recent teacher ·/);
    const earlierEntry = screen.getByText(/Earlier teacher ·/);
    expect(recentEntry.compareDocumentPosition(earlierEntry) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

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
    expect(screen.getByText("Choose a grade, then one subject")).toBeTruthy();
    expect(screen.getByText("Grade 9")).toBeTruthy();
    expect(screen.getByText("Grade 10")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /Add subject/i })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Textbook" })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Model paper" })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Past papers" })).toHaveLength(2);
    expect(screen.getByText(/PDF textbooks up to 150MB are accepted/i)).toBeTruthy();
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
    expect(screen.queryByText("Choose a grade, then one subject")).toBeNull();
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

  it("routes Grade 9 paper actions to separate model-paper and chronological past-paper workspaces", () => {
    render(<CurriculumManagement />);
    fireEvent.click(screen.getByRole("tab", { name: /^Curriculum/i }));

    fireEvent.click(screen.getAllByRole("button", { name: "Model paper" })[0]);
    expect(window.location.search).toContain("set=13");
    expect(window.location.search).toContain("panel=review");
    expect(window.location.search).toContain("task=pattern");
    expect(window.location.search).toContain("paper=model");

    cleanup();
    window.history.pushState({}, "", "/curriculum?panel=curriculum");
    render(<CurriculumManagement />);
    fireEvent.click(screen.getByRole("tab", { name: /^Curriculum/i }));
    fireEvent.click(screen.getAllByRole("button", { name: "Past papers" })[0]);
    expect(window.location.search).toContain("paper=past");
  });

  it("keeps signed student publication separate from Grade 10 paper-pattern activation and exposes the stored original PDF to Portal Admin", async () => {
    setPaperSourceStudentLibraryStatus.mutateAsync.mockResolvedValue({ id: 3, studentLibraryStatus: "published" });
    render(<CurriculumManagement />);

    fireEvent.click(screen.getByRole("tab", { name: /^Review/i }));
    fireEvent.click(screen.getByRole("tab", { name: "Paper pattern" }));

    expect(screen.getByRole("button", { name: "PDF" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Publish to students" }));
    await waitFor(() => expect(setPaperSourceStudentLibraryStatus.mutateAsync).toHaveBeenCalledWith({ sourceId: 3, studentLibraryStatus: "published" }));
    expect(invalidate).toHaveBeenCalledWith({ curriculumSetId: 1 });
  });

  it("resumes an existing Grade 9 Chemistry intake instead of attempting another programme insert", async () => {
    window.history.pushState({}, "", "/curriculum?grade=9&intake=subject");
    render(<CurriculumManagement />);

    fireEvent.change(screen.getByLabelText("Subject name"), { target: { value: "Chemistry" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue to textbook upload" }));

    expect(noOpMutation.mutateAsync).not.toHaveBeenCalled();
    expect(await screen.findByText("Upload the textbook")).toBeTruthy();
    expect(screen.getByText(/PDF textbooks up to 150MB are accepted/i)).toBeTruthy();
    expect(screen.getByText(/protected small chunks/i)).toBeTruthy();
    expect(screen.queryByText(/transfer directly without browser base64 conversion/i)).toBeNull();
  });

  it("shows a direct Grade 9 Chemistry continuation action before the add-subject form", async () => {
    window.history.pushState({}, "", "/curriculum?grade=9&intake=subject");
    render(<CurriculumManagement />);

    const continueChemistry = await screen.findByRole("button", { name: /Chemistry.*Continue textbook intake/i });
    fireEvent.click(continueChemistry);

    expect(await screen.findByText("Upload the textbook")).toBeTruthy();
    expect(noOpMutation.mutateAsync).not.toHaveBeenCalled();
  });

  it("shows only server-acknowledged chunk percentage, speed, and time remaining while a large Grade 9 textbook is uploading", async () => {
    window.history.pushState({}, "", "/curriculum?grade=9&intake=subject");
    const acknowledgements: Array<(value: ChunkAcknowledgement) => void> = [];
    let finishUpload!: (value: { id: number; extractedText: string; extractionStatus: "extracted" }) => void;
    const completion = new Promise<{ id: number; extractedText: string; extractionStatus: "extracted" }>((resolve) => { finishUpload = resolve; });
    noOpMutation.mutateAsync.mockImplementation((input: Record<string, unknown>) => {
      if ("fileSize" in input) return Promise.resolve({ uploadToken: "test-token", chunkBytes: Math.ceil(Number(input.fileSize) / 3) });
      if ("chunkIndex" in input) return new Promise((resolve) => { acknowledgements.push(resolve); });
      if ("uploadToken" in input) return completion;
      return Promise.resolve(undefined);
    });
    vi.spyOn(performance, "now").mockReturnValueOnce(100).mockReturnValueOnce(1100).mockReturnValueOnce(2100);
    render(<CurriculumManagement />);

    fireEvent.change(screen.getByLabelText("Subject name"), { target: { value: "Chemistry" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue to textbook upload" }));
    const file = largePdfFixture("grade-9-chemistry.pdf", (30 * 1024 * 1024) + 1);
    fireEvent.change(await screen.findByLabelText("Focused curriculum source upload"), { target: { files: [file] } });

    expect(await screen.findByTestId("chunk-upload-progress")).toBeTruthy();
    expect(screen.getByRole("progressbar", { name: "Textbook upload progress" }).getAttribute("aria-valuenow")).toBe("0");
    expect(screen.getByTestId("chunk-upload-percent").textContent).toBe("0%");
    expect(screen.getByTestId("chunk-upload-speed").textContent).toBe("Calculating…");
    expect(screen.getByTestId("chunk-upload-remaining").textContent).toBe("Calculating…");

    const chunkBytes = Math.ceil(file.size / 3);
    await waitFor(() => expect(acknowledgements).toHaveLength(1));
    await act(async () => { acknowledgements[0]({ receivedBytes: chunkBytes, fileSize: file.size, complete: false, acknowledgement: "committed", nextChunkIndex: 1, revision: 1, expiresAt: 9999999999999 }); });
    expect(screen.getByTestId("chunk-upload-speed").textContent).toBe("Calculating…");

    await waitFor(() => expect(acknowledgements).toHaveLength(2));
    await act(async () => { acknowledgements[1]({ receivedBytes: chunkBytes * 2, fileSize: file.size, complete: false, acknowledgement: "committed", nextChunkIndex: 2, revision: 2, expiresAt: 9999999999999 }); });
    expect(screen.getByTestId("chunk-upload-speed").textContent).toMatch(/MB\/s/);
    expect(screen.getByTestId("chunk-upload-remaining").textContent).toMatch(/Less than 5 seconds|About/);

    await waitFor(() => expect(acknowledgements).toHaveLength(3));
    await act(async () => { acknowledgements[2]({ receivedBytes: file.size, fileSize: file.size, complete: true, acknowledgement: "committed", nextChunkIndex: 3, revision: 3, expiresAt: 9999999999999 }); });
    expect(await screen.findByText("Final file check")).toBeTruthy();
    expect(screen.getByRole("progressbar", { name: "Textbook upload progress" }).getAttribute("aria-valuenow")).toBe("100");
    expect(screen.getByTestId("chunk-upload-percent").textContent).toBe("100%");
    expect(screen.getByTestId("chunk-upload-remaining").textContent).toBe("Checking final file");

    await act(async () => { finishUpload({ id: 20, extractedText: "Reviewed source text", extractionStatus: "extracted" }); });
  });

  it("pauses after the current acknowledged chunk and resumes the protected Grade 9 textbook upload", async () => {
    window.history.pushState({}, "", "/curriculum?grade=9&intake=subject");
    const acknowledgements: Array<(value: ChunkAcknowledgement) => void> = [];
    let finishUpload!: (value: { id: number; extractedText: string; extractionStatus: "extracted" }) => void;
    const completion = new Promise<{ id: number; extractedText: string; extractionStatus: "extracted" }>((resolve) => { finishUpload = resolve; });
    noOpMutation.mutateAsync.mockImplementation((input: Record<string, unknown>) => {
      if ("fileSize" in input) return Promise.resolve({ uploadToken: "test-token", chunkBytes: Math.ceil(Number(input.fileSize) / 2) });
      if ("chunkIndex" in input) return new Promise((resolve) => { acknowledgements.push(resolve); });
      if ("uploadToken" in input) return completion;
      return Promise.resolve(undefined);
    });
    render(<CurriculumManagement />);

    fireEvent.change(screen.getByLabelText("Subject name"), { target: { value: "Chemistry" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue to textbook upload" }));
    const file = largePdfFixture("grade-9-chemistry.pdf", (30 * 1024 * 1024) + 1);
    fireEvent.change(await screen.findByLabelText("Focused curriculum source upload"), { target: { files: [file] } });

    await waitFor(() => expect(acknowledgements).toHaveLength(1));
    fireEvent.click(screen.getByRole("button", { name: "Pause upload" }));
    expect(screen.getByText("Pause requested — finishing current chunk")).toBeTruthy();

    const chunkBytes = Math.ceil(file.size / 2);
    await act(async () => { acknowledgements[0]({ receivedBytes: chunkBytes, fileSize: file.size, complete: false, acknowledgement: "committed", nextChunkIndex: 1, revision: 1, expiresAt: 9999999999999 }); });
    expect(await screen.findByText("Upload paused")).toBeTruthy();
    expect(acknowledgements).toHaveLength(1);
    expect(screen.getByRole("progressbar", { name: "Textbook upload progress" }).getAttribute("aria-valuenow")).toBe("50");

    fireEvent.click(screen.getByRole("button", { name: "Resume upload" }));
    await waitFor(() => expect(acknowledgements).toHaveLength(2));
    await act(async () => { acknowledgements[1]({ receivedBytes: file.size, fileSize: file.size, complete: true, acknowledgement: "committed", nextChunkIndex: 2, revision: 2, expiresAt: 9999999999999 }); });
    await act(async () => { finishUpload({ id: 21, extractedText: "Reviewed source text", extractionStatus: "extracted" }); });
  });

  it("auto-pauses a protected upload while Chrome backgrounds the page and continues when it returns", async () => {
    window.history.pushState({}, "", "/curriculum?grade=9&intake=subject");
    const acknowledgements: Array<(value: ChunkAcknowledgement) => void> = [];
    let finishUpload!: (value: { id: number; extractedText: string; extractionStatus: "extracted" }) => void;
    const completion = new Promise<{ id: number; extractedText: string; extractionStatus: "extracted" }>((resolve) => { finishUpload = resolve; });
    noOpMutation.mutateAsync.mockImplementation((input: Record<string, unknown>) => {
      if ("fileSize" in input) return Promise.resolve({ uploadToken: "background-token", chunkBytes: Math.ceil(Number(input.fileSize) / 2), expiresAt: 9999999999999 });
      if ("chunkIndex" in input) return new Promise((resolve) => { acknowledgements.push(resolve); });
      if ("uploadToken" in input) return completion;
      return Promise.resolve(undefined);
    });
    render(<CurriculumManagement />);

    fireEvent.change(screen.getByLabelText("Subject name"), { target: { value: "Chemistry" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue to textbook upload" }));
    const file = largePdfFixture("grade-9-chemistry.pdf", (30 * 1024 * 1024) + 1);
    fireEvent.change(await screen.findByLabelText("Focused curriculum source upload"), { target: { files: [file] } });
    await waitFor(() => expect(acknowledgements).toHaveLength(1));

    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    await act(async () => { document.dispatchEvent(new Event("visibilitychange")); });
    const chunkBytes = Math.ceil(file.size / 2);
    await act(async () => { acknowledgements[0]({ receivedBytes: chunkBytes, fileSize: file.size, complete: false, acknowledgement: "committed", nextChunkIndex: 1, revision: 1, expiresAt: 9999999999999 }); });
    expect(await screen.findByText("Paused while Chrome is in the background")).toBeTruthy();
    expect(acknowledgements).toHaveLength(1);

    Object.defineProperty(document, "hidden", { configurable: true, value: false });
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
    await act(async () => { document.dispatchEvent(new Event("visibilitychange")); });
    await waitFor(() => expect(acknowledgements).toHaveLength(2));
    await act(async () => { acknowledgements[1]({ receivedBytes: file.size, fileSize: file.size, complete: true, acknowledgement: "committed", nextChunkIndex: 2, revision: 2, expiresAt: 9999999999999 }); });
    await act(async () => { finishUpload({ id: 23, extractedText: "Reviewed source text", extractionStatus: "extracted" }); });
  });

  it("shows saved-session guidance and continues a reselected PDF from the last server-acknowledged chunk", async () => {
    window.history.pushState({}, "", "/curriculum?grade=9&intake=subject");
    const fileSize = (30 * 1024 * 1024) + 1;
    const chunkBytes = 20 * 1024 * 1024;
    const file = largePdfFixture("grade-9-chemistry.pdf", fileSize, 1710000000000);
    window.sessionStorage.setItem("paramount-resumable-textbook-upload", JSON.stringify({ uploadToken: "saved-token", chunkBytes, curriculumSetId: grade9ChemistrySet.id, fileName: "grade-9-chemistry.pdf", fileSize, fileLastModified: file.lastModified, receivedBytes: chunkBytes, nextChunkIndex: 1, expiresAt: 9999999999999 }));
    getLargePdfUploadStatus.mockResolvedValue({ fileSize, receivedBytes: chunkBytes, nextChunkIndex: 1, revision: 1, complete: false, expiresAt: 9999999999999 });
    noOpMutation.mutateAsync.mockImplementation((input: Record<string, unknown>) => {
      if ("chunkIndex" in input) return Promise.resolve({ receivedBytes: fileSize, fileSize, complete: true, acknowledgement: "committed", nextChunkIndex: 2, revision: 2, expiresAt: 9999999999999 });
      if ("uploadToken" in input) return Promise.resolve({ id: 24, extractedText: "Reviewed source text", extractionStatus: "extracted" });
      return Promise.resolve(undefined);
    });
    render(<CurriculumManagement />);

    fireEvent.change(screen.getByLabelText("Subject name"), { target: { value: "Chemistry" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue to textbook upload" }));
    expect(await screen.findByTestId("saved-upload-resume-guidance")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Focused curriculum source upload"), { target: { files: [file] } });

    await waitFor(() => expect(getLargePdfUploadStatus).toHaveBeenCalledWith({ uploadToken: "saved-token" }));
    await waitFor(() => expect(noOpMutation.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ uploadToken: "saved-token", chunkIndex: 1 })));
    expect(noOpMutation.mutateAsync).not.toHaveBeenCalledWith(expect.objectContaining({ curriculumSetId: grade9ChemistrySet.id, fileSize }));
  });

  it("lists an incomplete textbook transfer in Drafts, resumes its existing Chemistry intake, and clears only the local session", async () => {
    const fileSize = (30 * 1024 * 1024) + 1;
    window.sessionStorage.setItem("paramount-resumable-textbook-upload", JSON.stringify({ uploadToken: "drafts-token", chunkBytes: 10 * 1024 * 1024, curriculumSetId: grade9ChemistrySet.id, fileName: "grade-9-chemistry.pdf", fileSize, fileLastModified: 1710000000000, receivedBytes: 10 * 1024 * 1024, nextChunkIndex: 1, expiresAt: 9999999999999 }));
    window.history.pushState({}, "", "/curriculum?panel=drafts");
    render(<CurriculumManagement />);

    expect(await screen.findByTestId("incomplete-textbook-upload-draft")).toBeTruthy();
    expect(screen.getByText("grade-9-chemistry.pdf")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Clear unfinished session" }));
    expect(await screen.findByRole("alertdialog")).toBeTruthy();
    expect(screen.getByText("Remove this unfinished upload?")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Keep upload" }));
    expect(window.sessionStorage.getItem("paramount-resumable-textbook-upload")).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Clear unfinished session" }));
    fireEvent.click(await screen.findByRole("button", { name: "Remove unfinished upload" }));
    expect(window.sessionStorage.getItem("paramount-resumable-textbook-upload")).toBeNull();
    expect(await screen.findByText("No unfinished textbook uploads on this browser.")).toBeTruthy();
    expect(noOpMutation.mutateAsync).not.toHaveBeenCalled();

    cleanup();
    window.sessionStorage.setItem("paramount-resumable-textbook-upload", JSON.stringify({ uploadToken: "drafts-token", chunkBytes: 10 * 1024 * 1024, curriculumSetId: grade9ChemistrySet.id, fileName: "grade-9-chemistry.pdf", fileSize, fileLastModified: 1710000000000, receivedBytes: 10 * 1024 * 1024, nextChunkIndex: 1, expiresAt: 9999999999999 }));
    window.history.pushState({}, "", "/curriculum?panel=drafts");
    render(<CurriculumManagement />);
    fireEvent.click(await screen.findByRole("button", { name: "Resume upload" }));
    expect(await screen.findByText("Upload the textbook")).toBeTruthy();
    expect(noOpMutation.mutateAsync).not.toHaveBeenCalled();
  });

  it("offers a safe fresh-session recovery inside the existing Grade 9 Chemistry draft when a stale upload cannot be reconciled", async () => {
    window.history.pushState({}, "", "/curriculum?grade=9&intake=subject");
    const fileSize = (30 * 1024 * 1024) + 1;
    const file = largePdfFixture("grade-9-chemistry.pdf", fileSize, 1710000000000);
    window.sessionStorage.setItem("paramount-resumable-textbook-upload", JSON.stringify({ uploadToken: "stale-token", chunkBytes: fileSize, curriculumSetId: grade9ChemistrySet.id, fileName: file.name, fileSize, fileLastModified: file.lastModified, receivedBytes: 0, nextChunkIndex: 0, expiresAt: 9999999999999 }));
    getLargePdfUploadStatus.mockResolvedValue({ fileSize, receivedBytes: 0, nextChunkIndex: 0, complete: false, expiresAt: 9999999999999 });
    noOpMutation.mutateAsync.mockImplementation((input: Record<string, unknown>) => {
      if ("fileSize" in input) return Promise.resolve({ uploadToken: "fresh-token", chunkBytes: fileSize, expiresAt: 9999999999999 });
      if ("chunkIndex" in input && input.uploadToken === "stale-token") return Promise.reject(new Error("This textbook chunk arrived out of order. Restart the upload so no pages are lost."));
      if ("chunkIndex" in input && input.uploadToken === "fresh-token") return Promise.resolve({ receivedBytes: fileSize, fileSize, complete: true, acknowledgement: "committed", nextChunkIndex: 1, expiresAt: 9999999999999 });
      if ("uploadToken" in input) return Promise.resolve({ id: 25, extractedText: "Reviewed source text", extractionStatus: "extracted" });
      return Promise.resolve(undefined);
    });
    render(<CurriculumManagement />);

    fireEvent.change(screen.getByLabelText("Subject name"), { target: { value: "Chemistry" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue to textbook upload" }));
    fireEvent.change(await screen.findByLabelText("Focused curriculum source upload"), { target: { files: [file] } });

    expect(await screen.findByTestId("textbook-upload-recovery")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Retry safely" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Start a fresh upload" }));
    await waitFor(() => expect(noOpMutation.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ curriculumSetId: grade9ChemistrySet.id, fileName: file.name, fileSize })));
    expect(noOpMutation.mutateAsync).not.toHaveBeenCalledWith(expect.objectContaining({ subject: "chemistry", teacherLabel: "Chemistry" }));
  });

  it("shows safe upload recovery after a chunk conflict without retrying an unverified send", async () => {
    window.history.pushState({}, "", "/curriculum?grade=9&intake=subject");
    const fileSize = (30 * 1024 * 1024) + 1;
    const file = largePdfFixture("grade-9-chemistry.pdf", fileSize);
    let appendAttempts = 0;
    getLargePdfUploadStatus.mockResolvedValue({ fileSize, receivedBytes: 0, nextChunkIndex: 0, complete: false, expiresAt: 9999999999999 });
    noOpMutation.mutateAsync.mockImplementation((input: Record<string, unknown>) => {
      if ("fileSize" in input) return Promise.resolve({ uploadToken: "automatic-retry-token", chunkBytes: fileSize, expiresAt: 9999999999999 });
      if ("chunkIndex" in input) {
        appendAttempts += 1;
        return appendAttempts === 1
          ? Promise.reject(new Error("This textbook chunk arrived out of order. Restart the upload so no pages are lost."))
          : Promise.resolve({ receivedBytes: fileSize, fileSize, complete: true, acknowledgement: "committed", nextChunkIndex: 1, expiresAt: 9999999999999 });
      }
      if ("uploadToken" in input) return Promise.resolve({ id: 26, extractedText: "Reviewed source text", extractionStatus: "extracted" });
      return Promise.resolve(undefined);
    });
    render(<CurriculumManagement />);

    fireEvent.click(await screen.findByRole("button", { name: /Chemistry.*Continue textbook intake/i }));
    fireEvent.change(await screen.findByLabelText("Focused curriculum source upload"), { target: { files: [file] } });

    await waitFor(() => expect(appendAttempts).toBe(1));
    expect(await screen.findByTestId("textbook-upload-recovery")).toBeTruthy();
  });

  it("shows drag feedback and routes a dropped textbook through the same secure intake handler", async () => {
    window.history.pushState({}, "", "/curriculum?grade=9&intake=subject");
    noOpMutation.mutateAsync.mockResolvedValue({ id: 22, extractedText: "Reviewed source text", extractionStatus: "extracted" });
    render(<CurriculumManagement />);

    fireEvent.change(screen.getByLabelText("Subject name"), { target: { value: "Chemistry" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue to textbook upload" }));
    const dropZone = await screen.findByTestId("textbook-upload-drop-zone");
    const file = new File(["Grade 9 Chemistry source"], "grade-9-chemistry.txt", { type: "text/plain" });

    fireEvent.dragOver(dropZone, { dataTransfer: { files: [file] } });
    expect(screen.getByText("Drop the textbook to start secure upload")).toBeTruthy();
    fireEvent.dragLeave(dropZone, { dataTransfer: { files: [file] } });
    expect(screen.getByText("Drag a textbook here or choose a file")).toBeTruthy();

    fireEvent.drop(dropZone, { dataTransfer: { files: [file] } });
    await waitFor(() => expect(noOpMutation.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({
      curriculumSetId: grade9ChemistrySet.id,
      fileName: "grade-9-chemistry.txt",
      mimeType: "text/plain",
    })));
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

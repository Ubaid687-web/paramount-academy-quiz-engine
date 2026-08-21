import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createReplacementCurriculumSet: vi.fn(),
  activateAssessmentPatternSource: vi.fn(),
  getAssessmentPatternSource: vi.fn(),
  saveAssessmentPatternProfile: vi.fn(),
  createProgrammeCatalogue: vi.fn(),
  getProgrammeCatalogue: vi.fn(),
  createCurriculumSet: vi.fn(),
  createAssessmentPatternSource: vi.fn(),
  activateProgrammeCatalogue: vi.fn(),
  getCurriculumSet: vi.fn(),
  getCurriculumSource: vi.fn(),
  activateCurriculumSet: vi.fn(),
  markCurriculumSourcePageReviewed: vi.fn(),
  getCurriculumChapter: vi.fn(),
  listCurriculumSourcePageReviews: vi.fn(),
  setCurriculumChapterGenerationAvailability: vi.fn(),
  saveCorrectedCurriculumSourcePage: vi.fn(),
  proposeChaptersFromExtractedText: vi.fn(),
}));

vi.mock("./db", () => ({
  createReplacementCurriculumSet: mocks.createReplacementCurriculumSet,
  activateAssessmentPatternSource: mocks.activateAssessmentPatternSource,
  getAssessmentPatternSource: mocks.getAssessmentPatternSource,
  saveAssessmentPatternProfile: mocks.saveAssessmentPatternProfile,
  createProgrammeCatalogue: mocks.createProgrammeCatalogue,
  getProgrammeCatalogue: mocks.getProgrammeCatalogue,
  createCurriculumSet: mocks.createCurriculumSet,
  createAssessmentPatternSource: mocks.createAssessmentPatternSource,
  activateProgrammeCatalogue: mocks.activateProgrammeCatalogue,
  getCurriculumSet: mocks.getCurriculumSet,
  getCurriculumSource: mocks.getCurriculumSource,
  activateCurriculumSet: mocks.activateCurriculumSet,
  markCurriculumSourcePageReviewed: mocks.markCurriculumSourcePageReviewed,
  getCurriculumChapter: mocks.getCurriculumChapter,
  listCurriculumSourcePageReviews: mocks.listCurriculumSourcePageReviews,
  setCurriculumChapterGenerationAvailability: mocks.setCurriculumChapterGenerationAvailability,
  saveCorrectedCurriculumSourcePage: mocks.saveCorrectedCurriculumSourcePage,
}));

vi.mock("./chapterProposal", () => ({ proposeChaptersFromExtractedText: mocks.proposeChaptersFromExtractedText }));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createContext(role: "admin" | "user"): TrpcContext {
  return {
    user: { id: 77, openId: `lifecycle-${role}`, name: "Lifecycle User", email: "lifecycle@example.com", loginMethod: "manus", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("curriculum lifecycle administration", () => {
  it("proposes chapter boundaries only from the selected extracted textbook source", async () => {
    mocks.getCurriculumSet.mockResolvedValue({ id: 901, status: "draft" });
    mocks.getCurriculumSource.mockResolvedValue({ id: 41, curriculumSetId: 901, originalFileName: "new-edition.pdf", extractionStatus: "extracted", extractedText: "CHAPTER 1: TEST\n".padEnd(600, "source text ") });
    mocks.proposeChaptersFromExtractedText.mockReturnValue([{ sequence: 1, code: "Ch. 1", title: "TEST", contentText: "CHAPTER 1: TEST\nReviewed source text." }]);
    const caller = appRouter.createCaller(createContext("admin"));

    await expect(caller.curriculum.proposeChaptersFromSource({ curriculumSetId: 901, sourceId: 41 })).resolves.toMatchObject({ sourceId: 41, originalFileName: "new-edition.pdf", proposals: [{ title: "TEST" }] });
    expect(mocks.proposeChaptersFromExtractedText).toHaveBeenCalledWith(expect.stringContaining("CHAPTER 1: TEST"));
  });

  it("blocks chapter proposals from an unextracted or unrelated source", async () => {
    mocks.getCurriculumSet.mockResolvedValue({ id: 901, status: "draft" });
    mocks.getCurriculumSource.mockResolvedValue({ id: 42, curriculumSetId: 902, extractionStatus: "extracted", extractedText: "CHAPTER 1: OTHER\n".padEnd(600, "source text ") });
    const caller = appRouter.createCaller(createContext("admin"));
    await expect(caller.curriculum.proposeChaptersFromSource({ curriculumSetId: 901, sourceId: 42 })).rejects.toThrow("does not belong to this draft edition");
  });

  it("creates new programme combinations as controlled intake-only records through Portal Admin", async () => {
    mocks.createProgrammeCatalogue.mockResolvedValue({ id: 71, board: "FBISE", grade: "9", subject: "physics", teacherLabel: "Physics", status: "intake_only" });
    const caller = appRouter.createCaller(createContext("admin"));

    await expect(caller.curriculum.createProgramme({ board: "FBISE", grade: "9", subject: "physics", teacherLabel: "Physics" })).resolves.toMatchObject({ id: 71, status: "intake_only" });
    expect(mocks.createProgrammeCatalogue).toHaveBeenCalledWith({ board: "FBISE", grade: "9", subject: "physics", teacherLabel: "Physics", createdBy: 77 });
  });

  it("returns an existing Grade 9 intake record instead of leaking a duplicate database insert error", async () => {
    mocks.createProgrammeCatalogue.mockResolvedValue({ id: 81, board: "FBISE", grade: "9", subject: "chemistry", teacherLabel: "Chemistry", status: "intake_only" });
    const caller = appRouter.createCaller(createContext("admin"));

    await expect(caller.curriculum.createProgramme({ board: "FBISE", grade: "9", subject: "chemistry", teacherLabel: "Chemistry" })).resolves.toMatchObject({
      id: 81,
      status: "intake_only",
      subject: "chemistry",
    });
  });

  it("normalizes programme identity at the Portal Admin boundary instead of allowing case or whitespace variants", async () => {
    mocks.createProgrammeCatalogue.mockResolvedValue({ id: 82, board: "FBISE", grade: "9", subject: "computer_science", teacherLabel: "Computer Science", status: "intake_only" });
    const caller = appRouter.createCaller(createContext("admin"));

    await caller.curriculum.createProgramme({ board: " fbise ", grade: "9", subject: "Computer   Science", teacherLabel: "Computer Science" });
    expect(mocks.createProgrammeCatalogue).toHaveBeenCalledWith({ board: "FBISE", grade: "9", subject: "computer_science", teacherLabel: "Computer Science", createdBy: 77 });
  });

  it("rejects a curriculum replacement relationship that crosses grade or subject boundaries", async () => {
    mocks.getProgrammeCatalogue.mockResolvedValue({ id: 71, board: "FBISE", grade: "9", subject: "physics" });
    mocks.getCurriculumSet.mockResolvedValue({ id: 901, board: "FBISE", grade: "10", subject: "physics" });
    const caller = appRouter.createCaller(createContext("admin"));

    await expect(caller.curriculum.createSet({ programmeId: 71, label: "Grade 9 Physics", replacesSetId: 901 })).rejects.toThrow("same board, grade, and subject");
    expect(mocks.createCurriculumSet).not.toHaveBeenCalled();
  });

  it("requires strict file evidence and a chronological number before accepting a past-paper reference", async () => {
    const caller = appRouter.createCaller(createContext("admin"));
    await expect(caller.curriculum.ingestPaperPatternSource({
      programmeId: 71,
      sourceKind: "past_paper",
      academicYear: "2026",
      fileName: "annual.pdf",
      mimeType: "application/pdf",
      fileBuffer: Buffer.from("not a PDF").toString("base64"),
    })).rejects.toThrow("timeline number");

    await expect(caller.curriculum.ingestPaperPatternSource({
      programmeId: 71,
      sourceKind: "past_paper",
      academicYear: "2026",
      timelineOrder: 1,
      fileName: "annual.pdf",
      mimeType: "application/pdf",
      fileBuffer: Buffer.from("not a PDF").toString("base64"),
    })).rejects.toThrow("does not match the selected PDF format");
  });

  it("does not allow a non-admin to activate a programme", async () => {
    const caller = appRouter.createCaller(createContext("user"));
    await expect(caller.curriculum.activateProgramme({ programmeId: 71 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.activateProgrammeCatalogue).not.toHaveBeenCalled();
  });

  it("surfaces the active-edition readiness block instead of activating a programme automatically", async () => {
    mocks.activateProgrammeCatalogue.mockRejectedValue(new Error("Activate a reviewed curriculum edition for this programme before making it available to teachers."));
    const caller = appRouter.createCaller(createContext("admin"));
    await expect(caller.curriculum.activateProgramme({ programmeId: 71 })).rejects.toThrow("Activate a reviewed curriculum edition");
  });

  it("creates a linked draft replacement only through Portal Admin", async () => {
    mocks.createReplacementCurriculumSet.mockResolvedValue({ id: 901, status: "draft", replacesSetId: 60001 });
    const caller = appRouter.createCaller(createContext("admin"));

    await expect(caller.curriculum.replaceActiveSet({ currentSetId: 60001, label: "FBISE Physics replacement", editionLabel: "2027 edition" })).resolves.toMatchObject({ id: 901, status: "draft" });
    expect(mocks.createReplacementCurriculumSet).toHaveBeenCalledWith(60001, { label: "FBISE Physics replacement", editionLabel: "2027 edition", createdBy: 77 });
  });

  it("keeps paper-pattern activation restricted to Portal Admin", async () => {
    const caller = appRouter.createCaller(createContext("user"));
    await expect(caller.curriculum.activatePaperPatternSource({ sourceId: 41 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.activateAssessmentPatternSource).not.toHaveBeenCalled();
  });

  it("surfaces the weak-OCR-page activation block without bypassing the review safeguard", async () => {
    mocks.activateCurriculumSet.mockRejectedValue(new Error("Review 2 weak OCR pages before activating this curriculum edition."));
    const caller = appRouter.createCaller(createContext("admin"));

    await expect(caller.curriculum.activateSet({ curriculumSetId: 901 })).rejects.toThrow("Review 2 weak OCR pages");
  });

  it("allows an administrator to mark only a source-bound OCR page as reviewed", async () => {
    mocks.getCurriculumSource.mockResolvedValue({ id: 41, curriculumSetId: 901 });
    mocks.markCurriculumSourcePageReviewed.mockResolvedValue({ sourceId: 41, pageNumber: 7, reviewStatus: "reviewed" });
    const caller = appRouter.createCaller(createContext("admin"));

    await expect(caller.curriculum.reviewSourcePage({ curriculumSetId: 901, sourceId: 41, pageNumber: 7 })).resolves.toMatchObject({ reviewStatus: "reviewed" });
    expect(mocks.markCurriculumSourcePageReviewed).toHaveBeenCalledWith(41, 7, 77);
  });

  it("allows Portal Admin to exclude a chapter, but prevents restoring it while an OCR page inside its range remains unresolved", async () => {
    mocks.getCurriculumChapter.mockResolvedValue({ id: 90004, curriculumSetId: 120001, sourceId: 90001, title: "Electrochemistry", startPage: 46, endPage: 63 });
    mocks.setCurriculumChapterGenerationAvailability.mockResolvedValue({ id: 90004, isActive: 0, title: "Electrochemistry" });
    const admin = appRouter.createCaller(createContext("admin"));

    await expect(admin.curriculum.setChapterGenerationAvailability({ curriculumSetId: 120001, chapterId: 90004, isActive: false })).resolves.toMatchObject({ isActive: 0 });
    expect(mocks.setCurriculumChapterGenerationAvailability).toHaveBeenCalledWith({ curriculumSetId: 120001, chapterId: 90004, isActive: 0 });

    mocks.listCurriculumSourcePageReviews.mockResolvedValue([{ sourceId: 90001, pageNumber: 56, reviewStatus: "needs_review" }]);
    await expect(admin.curriculum.setChapterGenerationAvailability({ curriculumSetId: 120001, chapterId: 90004, isActive: true })).rejects.toThrow("Page 56 still needs OCR review");
  });

  it("keeps chapter exclusion controls unavailable to ordinary users", async () => {
    const caller = appRouter.createCaller(createContext("user"));
    await expect(caller.curriculum.setChapterGenerationAvailability({ curriculumSetId: 120001, chapterId: 90004, isActive: false })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("saves an exact page correction as reviewed without restoring any excluded chapter", async () => {
    mocks.setCurriculumChapterGenerationAvailability.mockReset();
    mocks.getCurriculumSource.mockResolvedValue({ id: 90001, curriculumSetId: 120001, extractedText: "[OCR page 56]\nUnreadable table" });
    mocks.saveCorrectedCurriculumSourcePage.mockResolvedValue({ pageReview: { sourceId: 90001, pageNumber: 56, reviewStatus: "reviewed" }, updatedChapterIds: [90004] });
    const caller = appRouter.createCaller(createContext("admin"));

    await expect(caller.curriculum.correctOcrReviewPage({ curriculumSetId: 120001, sourceId: 90001, pageNumber: 56, correctedText: "Li+ + e- -> Li | -3.05" })).resolves.toMatchObject({ pageNumber: 56, automaticallyRestoredForGeneration: false, updatedChapterIds: [90004] });
    expect(mocks.saveCorrectedCurriculumSourcePage).toHaveBeenCalledWith(expect.objectContaining({ sourceId: 90001, pageNumber: 56, correctedText: "Li+ + e- -> Li | -3.05", reviewedBy: 77 }));
    expect(mocks.setCurriculumChapterGenerationAvailability).not.toHaveBeenCalled();
  });

  it("records a reviewed profile only for an extracted supplied paper and stamps the admin reviewer", async () => {
    mocks.getAssessmentPatternSource.mockResolvedValue({ id: 41, extractionStatus: "extracted", extractedText: "Verified supplied paper text" });
    mocks.saveAssessmentPatternProfile.mockResolvedValue({ id: 12, patternSourceId: 41, reviewStatus: "reviewed" });
    const caller = appRouter.createCaller(createContext("admin"));

    await expect(caller.curriculum.savePaperPatternProfile({
      patternSourceId: 41, mcqCount: 12, mcqMarksEach: 1, totalMarks: 60, durationMinutes: 180,
      profileEvidenceNotes: "Page 1 confirms the Section A MCQ count and marks.", reviewStatus: "reviewed",
    })).resolves.toMatchObject({ id: 12, reviewStatus: "reviewed" });

    expect(mocks.saveAssessmentPatternProfile).toHaveBeenCalledWith(expect.objectContaining({
      patternSourceId: 41, reviewStatus: "reviewed", reviewedBy: 77, reviewedAt: expect.any(Date), mcqCount: 12,
    }));
  });
});

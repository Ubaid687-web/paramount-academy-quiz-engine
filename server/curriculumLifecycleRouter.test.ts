import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createReplacementCurriculumSet: vi.fn(),
  activateAssessmentPatternSource: vi.fn(),
  getAssessmentPatternSource: vi.fn(),
  saveAssessmentPatternProfile: vi.fn(),
  createProgrammeCatalogue: vi.fn(),
  activateProgrammeCatalogue: vi.fn(),
  getCurriculumSet: vi.fn(),
  getCurriculumSource: vi.fn(),
  proposeChaptersFromExtractedText: vi.fn(),
  getProgrammeEvidenceRecord: vi.fn(),
  updateProgrammeEvidenceRecordStatus: vi.fn(),
}));

vi.mock("./db", () => ({
  createReplacementCurriculumSet: mocks.createReplacementCurriculumSet,
  activateAssessmentPatternSource: mocks.activateAssessmentPatternSource,
  getAssessmentPatternSource: mocks.getAssessmentPatternSource,
  saveAssessmentPatternProfile: mocks.saveAssessmentPatternProfile,
  createProgrammeCatalogue: mocks.createProgrammeCatalogue,
  activateProgrammeCatalogue: mocks.activateProgrammeCatalogue,
  getCurriculumSet: mocks.getCurriculumSet,
  getCurriculumSource: mocks.getCurriculumSource,
  getProgrammeEvidenceRecord: mocks.getProgrammeEvidenceRecord,
  updateProgrammeEvidenceRecordStatus: mocks.updateProgrammeEvidenceRecordStatus,
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

  it("keeps analysis and practical reference evidence inside its selected programme", async () => {
    mocks.getProgrammeEvidenceRecord.mockResolvedValue({ id: 81, programmeId: 11, evidenceKind: "analysis_reference", status: "draft" });
    mocks.updateProgrammeEvidenceRecordStatus.mockResolvedValue({ id: 81, programmeId: 11, status: "reviewed" });
    const caller = appRouter.createCaller(createContext("admin"));

    await expect(caller.curriculum.reviewProgrammeEvidence({ programmeId: 12, recordId: 81, status: "reviewed" })).rejects.toThrow("does not belong to the selected programme");
    await expect(caller.curriculum.reviewProgrammeEvidence({ programmeId: 11, recordId: 81, status: "reviewed" })).resolves.toMatchObject({ id: 81, status: "reviewed" });
    expect(mocks.updateProgrammeEvidenceRecordStatus).toHaveBeenCalledWith(81, "reviewed", 77);
  });
});

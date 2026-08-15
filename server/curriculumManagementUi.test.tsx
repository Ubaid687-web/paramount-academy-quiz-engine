import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import CurriculumManagement from "../client/src/pages/CurriculumManagement";

const noOpMutation = { mutateAsync: vi.fn(), isPending: false };
const invalidate = vi.fn();

const managementDetails = {
  curriculumSet: { id: 1, board: "FBISE", grade: "10", subject: "physics", label: "FBISE Grade 10 Physics", editionLabel: "2026 edition", status: "draft" },
  sources: [{ id: 2, originalFileName: "physics.pdf", extractionStatus: "extracted", extractedText: "Approved textbook text", pageCount: 200 }],
  paperPatternSources: [{ id: 3, originalFileName: "physics-2025.pdf", sourceKind: "past_paper", academicYear: "2025", extractionStatus: "extracted", status: "draft" }],
  paperPatternProfiles: [{ patternSourceId: 3, sectionAInstruction: "Attempt all MCQs.", sectionBInstruction: null, sectionCInstruction: null, mcqCount: 12, mcqMarksEach: 1, shortOrPairCount: null, shortMarksEach: null, longOrPairCount: null, longMarksEach: null, totalMarks: 60, durationMinutes: 180, orRule: null, profileEvidenceNotes: "Page 1 confirms the MCQ section.", reviewStatus: "reviewed" }],
  programmeEvidenceRecords: [{ id: 8, programmeId: 11, evidenceKind: "analysis_reference", academicYear: "2026", originalFileName: "physics-analysis.pdf", extractionStatus: "extracted", status: "draft", evidenceNotes: "Pattern analysis only." }],
  chapters: [{ id: 4, code: "Ch. 1", title: "Motion", contentText: "A reviewed source chapter containing sufficient source content for the management interface." }],
  chapterSegments: [],
  scopeTemplates: [],
  readiness: { sourceStored: true, sourceExtracted: true, reviewedActiveChapters: 1, patternSourcesExtracted: 1, patternProfilesReviewed: 1, referenceEvidenceReviewed: 0 },
};

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ curriculum: { listSets: { invalidate }, listProgrammes: { invalidate }, getManagementDetails: { invalidate } } }),
    curriculum: {
      listSets: { useQuery: () => ({ data: [managementDetails.curriculumSet], isLoading: false, error: null }) },
      listProgrammes: { useQuery: () => ({ data: [{ id: 11, board: "FBISE", grade: "10", subject: "physics", teacherLabel: "Physics", status: "ready" }], isLoading: false, error: null }) },
      getManagementDetails: { useQuery: () => ({ data: managementDetails, isLoading: false }) },
      proposeChaptersFromSource: { useQuery: () => ({ data: undefined, isLoading: false, isFetching: false, error: null, refetch: vi.fn() }) },
      createProgramme: { useMutation: () => noOpMutation }, activateProgramme: { useMutation: () => noOpMutation }, createSet: { useMutation: () => noOpMutation }, replaceActiveSet: { useMutation: () => noOpMutation }, ingestSource: { useMutation: () => noOpMutation }, ingestPaperPatternSource: { useMutation: () => noOpMutation }, ingestProgrammeEvidence: { useMutation: () => noOpMutation }, reviewProgrammeEvidence: { useMutation: () => noOpMutation }, activatePaperPatternSource: { useMutation: () => noOpMutation }, savePaperPatternProfile: { useMutation: () => noOpMutation }, createChapter: { useMutation: () => noOpMutation }, saveHalfChapterSegments: { useMutation: () => noOpMutation }, createScopeTemplate: { useMutation: () => noOpMutation }, activateSet: { useMutation: () => noOpMutation },
    },
  },
}));

vi.mock("@/components/AcademyShell", () => ({ AcademyShell: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe("Curriculum Library Release 1", () => {
  afterEach(() => { cleanup(); invalidate.mockReset(); });

  it("shows evidence-based edition readiness and the linked reviewed paper-pattern profile", () => {
    render(<CurriculumManagement />);

    expect(screen.getByText("Edition readiness checklist")).toBeTruthy();
    expect(screen.getByText("Textbook extraction completed")).toBeTruthy();
    expect(screen.getByText("At least one reviewed active chapter")).toBeTruthy();
    expect(screen.getByText("Pattern profile reviewed (optional for book activation)")).toBeTruthy();
    expect(screen.getByText("Review Paper-Pattern Profile")).toBeTruthy();
    expect(screen.getByText("Physics evidence workspace")).toBeTruthy();
    expect(screen.getByText("Analysis and Practical References")).toBeTruthy();
    expect(screen.getByText("physics-analysis.pdf")).toBeTruthy();
    expect((screen.getByLabelText("MCQ count") as HTMLInputElement).value).toBe("12");
    expect(screen.getByDisplayValue("Page 1 confirms the MCQ section.")).toBeTruthy();
  });
});

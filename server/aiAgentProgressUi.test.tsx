import "@testing-library/jest-dom/vitest";
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AIAgent from "../client/src/pages/AIAgent";

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(globalThis, "ResizeObserver", {
  writable: true,
  value: ResizeObserverMock,
});

Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
  writable: true,
  value: vi.fn(),
});

const generateMutation = vi.fn();
const saveMutation = vi.fn();
const saveAssessmentDraftMutation = vi.fn();
const reviseAssessmentDraftMutation = vi.fn();
const loadAssessmentDraftQuery = vi.fn((_input: { assessmentDraftId: number }) => ({ data: undefined as any, isFetching: false }));
const pdfExtractMutation = vi.fn();
const scopeCatalogQuery = vi.fn((..._args: unknown[]) => ({ data: null as any, isLoading: false }));
const assessmentAvailabilityQuery = vi.fn((..._args: unknown[]) => ({ data: undefined as any, isLoading: false }));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    pdfUpload: {
      extractPdfText: { useMutation: () => ({ mutateAsync: pdfExtractMutation }) },
    },
    aiAgent: {
      generateMCQs: { useMutation: () => ({ mutateAsync: generateMutation }) },
      saveGeneratedQuiz: { useMutation: () => ({ mutateAsync: saveMutation, isPending: false }) },
      getGenerationStatus: { useQuery: () => ({ data: undefined }) },
    },
    curriculum: {
      getActiveScopeCatalog: { useQuery: () => scopeCatalogQuery() },
    },
    assessment: {
      getAvailability: { useQuery: () => assessmentAvailabilityQuery() },
      saveDraft: { useMutation: () => ({ mutateAsync: saveAssessmentDraftMutation, isPending: false }) },
      reviseDraft: { useMutation: () => ({ mutateAsync: reviseAssessmentDraftMutation, isPending: false }) },
      getDraft: { useQuery: (input: { assessmentDraftId: number }) => loadAssessmentDraftQuery(input) },
    },
  },
}));

vi.mock("wouter", () => ({
  useLocation: () => ["/ai-agent", vi.fn()],
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => <a href={href} {...props}>{children}</a>,
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

describe("AI quiz generation feedback", () => {
  afterEach(() => {
    cleanup();
    generateMutation.mockReset();
    saveMutation.mockReset();
    saveAssessmentDraftMutation.mockReset();
    reviseAssessmentDraftMutation.mockReset();
    loadAssessmentDraftQuery.mockReset();
    loadAssessmentDraftQuery.mockReturnValue({ data: undefined, isFetching: false });
    pdfExtractMutation.mockReset();
    scopeCatalogQuery.mockReset();
    scopeCatalogQuery.mockReturnValue({ data: null, isLoading: false });
    assessmentAvailabilityQuery.mockReset();
    assessmentAvailabilityQuery.mockReturnValue({ data: undefined, isLoading: false });
  });

  it("shows an accessible staged loading panel while the quiz request is in progress", async () => {
    generateMutation.mockImplementation(() => new Promise(() => undefined));
    render(<AIAgent />);

    fireEvent.change(screen.getByLabelText("Or Paste Content"), {
      target: { value: "This is sufficient study content for an AI quiz generation request.".repeat(3) },
    });
    fireEvent.change(screen.getByLabelText("Quiz Title"), { target: { value: "Physics revision" } });
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "10" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate MCQs" }));

    const progressbar = await screen.findByRole("progressbar", { name: "Quiz generation progress" });
    expect(progressbar).toHaveAttribute("aria-valuemin", "0");
    expect(progressbar).toHaveAttribute("aria-valuemax", "100");
    expect(progressbar).toHaveAttribute("aria-valuenow", "8");
    expect(screen.getByText("Preparing your quiz request")).toBeVisible();
    expect(screen.getByText("Checking your selected content and settings.")).toBeVisible();
  });

  it("removes the loading panel and presents the generated-quiz preview after completion", async () => {
    generateMutation.mockResolvedValue({
      jobId: 73,
      mcqs: [
        {
          question: "Which quantity measures rate of change of velocity?",
          options: { A: "Speed", B: "Acceleration", C: "Momentum", D: "Displacement" },
          answer: "B",
          explanation: "Acceleration is the rate of change of velocity.",
          difficulty: "medium",
          sourceReference: "Kinematics: acceleration",
          learningObjective: "Apply the definition of acceleration.",
        },
      ],
      analysis: { totalWords: 150, complexity: "moderate", recommendedQuestions: { minimum: 5, optimal: 10, maximum: 20 } },
      draft: {
        quiz: { instructions: "Review every question before use." },
        qualityChecks: { reviewWarnings: ["Faculty review is required before publication."] },
      },
    });
    render(<AIAgent />);

    fireEvent.change(screen.getByLabelText("Or Paste Content"), {
      target: { value: "This is sufficient study content for a successful AI quiz generation request.".repeat(3) },
    });
    fireEvent.change(screen.getByLabelText("Quiz Title"), { target: { value: "Physics revision" } });
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "10" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate MCQs" }));

    await waitFor(() => {
      expect(screen.getByText("Generated MCQ Draft (1)")).toBeVisible();
    });

    expect(screen.queryByRole("progressbar", { name: "Quiz generation progress" })).not.toBeInTheDocument();
    expect(screen.getByText("Admin review required before assignment or publication")).toBeVisible();
    expect(screen.getByText(/Which quantity measures rate of change of velocity/)).toBeVisible();
    expect(screen.getByText(/Kinematics: acceleration/)).toBeVisible();
  });

  it("automatically analyzes supplied content and exposes one adjustable question-count control", async () => {
    render(<AIAgent />);

    fireEvent.change(screen.getByLabelText("Or Paste Content"), {
      target: { value: "Kinematics explains motion using displacement, velocity, and acceleration. ".repeat(40) },
    });

    await screen.findByText("Content Analysis");
    expect(screen.queryByRole("button", { name: /analyze content/i })).not.toBeInTheDocument();
    expect(await screen.findByRole("slider", { name: "Number of questions" })).toBeVisible();
    expect(screen.getAllByText(/Recommended/).length).toBeGreaterThanOrEqual(1);
  });

  it("shows separate approved-chapter and custom-content source paths for an active Grade 10 curriculum", () => {
    scopeCatalogQuery.mockReturnValue({
      isLoading: false,
      data: {
        curriculumSet: { id: 10, label: "FBISE Grade 10 Physics", editionLabel: "2026 edition" },
        chapters: [{ id: 1, code: "Ch. 10", title: "Simple Harmonic Motion", startPage: 1, endPage: 20 }],
        segments: [{ id: 101, chapterId: 1, label: "First half", startPage: 1, endPage: 10 }],
        templates: [],
        templateMemberships: [],
      },
    });
    render(<AIAgent />);

    expect(screen.getByRole("button", { name: /Approved textbook chapters/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /My custom lesson material/i })).toBeVisible();
  });

  it("shows Grade 9 as a separate curriculum-intake state without enabling Grade 10 generation rules", async () => {
    render(<AIAgent />);

    fireEvent.click(screen.getByRole("combobox", { name: "Class level" }));
    fireEvent.click(await screen.findByRole("option", { name: "9th Grade · FBISE (curriculum intake)" }));

    expect(await screen.findByText(/Grade 9 is intentionally not using Grade 10 rules/)).toBeVisible();
    expect(screen.queryByRole("combobox", { name: "Subject" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generate MCQs" })).toBeDisabled();
  });

  it("explains the administrator requirement when a stored curriculum catalog cannot be loaded", async () => {
    scopeCatalogQuery.mockReturnValue({ data: null, isLoading: false, error: new Error("FORBIDDEN") } as any);
    render(<AIAgent />);

    fireEvent.click(screen.getByRole("button", { name: /Approved textbook chapters/i }));

    expect(await screen.findByText(/This account cannot load approved chapter choices/)).toBeVisible();
  });

  it("sends a reviewed single-chapter selection instead of browser text when generating a draft", async () => {
    scopeCatalogQuery.mockReturnValue({
      isLoading: false,
      data: {
        curriculumSet: { id: 10, label: "FBISE Grade 10 Physics", editionLabel: "2026 edition" },
        chapters: [{ id: 1, code: "Ch. 10", title: "Simple Harmonic Motion", startPage: 1, endPage: 20 }],
        segments: [],
        templates: [],
        templateMemberships: [],
      },
    });
    generateMutation.mockResolvedValue({ jobId: 99, mcqs: [], analysis: null, draft: { status: "error", message: "No draft", safeRetryAdvice: "Retry" } });
    render(<AIAgent />);

    fireEvent.click(screen.getByRole("button", { name: /Approved textbook chapters/i }));
    fireEvent.click(await screen.findByRole("checkbox", { name: "Ch. 10: Simple Harmonic Motion" }));
    fireEvent.change(screen.getByLabelText("Draft title"), { target: { value: "Physics Chapter 10 Draft" } });

    await waitFor(() => expect(screen.getByRole("spinbutton")).toHaveValue(12));
    fireEvent.click(screen.getByRole("button", { name: "Generate MCQs" }));

    await waitFor(() => {
      expect(generateMutation).toHaveBeenCalledWith({
        numQuestions: 12,
        difficulty: "balanced",
        scope: {
          subject: "physics",
          scopeType: "single_chapter",
          chapterIds: [1],
          segmentIds: [],
          scopeTemplateId: undefined,
        },
      });
    });
  });

  it("extracts an uploaded PDF into quiz content and activates generation settings", async () => {
    pdfExtractMutation.mockResolvedValue({
      text: "Kinematics studies motion through displacement, velocity, and acceleration. ".repeat(20),
      pageCount: 3,
    });
    render(<AIAgent />);

    const pdfFile = new File(["mock PDF bytes"], "physics-chapter-2.pdf", { type: "application/pdf" });
    const uploadInput = document.querySelector<HTMLInputElement>("#file-upload");
    expect(uploadInput).not.toBeNull();
    fireEvent.change(uploadInput!, { target: { files: [pdfFile] } });

    await waitFor(() => {
      expect(pdfExtractMutation).toHaveBeenCalledWith({
        fileBuffer: expect.any(String),
        fileName: "physics-chapter-2.pdf",
      });
    });

    await screen.findByText("Content Analysis");

    await waitFor(() => {
      expect((screen.getByLabelText("Or Paste Content") as HTMLTextAreaElement).value).toContain("Kinematics studies motion");
      expect(screen.getByLabelText("Quiz Title")).toHaveValue("physics-chapter-2");
      expect(screen.getByRole("button", { name: "Generate MCQs" })).toBeEnabled();
    });
  });

  it("loads a TXT file into quiz content and activates generation settings", async () => {
    render(<AIAgent />);

    const textFile = new File(
      ["Current electricity describes the flow of electric charge through a conductor. ".repeat(15)],
      "current-electricity-notes.txt",
      { type: "text/plain" }
    );
    const uploadInput = document.querySelector<HTMLInputElement>("#file-upload");
    expect(uploadInput).not.toBeNull();
    fireEvent.change(uploadInput!, { target: { files: [textFile] } });

    await screen.findByText("Content Analysis");
    await waitFor(() => {
      expect((screen.getByLabelText("Or Paste Content") as HTMLTextAreaElement).value).toContain("Current electricity describes");
      expect(screen.getByLabelText("Quiz Title")).toHaveValue("current-electricity-notes");
      expect(screen.getByRole("button", { name: "Generate MCQs" })).toBeEnabled();
    });
  });

  it("shows active Grade 10 Chemistry chapters through the approved textbook path", async () => {
    window.history.pushState({}, "", "/ai-agent?grade=10&subject=chemistry");
    scopeCatalogQuery.mockReturnValue({
      isLoading: false,
      data: {
        curriculumSet: { id: 30001, label: "FBISE Grade 10 Chemistry", editionLabel: "2020 NBF textbook · OCR-reviewed transcript" },
        chapters: [{ id: 30002, code: "Unit 10", title: "Acids, Bases and Salts", startPage: 21, endPage: 46 }],
        segments: [{ id: 30004, chapterId: 30002, label: "First half", startPage: 21, endPage: 33 }],
        templates: [],
        templateMemberships: [],
      },
    });

    render(<AIAgent />);

    expect(screen.getByText("Prepare Grade 10 Chemistry MCQ draft")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: /Approved textbook chapters/i }));
    expect(await screen.findByRole("checkbox", { name: "Unit 10: Acids, Bases and Salts" })).toBeVisible();
    expect(screen.getByText("Pages 21–46")).toBeVisible();
    window.history.pushState({}, "", "/ai-agent");
  });

  it("does not offer unapproved Computer Science chapters when no supplied curriculum source is active", async () => {
    window.history.pushState({}, "", "/ai-agent?grade=10&subject=computer_science");
    scopeCatalogQuery.mockReturnValue({ data: null, isLoading: false });

    render(<AIAgent />);

    expect(screen.getByText("Prepare Grade 10 Computer Science MCQ draft")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: /Approved textbook chapters/i }));
    expect(await screen.findByText("No approved Computer Science textbook is active yet.")).toBeVisible();
    expect(screen.queryByRole("checkbox", { name: /Unit|Chapter/i })).not.toBeInTheDocument();
    window.history.pushState({}, "", "/ai-agent");
  });

  it("offers only the activated supplied Computer Science units after source verification", async () => {
    window.history.pushState({}, "", "/ai-agent?grade=10&subject=computer_science");
    scopeCatalogQuery.mockReturnValue({
      data: {
        curriculumSet: { id: 40001, label: "FBISE Grade 10 Computer Science", editionLabel: "NCP 2022–23 supplied textbook · OCR-reviewed transcript" },
        chapters: [{ id: 40011, code: "Unit 1", title: "Computer Systems", startPage: 7, endPage: 53 }],
        segments: [{ id: 40021, chapterId: 40011, label: "First half", startPage: 7, endPage: 30 }],
        templates: [],
        templateMemberships: [],
      },
      isLoading: false,
    });

    render(<AIAgent />);

    fireEvent.click(screen.getByRole("button", { name: /Approved textbook chapters/i }));
    expect(await screen.findByRole("checkbox", { name: "Unit 1: Computer Systems" })).toBeVisible();
    expect(screen.getByText("Pages 7–53")).toBeVisible();
    window.history.pushState({}, "", "/ai-agent");
  });

  it("shows the four assessment formats but keeps full-paper drafting locked without approved paper evidence", async () => {
    assessmentAvailabilityQuery.mockReturnValue({
      data: {
        textbookReady: true,
        paperPatternReady: false,
        supportedModes: { mcq: true, short: true, long: true, full_paper: false },
        paperSources: [],
      },
      isLoading: false,
    });

    render(<AIAgent />);

    expect(screen.getByRole("button", { name: /^MCQ/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /Short questions/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /Long questions/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /Full paper/i })).toBeDisabled();
    expect(screen.getByText("Needs active textbook and reviewed paper evidence")).toBeVisible();
  });

  it("saves a source-grounded short-question draft through the assessment review workflow", async () => {
    scopeCatalogQuery.mockReturnValue({
      data: {
        curriculumSet: { id: 1, grade: "10", subject: "physics", label: "Physics", editionLabel: "Reviewed source" },
        chapters: [{ id: 10, code: "Unit 10", title: "Heat", startPage: 13, endPage: 46 }],
        segments: [],
        templates: [],
        templateMemberships: [],
      },
      isLoading: false,
    });
    assessmentAvailabilityQuery.mockReturnValue({
      data: {
        textbookReady: true,
        paperPatternReady: false,
        supportedModes: { mcq: true, short: true, long: true, full_paper: false },
        paperSources: [],
      },
      isLoading: false,
    });
    saveAssessmentDraftMutation.mockResolvedValue({ assessmentDraftId: 901 });

    render(<AIAgent />);
    fireEvent.click(screen.getByRole("button", { name: /Approved textbook chapters/i }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Unit 10: Heat" }));
    fireEvent.click(screen.getByRole("button", { name: /Short questions/i }));

    fireEvent.change(screen.getByLabelText("Draft title"), { target: { value: "Heat short draft" } });
    fireEvent.change(screen.getByLabelText("Question"), { target: { value: "State the source-grounded concept." } });
    fireEvent.change(screen.getByLabelText("Expected answer"), { target: { value: "A concise answer." } });
    fireEvent.change(screen.getByLabelText("Marking guide"), { target: { value: "Identifies the key idea" } });
    fireEvent.change(screen.getByLabelText("Source reference"), { target: { value: "Unit 10, pages 13–46" } });
    fireEvent.change(screen.getByLabelText("Learning objective"), { target: { value: "State the concept accurately." } });
    fireEvent.click(screen.getByRole("button", { name: /Save Short questions draft for review/i }));

    await waitFor(() => expect(saveAssessmentDraftMutation).toHaveBeenCalledWith(expect.objectContaining({
      assessmentMode: "short",
      scope: expect.objectContaining({ subject: "physics", chapterIds: [10] }),
    })));
    expect(await screen.findByText(/Assessment draft #901 is awaiting Portal Admin review/i)).toBeVisible();

    reviseAssessmentDraftMutation.mockResolvedValue({ assessmentDraftId: 901 });
    fireEvent.click(screen.getByRole("button", { name: /Save Short questions draft for review/i }));
    await waitFor(() => expect(reviseAssessmentDraftMutation).toHaveBeenCalledWith(expect.objectContaining({ assessmentDraftId: 901 })));
  });

  it("saves a source-grounded long-question draft with an explicit matching rubric", async () => {
    scopeCatalogQuery.mockReturnValue({
      data: {
        curriculumSet: { id: 1, grade: "10", subject: "physics", label: "Physics", editionLabel: "Reviewed source" },
        chapters: [{ id: 10, code: "Unit 10", title: "Heat", startPage: 13, endPage: 46 }], segments: [], templates: [], templateMemberships: [],
      }, isLoading: false,
    });
    assessmentAvailabilityQuery.mockReturnValue({ data: { textbookReady: true, paperPatternReady: false, supportedModes: { mcq: true, short: true, long: true, full_paper: false }, paperSources: [] }, isLoading: false });
    saveAssessmentDraftMutation.mockResolvedValue({ assessmentDraftId: 903 });

    render(<AIAgent />);
    fireEvent.click(screen.getByRole("button", { name: /Approved textbook chapters/i }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Unit 10: Heat" }));
    fireEvent.click(screen.getByRole("button", { name: /Long questions/i }));
    fireEvent.change(screen.getByLabelText("Draft title"), { target: { value: "Heat long draft" } });
    fireEvent.change(screen.getByLabelText("Question"), { target: { value: "Explain the supported concept." } });
    fireEvent.change(screen.getByLabelText("Expected key points"), { target: { value: "States the first supported point" } });
    fireEvent.change(screen.getByLabelText("Marking rubric"), { target: { value: "Explains the supported point | 2" } });
    fireEvent.change(screen.getByLabelText("Source reference"), { target: { value: "Unit 10, pages 13–46" } });
    fireEvent.change(screen.getByLabelText("Learning objective"), { target: { value: "Explain the concept accurately." } });
    fireEvent.click(screen.getByRole("button", { name: /Save Long questions draft for review/i }));

    await waitFor(() => expect(saveAssessmentDraftMutation).toHaveBeenCalledWith(expect.objectContaining({ assessmentMode: "long" })));
    expect(await screen.findByText(/Assessment draft #903 is awaiting Portal Admin review/i)).toBeVisible();
  });

  it("keeps saved-draft retrieval optional while displaying the teacher workflow progress", () => {
    render(<AIAgent />);

    expect(screen.getByLabelText("Draft workflow progress")).toBeVisible();
    expect(screen.getByText(/Continue a saved draft/i)).toBeVisible();
    const reviewInput = screen.getByLabelText("Assessment draft ID");
    expect(reviewInput.closest("details")).not.toHaveAttribute("open");

    fireEvent.click(screen.getByText(/Continue a saved draft/i));
    expect(reviewInput.closest("details")).toHaveAttribute("open");
  });

  it("loads a saved long-question draft for review and revises that same draft", async () => {
    assessmentAvailabilityQuery.mockReturnValue({ data: { textbookReady: true, paperPatternReady: false, supportedModes: { mcq: true, short: true, long: true, full_paper: false }, paperSources: [] }, isLoading: false });
    loadAssessmentDraftQuery.mockReturnValue({
      isFetching: false,
      data: {
        id: 904,
        title: "Saved long draft",
        draftPayload: JSON.stringify({
          mode: "long",
          title: "Saved long draft",
          estimatedDurationMinutes: null,
          items: [{ kind: "long", question: "Explain the saved concept.", expectedKeyPoints: ["Key point"], markingRubric: [{ criterion: "Explains key point", marks: 2 }], difficulty: "medium", marks: 2, sourceReference: "Unit 10, page 18", learningObjective: "Explain the concept." }],
        }),
      },
    });
    reviseAssessmentDraftMutation.mockResolvedValue({ assessmentDraftId: 904 });

    render(<AIAgent />);
    fireEvent.click(screen.getByText(/Continue a saved draft/i));
    fireEvent.change(screen.getByLabelText("Assessment draft ID"), { target: { value: "904" } });
    await waitFor(() => expect(screen.getByLabelText("Assessment draft ID")).toHaveValue("904"));
    fireEvent.click(screen.getByRole("button", { name: "Load for review" }));

    expect(await screen.findByDisplayValue("Explain the saved concept.")).toBeVisible();
    expect(screen.getByText("Editing draft #904")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: /Save Long questions draft for review/i }));
    await waitFor(() => expect(reviseAssessmentDraftMutation).toHaveBeenCalledWith(expect.objectContaining({ assessmentDraftId: 904 })));
  });

  it("saves a full-paper review draft only with selected approved paper evidence", async () => {
    scopeCatalogQuery.mockReturnValue({
      data: {
        curriculumSet: { id: 1, grade: "10", subject: "physics", label: "Physics", editionLabel: "Reviewed source" },
        chapters: [{ id: 10, code: "Unit 10", title: "Heat", startPage: 13, endPage: 46 }],
        segments: [],
        templates: [],
        templateMemberships: [],
      },
      isLoading: false,
    });
    assessmentAvailabilityQuery.mockReturnValue({
      data: {
        textbookReady: true,
        paperPatternReady: true,
        supportedModes: { mcq: true, short: true, long: true, full_paper: true },
        paperSources: [{ id: 61, sourceKind: "past_paper", academicYear: "2024", originalFileName: "physics-past-paper-2024.pdf" }],
      },
      isLoading: false,
    });
    saveAssessmentDraftMutation.mockResolvedValue({ assessmentDraftId: 902 });

    render(<AIAgent />);
    fireEvent.click(screen.getByRole("button", { name: /Approved textbook chapters/i }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Unit 10: Heat" }));
    fireEvent.click(screen.getByRole("button", { name: /^Full paper/i }));

    fireEvent.click(screen.getByRole("checkbox", { name: "physics-past-paper-2024.pdf" }));
    fireEvent.change(screen.getByLabelText("Draft title"), { target: { value: "Physics paper draft" } });
    fireEvent.change(screen.getByLabelText("Question"), { target: { value: "State the supported concept." } });
    fireEvent.change(screen.getByLabelText("Expected answer"), { target: { value: "A concise answer." } });
    fireEvent.change(screen.getByLabelText("Marking guide"), { target: { value: "Identifies the key idea" } });
    fireEvent.change(screen.getByLabelText("Textbook source reference"), { target: { value: "Unit 10, pages 13–46" } });
    fireEvent.change(screen.getByLabelText("Learning objective"), { target: { value: "State the concept accurately." } });
    fireEvent.click(screen.getByRole("button", { name: /Add this item to Section A/i }));
    fireEvent.click(screen.getByRole("button", { name: "Add section" }));
    expect(screen.getByRole("button", { name: /Section B.*0 items/i })).toBeVisible();
    fireEvent.change(screen.getByLabelText("Question"), { target: { value: "State a second supported concept." } });
    fireEvent.change(screen.getByLabelText("Expected answer"), { target: { value: "Another concise answer." } });
    fireEvent.change(screen.getByLabelText("Marking guide"), { target: { value: "Identifies the second key idea" } });
    fireEvent.change(screen.getByLabelText("Textbook source reference"), { target: { value: "Unit 10, pages 13–46" } });
    fireEvent.change(screen.getByLabelText("Learning objective"), { target: { value: "State a second concept accurately." } });
    fireEvent.click(screen.getByRole("button", { name: /Add this item to Section B/i }));
    fireEvent.click(screen.getByRole("button", { name: /Save full-paper draft for review/i }));

    await waitFor(() => expect(saveAssessmentDraftMutation).toHaveBeenCalledWith(expect.objectContaining({
      assessmentMode: "full_paper",
      paperPatternSourceIds: [61],
      payload: expect.objectContaining({ sections: expect.arrayContaining([
        expect.objectContaining({ label: "Section A", items: expect.arrayContaining([expect.any(Object)]) }),
        expect.objectContaining({ label: "Section B", items: expect.arrayContaining([expect.any(Object)]) }),
      ]) }),
    })));
    expect(await screen.findByText(/Assessment draft #902 is awaiting Portal Admin review/i)).toBeVisible();
  });
});

import "@testing-library/jest-dom/vitest";
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AIAgent from "../client/src/pages/AIAgent";

class ResizeObserverMock { observe() {} unobserve() {} disconnect() {} }
Object.defineProperty(globalThis, "ResizeObserver", { writable: true, value: ResizeObserverMock });
Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { writable: true, value: vi.fn() });

const generateMutation = vi.fn();
const startPrintableGenerationMutation = vi.fn();
const advancePrintableGenerationMutation = vi.fn();
const navigate = vi.fn();
const scopeCatalogQuery = vi.fn();

const catalog = {
  curriculumSet: { id: 10, label: "FBISE Grade 10 Physics", editionLabel: "2026 edition" },
  chapters: [{ id: 1, code: "Ch. 10", title: "Simple Harmonic Motion", startPage: 1, endPage: 20, estimatedTopicCount: 3 }],
  segments: [], templates: [], templateMemberships: [],
};

vi.mock("@/lib/trpc", () => ({
  trpc: {
    aiAgent: {
      generateMCQs: { useMutation: () => ({ mutateAsync: generateMutation }) },
      startPrintableGeneration: { useMutation: () => ({ mutateAsync: startPrintableGenerationMutation, isPending: false }) },
      advancePrintableGeneration: { useMutation: () => ({ mutateAsync: advancePrintableGenerationMutation, isPending: false }) },
      saveGeneratedQuiz: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) },
      getGenerationStatus: { useQuery: () => ({ data: undefined }) },
    },
    curriculum: {
      getActiveScopeCatalog: { useQuery: (...args: unknown[]) => scopeCatalogQuery(...args) },
      listReadyProgrammes: { useQuery: () => ({ data: [
        { id: 1, board: "FBISE", grade: "10", subject: "physics", teacherLabel: "Physics", status: "ready" },
        { id: 2, board: "FBISE", grade: "10", subject: "chemistry", teacherLabel: "Chemistry", status: "ready" },
      ], isLoading: false }) },
    },
    assessment: { getAvailability: { useQuery: () => ({ data: { textbookReady: true, paperPatternReady: true, supportedModes: { mcq: true, short: true, long: true, full_paper: false }, paperSources: [] }, isLoading: false }) }, getDraft: { useQuery: () => ({ data: undefined }) }, saveDraft: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) }, reviseDraft: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) } },
    pdfUpload: { extractPdfText: { useMutation: () => ({ mutateAsync: vi.fn() }) } },
  },
}));
vi.mock("wouter", () => ({
  useLocation: () => ["/ai-agent", navigate],
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => <a href={href} {...props}>{children}</a>,
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

function chooseOutput(name: RegExp) {
  const contextContinue = screen.queryByRole("button", { name: "Continue" });
  if (contextContinue) fireEvent.click(contextContinue);
  fireEvent.click(screen.getByRole("button", { name }));
}

function selectApprovedScope(title = "Physics revision") {
  fireEvent.click(screen.getByRole("button", { name: /Approved textbook chapters/i }));
  fireEvent.click(screen.getByRole("checkbox", { name: "Ch. 10: Simple Harmonic Motion" }));
  fireEvent.change(screen.getByLabelText("Quiz title"), { target: { value: title } });
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
}

describe("approved-textbook assessment builder", () => {
  afterEach(() => {
    cleanup();
    generateMutation.mockReset(); startPrintableGenerationMutation.mockReset(); advancePrintableGenerationMutation.mockReset(); navigate.mockReset();
    scopeCatalogQuery.mockReset(); scopeCatalogQuery.mockReturnValue({ data: catalog, isLoading: false });
  });

  it("shows only the approved textbook source path and keeps later settings out of view until a chapter is selected", () => {
    scopeCatalogQuery.mockReturnValue({ data: catalog, isLoading: false });
    render(<AIAgent />);
    chooseOutput(/^MCQ quiz/i);
    expect(screen.getByRole("button", { name: /Approved textbook chapters/i })).toBeVisible();
    expect(screen.queryByRole("button", { name: /My custom lesson material/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
    selectApprovedScope();
    expect(screen.getByRole("progressbar", { name: "Step 3 of 4" })).toHaveAttribute("aria-valuenow", "3");
  });

  it("sends only the exact reviewed textbook scope when generating an MCQ draft", async () => {
    scopeCatalogQuery.mockReturnValue({ data: catalog, isLoading: false });
    generateMutation.mockResolvedValue({ jobId: 74, mcqs: [], analysis: {}, draft: { status: "error", message: "No draft", safeRetryAdvice: "Retry" } });
    render(<AIAgent />);
    chooseOutput(/^MCQ quiz/i);
    selectApprovedScope("Scope-only draft");
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "4" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("button", { name: "Generate MCQs" }));
    await waitFor(() => expect(generateMutation).toHaveBeenCalledWith({
      numQuestions: 4,
      difficulty: "balanced",
      scope: { board: "FBISE", grade: "10", subject: "physics", scopeType: "single_chapter", chapterIds: [1], segmentIds: [], scopeTemplateId: undefined },
    }));
  });

  it("warns on a requested count above the reviewed scope capacity without blocking teacher control", () => {
    scopeCatalogQuery.mockReturnValue({ data: catalog, isLoading: false });
    render(<AIAgent />);
    chooseOutput(/^MCQ quiz/i);
    selectApprovedScope();
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "4" } });
    expect(screen.getByTestId("topic-capacity-warning")).toHaveTextContent("about 3 distinct examinable topics");
    expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();
  });

  it("shows guarded progress and confirms before leaving an active source-bound MCQ generation", async () => {
    scopeCatalogQuery.mockReturnValue({ data: catalog, isLoading: false });
    generateMutation.mockImplementation(() => new Promise(() => undefined));
    render(<AIAgent />);
    chooseOutput(/^MCQ quiz/i);
    selectApprovedScope();
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("button", { name: "Generate MCQs" }));
    expect(await screen.findByRole("progressbar", { name: "Quiz generation progress" })).toHaveAttribute("aria-valuenow", "8");
    fireEvent.click(screen.getByRole("button", { name: "Back to Quiz Centre" }));
    expect(screen.getByRole("alertdialog")).toHaveTextContent("Leave while MCQs are generating?");
  });

  it("runs printable generation from the selected textbook scope and shows exact pair verification progress", async () => {
    scopeCatalogQuery.mockReturnValue({ data: catalog, isLoading: false });
    startPrintableGenerationMutation.mockResolvedValue({ jobId: 81, status: "pending", completedPairs: 0, totalPairs: 2, totalBatches: 1, progress: 0, cacheReused: false });
    advancePrintableGenerationMutation.mockImplementation(() => new Promise(() => undefined));
    render(<AIAgent />);
    chooseOutput(/^Short question paper/i);
    selectApprovedScope("Motion printable draft");
    fireEvent.change(screen.getByLabelText("Numbered OR pairs"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: /Generate printable paper draft/i }));
    expect(await screen.findByText("Generating and verifying pairs 1–2 of 2")).toBeVisible();
    expect(startPrintableGenerationMutation).toHaveBeenCalledWith(expect.objectContaining({ scope: expect.objectContaining({ chapterIds: [1], scopeType: "single_chapter" }) }));
  });

  it("blocks progression when no active reviewed textbook is available rather than exposing a custom-material fallback", () => {
    scopeCatalogQuery.mockReturnValue({ data: null, isLoading: false });
    render(<AIAgent />);
    chooseOutput(/^MCQ quiz/i);
    expect(screen.getByRole("button", { name: /Approved textbook chapters/i })).toBeDisabled();
    expect(screen.getByText("No verified Physics textbook is active.")).toBeVisible();
    expect(screen.queryByRole("button", { name: /My custom lesson material/i })).not.toBeInTheDocument();
  });
});

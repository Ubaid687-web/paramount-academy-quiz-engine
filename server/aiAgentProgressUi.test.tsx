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

const generateMutation = vi.fn();
const saveMutation = vi.fn();
const pdfExtractMutation = vi.fn();

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
  },
}));

vi.mock("wouter", () => ({
  useLocation: () => ["/ai-agent", vi.fn()],
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

describe("AI quiz generation feedback", () => {
  afterEach(() => {
    cleanup();
    generateMutation.mockReset();
    saveMutation.mockReset();
    pdfExtractMutation.mockReset();
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
});

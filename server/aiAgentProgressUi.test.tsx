import "@testing-library/jest-dom/vitest";
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AIAgent from "../client/src/pages/AIAgent";

const generateMutation = vi.fn();
const saveMutation = vi.fn();

vi.mock("@/lib/trpc", () => ({
  trpc: {
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
        },
      ],
      analysis: { totalWords: 150, complexity: "moderate", recommendedQuestions: { minimum: 5, optimal: 10, maximum: 20 } },
    });
    render(<AIAgent />);

    fireEvent.change(screen.getByLabelText("Or Paste Content"), {
      target: { value: "This is sufficient study content for a successful AI quiz generation request.".repeat(3) },
    });
    fireEvent.change(screen.getByLabelText("Quiz Title"), { target: { value: "Physics revision" } });
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "10" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate MCQs" }));

    await waitFor(() => {
      expect(screen.getByText("Generated MCQs (1)")).toBeVisible();
    });

    expect(screen.queryByRole("progressbar", { name: "Quiz generation progress" })).not.toBeInTheDocument();
    expect(screen.getByText(/Which quantity measures rate of change of velocity/)).toBeVisible();
  });
});

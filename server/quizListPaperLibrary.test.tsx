// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import QuizList from "../client/src/pages/QuizList";

const paperDownload = vi.fn();

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ paperLibrary: { download: { fetch: paperDownload } } }),
    curriculum: {
      listReadyProgrammes: { useQuery: () => ({ data: [{ id: 1, board: "FBISE", grade: "10", subject: "physics", teacherLabel: "Physics", status: "ready" }], isLoading: false }) },
    },
    quiz: {
      getAll: { useQuery: () => ({ data: [], isLoading: false, error: null, refetch: vi.fn() }) },
      deleteQuiz: { useMutation: () => ({ mutateAsync: vi.fn() }) },
    },
    paperLibrary: {
      list: { useQuery: () => ({ data: [
        { id: 11, grade: "10", subject: "physics", sourceKind: "past_paper", academicYear: "2025", timelineOrder: 2, timelineLabel: "morning", originalFileName: "physics-2025.pdf", publishedAt: new Date() },
        { id: 12, grade: "10", subject: "chemistry", sourceKind: "model_paper", academicYear: "2022-2023", timelineOrder: null, timelineLabel: null, originalFileName: "chemistry-model.pdf", publishedAt: new Date() },
        { id: 13, grade: "9", subject: "physics", sourceKind: "past_paper", academicYear: "2025", timelineOrder: 1, timelineLabel: null, originalFileName: "grade-9-physics-2025.pdf", publishedAt: new Date() },
      ], isLoading: false, error: null }) },
    },
  },
}));

vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: 3, role: "teacher" }, loading: false, isAuthenticated: true }) }));
vi.mock("@/components/AcademyShell", () => ({ AcademyShell: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

describe("student paper library", () => {
  afterEach(() => { cleanup(); paperDownload.mockReset(); });

  it("shows only Portal Admin-published papers and filters them by grade, subject, year, and type before requesting a signed PDF", async () => {
    paperDownload.mockResolvedValue({ url: "https://example.test/paper.pdf", fileName: "physics-2025.pdf" });
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    render(<QuizList />);

    fireEvent.click(screen.getByRole("button", { name: "Browse paper PDFs" }));
    expect(screen.getByRole("heading", { name: "Find an approved paper." })).toBeTruthy();
    expect(screen.getByText("physics-2025.pdf", { exact: true })).toBeTruthy();
    expect(screen.getByText("grade-9-physics-2025.pdf", { exact: true })).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Filter paper library by grade"), { target: { value: "10" } });
    fireEvent.change(screen.getByLabelText("Filter paper library by subject"), { target: { value: "physics" } });
    fireEvent.change(screen.getByLabelText("Filter paper library by year"), { target: { value: "2025" } });
    expect(screen.getByText("physics-2025.pdf")).toBeTruthy();
    expect(screen.queryByText("grade-9-physics-2025.pdf")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "PDF" }));
    await waitFor(() => expect(paperDownload).toHaveBeenCalledWith({ sourceId: 11 }));
    anchorClick.mockRestore();
  });
});

import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import QuizList from "../client/src/pages/QuizList";

const quizzesQuery = vi.fn();
const deleteMutation = vi.fn();

vi.mock("@/lib/trpc", () => ({
  trpc: {
    quiz: {
      getAll: { useQuery: () => quizzesQuery() },
      deleteQuiz: { useMutation: () => ({ mutateAsync: deleteMutation }) },
    },
  },
}));

vi.mock("wouter", () => ({
  useLocation: () => ["/", vi.fn()],
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => <a href={href} {...props}>{children}</a>,
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe("Quiz Centre entry experience", () => {
  afterEach(() => {
    cleanup();
    quizzesQuery.mockReset();
    deleteMutation.mockReset();
  });

  it("presents one clear builder entry while explaining Grade 10 readiness and Grade 9 intake status", () => {
    quizzesQuery.mockReturnValue({ data: [], isLoading: false, error: null, refetch: vi.fn() });
    render(<QuizList />);

    expect(screen.getByRole("heading", { name: "A focused quiz engine for better board preparation." })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Open Quiz Builder" }).getAttribute("href")).toBe("/generate");
    expect(screen.getAllByText("Open Quiz Builder")).toHaveLength(1);
    expect(screen.getByText("Grade 10")).toBeTruthy();
    expect(screen.getByText("Ready for setup")).toBeTruthy();
    expect(screen.getByText("Grade 9")).toBeTruthy();
    expect(screen.getByText("Awaiting curriculum")).toBeTruthy();
    expect(screen.getByText("No draft has been saved yet.")).toBeTruthy();
    expect(screen.queryByText(/Create Your First Quiz/i)).toBeNull();
  });
});

import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import QuizList from "../client/src/pages/QuizList";

const quizzesQuery = vi.fn();
const deleteMutation = vi.fn();

Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
  writable: true,
  value: vi.fn(),
});

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

  it("guides teachers from Grade 10 to a subject and then one relevant draft action", () => {
    quizzesQuery.mockReturnValue({ data: [], isLoading: false, error: null, refetch: vi.fn() });
    render(<QuizList />);

    expect(screen.getByRole("heading", { name: "Select a class." })).toBeTruthy();
    expect(screen.getByText("Grade 10")).toBeTruthy();
    expect(screen.getByText("Grade 9")).toBeTruthy();
    expect(screen.queryByText("Open Quiz Builder")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Choose Grade 10/i }));
    expect(screen.getByRole("heading", { name: "Choose a subject." })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Physics.*Continue/i }));
    expect(screen.getByRole("heading", { name: "Grade 10 · Physics" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Open builder" }).getAttribute("href")).toBe("/generate?grade=10&subject=physics");
  });

  it("shows Grade 9 subject intake without exposing a Grade 10 draft action", () => {
    quizzesQuery.mockReturnValue({ data: [], isLoading: false, error: null, refetch: vi.fn() });
    render(<QuizList />);

    fireEvent.click(screen.getByRole("button", { name: /Choose Grade 9/i }));
    fireEvent.click(screen.getByRole("button", { name: /Physics.*Continue/i }));
    expect(screen.getByRole("heading", { name: "Grade 9 · Physics" })).toBeTruthy();
    expect(screen.getByText("Curriculum setup pending")).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Open builder" })).toBeNull();
  });

  it("shows the current shared Grade 10 MCQ subjects without a staff-detail selector", async () => {
    quizzesQuery.mockReturnValue({ data: [], isLoading: false, error: null, refetch: vi.fn() });
    render(<QuizList />);

    fireEvent.click(screen.getByRole("button", { name: /Choose Grade 10/i }));

    expect(screen.getByRole("button", { name: /Physics.*Continue/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Computer Science.*Continue/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Chemistry.*Continue/i })).toBeTruthy();
    expect(screen.queryByRole("combobox", { name: "Teaching focus" })).toBeNull();
  });

  it("returns to class selection through the visible Change class button", () => {
    quizzesQuery.mockReturnValue({ data: [], isLoading: false, error: null, refetch: vi.fn() });
    render(<QuizList />);

    fireEvent.click(screen.getByRole("button", { name: /Choose Grade 10/i }));
    expect(screen.getByRole("heading", { name: "Choose a subject." })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Return to class selection" }));
    expect(screen.getByRole("heading", { name: "Select a class." })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Choose Grade 9/i })).toBeTruthy();
  });

  it("returns to the subject cards through the visible Change subject button", () => {
    quizzesQuery.mockReturnValue({ data: [], isLoading: false, error: null, refetch: vi.fn() });
    render(<QuizList />);

    fireEvent.click(screen.getByRole("button", { name: /Choose Grade 10/i }));
    fireEvent.click(screen.getByRole("button", { name: /Physics.*Continue/i }));
    expect(screen.getByRole("heading", { name: "Grade 10 · Physics" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Return to subject selection" }));
    expect(screen.getByRole("heading", { name: "Choose a subject." })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Chemistry.*Continue/i })).toBeTruthy();
  });

  it("supports Enter and Space keyboard activation on the visible return controls", () => {
    quizzesQuery.mockReturnValue({ data: [], isLoading: false, error: null, refetch: vi.fn() });
    render(<QuizList />);

    fireEvent.click(screen.getByRole("button", { name: /Choose Grade 10/i }));
    const classReturn = screen.getByRole("button", { name: "Return to class selection" });
    classReturn.focus();
    fireEvent.keyDown(classReturn, { key: "Enter" });
    expect(screen.getByRole("heading", { name: "Select a class." })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Choose Grade 10/i }));
    fireEvent.click(screen.getByRole("button", { name: /Physics.*Continue/i }));
    const subjectReturn = screen.getByRole("button", { name: "Return to subject selection" });
    subjectReturn.focus();
    fireEvent.keyDown(subjectReturn, { key: " " });
    expect(screen.getByRole("heading", { name: "Choose a subject." })).toBeTruthy();
  });
});

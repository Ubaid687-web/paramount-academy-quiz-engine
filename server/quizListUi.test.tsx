import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import QuizList from "../client/src/pages/QuizList";

const quizzesQuery = vi.fn();
const programmesQuery = vi.fn();
const quizQueryOptions = vi.fn();
const deleteMutation = vi.fn();

const grade10Programmes = [
  { id: 1, board: "FBISE", grade: "10", subject: "physics", teacherLabel: "Physics", status: "ready" },
  { id: 2, board: "FBISE", grade: "10", subject: "chemistry", teacherLabel: "Chemistry", status: "ready" },
  { id: 3, board: "FBISE", grade: "10", subject: "computer_science", teacherLabel: "Computer Science", status: "ready" },
];

Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { writable: true, value: vi.fn() });

vi.mock("@/lib/trpc", () => ({
  trpc: {
    quiz: {
      getAll: { useQuery: (...args: unknown[]) => { quizQueryOptions(...args); return quizzesQuery(); } },
      deleteQuiz: { useMutation: () => ({ mutateAsync: deleteMutation }) },
    },
    curriculum: {
      listReadyProgrammes: { useQuery: () => programmesQuery() },
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
    programmesQuery.mockReset();
    quizQueryOptions.mockReset();
    deleteMutation.mockReset();
  });

  const setReadyGrade10 = () => {
    quizzesQuery.mockReturnValue({ data: [], isLoading: false, error: null, refetch: vi.fn() });
    programmesQuery.mockReturnValue({ data: grade10Programmes, isLoading: false, error: null });
  };

  it("guides teachers from a ready grade to a ready subject and then the builder", () => {
    setReadyGrade10();
    render(<QuizList />);
    expect(screen.getByRole("heading", { name: "Choose a grade." })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Choose Grade 10/i }));
    expect(screen.getByRole("heading", { name: "Choose a subject." })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Physics.*Continue/i }));
    expect(screen.getByRole("heading", { name: "Grade 10 · Physics" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Open builder" }).getAttribute("href")).toBe("/generate?board=FBISE&grade=10&subject=physics");
  });

  it("defers the draft-library request until a ready class is selected", () => {
    setReadyGrade10();
    render(<QuizList />);
    expect(quizQueryOptions.mock.calls[0]?.[1]).toMatchObject({ enabled: false, staleTime: 300000, refetchOnWindowFocus: false });
    fireEvent.click(screen.getByRole("button", { name: /Choose Grade 10/i }));
    expect(quizQueryOptions.mock.calls.at(-1)?.[1]).toMatchObject({ enabled: true });
  });

  it("shows three accessible skeleton draft cards while the deferred library request is loading", () => {
    programmesQuery.mockReturnValue({ data: grade10Programmes, isLoading: false, error: null });
    quizzesQuery.mockReturnValue({ data: undefined, isLoading: true, error: null, refetch: vi.fn() });
    render(<QuizList />);
    fireEvent.click(screen.getByRole("button", { name: /Choose Grade 10/i }));
    expect(screen.getByRole("status", { name: /loading recent mcq drafts/i }).getAttribute("aria-busy")).toBe("true");
    expect(document.querySelectorAll('[data-slot="skeleton"]').length).toBe(21);
  });

  it("keeps Grade 9 visibly separate as a curriculum-intake path", () => {
    programmesQuery.mockReturnValue({
      data: [...grade10Programmes, { id: 9, board: "FBISE", grade: "9", subject: "physics", teacherLabel: "Physics", status: "intake_only" }],
      isLoading: false,
      error: null,
    });
    quizzesQuery.mockReturnValue({ data: [], isLoading: false, error: null, refetch: vi.fn() });
    render(<QuizList />);
    expect(screen.getByText("Grade 9")).toBeTruthy();
    expect(screen.getByText(/kept separate/i)).toBeTruthy();
    expect(screen.getByRole("link", { name: /Open curriculum management/i })).toBeTruthy();
  });

  it("shows Grade 9 intake messaging even when the ready catalogue has only Grade 10", () => {
    setReadyGrade10();
    render(<QuizList />);
    expect(screen.getByText("Grade 9")).toBeTruthy();
    expect(screen.getByText(/curriculum intake/i)).toBeTruthy();
  });

  it("keeps the add-subject action in the admin path instead of mixing it into teacher setup", () => {
    setReadyGrade10();
    render(<QuizList />);
    expect(screen.getByRole("link", { name: /Open curriculum management/i }).getAttribute("href")).toBe("/curriculum");
  });

  it("shows all existing ready Grade 10 programmes without a staff-detail selector", () => {
    setReadyGrade10();
    render(<QuizList />);
    fireEvent.click(screen.getByRole("button", { name: /Choose Grade 10/i }));
    expect(screen.getByRole("button", { name: /Physics.*Continue/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Computer Science.*Continue/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Chemistry.*Continue/i })).toBeTruthy();
    expect(screen.queryByRole("combobox", { name: "Teaching focus" })).toBeNull();
  });

  it("returns to class selection through the visible Change class button", () => {
    setReadyGrade10();
    render(<QuizList />);
    fireEvent.click(screen.getByRole("button", { name: /Choose Grade 10/i }));
    fireEvent.click(screen.getByRole("button", { name: "Return to class selection" }));
    expect(screen.getByRole("heading", { name: "Choose a grade." })).toBeTruthy();
  });

  it("returns to subject cards through the visible Change subject button", () => {
    setReadyGrade10();
    render(<QuizList />);
    fireEvent.click(screen.getByRole("button", { name: /Choose Grade 10/i }));
    fireEvent.click(screen.getByRole("button", { name: /Physics.*Continue/i }));
    fireEvent.click(screen.getByRole("button", { name: "Return to subject selection" }));
    expect(screen.getByRole("heading", { name: "Choose a subject." })).toBeTruthy();
  });

  it("supports Enter and Space keyboard activation on the visible return controls", () => {
    setReadyGrade10();
    render(<QuizList />);
    fireEvent.click(screen.getByRole("button", { name: /Choose Grade 10/i }));
    const classReturn = screen.getByRole("button", { name: "Return to class selection" });
    fireEvent.keyDown(classReturn, { key: "Enter" });
    expect(screen.getByRole("heading", { name: "Choose a grade." })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Choose Grade 10/i }));
    fireEvent.click(screen.getByRole("button", { name: /Physics.*Continue/i }));
    const subjectReturn = screen.getByRole("button", { name: "Return to subject selection" });
    fireEvent.keyDown(subjectReturn, { key: " " });
    expect(screen.getByRole("heading", { name: "Choose a subject." })).toBeTruthy();
  });
});

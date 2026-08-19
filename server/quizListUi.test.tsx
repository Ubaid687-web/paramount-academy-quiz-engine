import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import QuizList from "../client/src/pages/QuizList";

const quizzesQuery = vi.fn();
const programmesQuery = vi.fn();
const quizQueryOptions = vi.fn();
const deleteMutation = vi.fn();
let authUser: { role: "admin" | "teacher" | "user" } | null = null;

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
vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ user: authUser, loading: false, isAuthenticated: Boolean(authUser) }) }));

describe("Quiz Centre entry experience", () => {
  afterEach(() => {
    cleanup();
    quizzesQuery.mockReset();
    programmesQuery.mockReset();
    quizQueryOptions.mockReset();
    deleteMutation.mockReset();
    authUser = null;
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
    fireEvent.click(screen.getByRole("button", { name: /Open draft library/i }));
    expect(quizQueryOptions.mock.calls.at(-1)?.[1]).toMatchObject({ enabled: true });
  });

  it("shows three accessible skeleton draft cards while the deferred library request is loading", () => {
    programmesQuery.mockReturnValue({ data: grade10Programmes, isLoading: false, error: null });
    quizzesQuery.mockReturnValue({ data: undefined, isLoading: true, error: null, refetch: vi.fn() });
    render(<QuizList />);
    fireEvent.click(screen.getByRole("button", { name: /Open draft library/i }));
    expect(screen.getByRole("status", { name: /loading recent mcq drafts/i }).getAttribute("aria-busy")).toBe("true");
    expect(document.querySelectorAll('[data-slot="skeleton"]').length).toBe(21);
  });

  it("keeps Grade 9 separate while exposing only the next subject-intake action", () => {
    programmesQuery.mockReturnValue({
      data: [...grade10Programmes, { id: 9, board: "FBISE", grade: "9", subject: "physics", teacherLabel: "Physics", status: "intake_only" }],
      isLoading: false,
      error: null,
    });
    quizzesQuery.mockReturnValue({ data: [], isLoading: false, error: null, refetch: vi.fn() });
    render(<QuizList />);
    expect(screen.getByText("Grade 9")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Set up Grade 9/i }));
    expect(screen.getByRole("heading", { name: "Add a Grade 9 subject." })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Add Grade 9 subject" }).getAttribute("href")).toBe("/curriculum?grade=9&intake=subject");
  });

  it("shows Grade 9 intake messaging even when the ready catalogue has only Grade 10", () => {
    setReadyGrade10();
    render(<QuizList />);
    expect(screen.getByText("Grade 9")).toBeTruthy();
    expect(screen.getByText(/subject setup/i)).toBeTruthy();
  });

  it("does not mix a global admin add-subject action into the grade-selection screen", () => {
    setReadyGrade10();
    render(<QuizList />);
    expect(screen.queryByRole("link", { name: /add subject/i })).toBeNull();
  });

  it("shows the Curriculum Library navigation entry only to a signed-in Portal Admin", () => {
    setReadyGrade10();
    render(<QuizList />);
    expect(screen.queryByRole("link", { name: "Curriculum" })).toBeNull();
    cleanup();

    authUser = { role: "admin" };
    render(<QuizList />);
    expect(screen.getByRole("link", { name: "Curriculum" }).getAttribute("href")).toBe("/curriculum");
  });

  it("shows a staff sign-in action before authentication without exposing Portal Admin controls", () => {
    setReadyGrade10();
    render(<QuizList />);
    expect(screen.getByRole("button", { name: "Staff sign in" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Curriculum" })).toBeNull();
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

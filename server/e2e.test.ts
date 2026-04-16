import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "test",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("End-to-End: Quiz Submit and Results", () => {
  it("should submit quiz attempt and retrieve results with correct calculations", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Get all quizzes
    const quizzes = await caller.quiz.getAll();
    expect(quizzes.length).toBeGreaterThan(0);
    const quizId = quizzes[0]!.id;

    // Get questions for the quiz
    const questions = await caller.quiz.getQuestions({ quizId, shuffle: false });
    expect(questions.length).toBeGreaterThan(0);

    // Simulate user answers (mark first 3 as correct, rest as incorrect)
    const answers = questions.map((q, index) => ({
      questionId: q.id,
      selectedAnswer: index < 3 ? q.correctAnswer : "X",
      isCorrect: index < 3 ? 1 : 0,
    }));

    // Submit the quiz attempt
    const submitResult = await caller.quiz.submitAttempt({
      quizId,
      answers,
      score: 3,
      totalQuestions: questions.length,
    });

    expect(submitResult).toBeDefined();
    expect(submitResult.attemptId).toBeDefined();
    expect(submitResult.score).toBe(3);
    expect(submitResult.percentage).toBeGreaterThan(0);

    // Retrieve the results using the returned attemptId
    const results = await caller.quiz.getAttemptResults({
      attemptId: submitResult.attemptId,
    });

    expect(results).toBeDefined();
    expect(results.attempt).toBeDefined();
    expect(results.attempt.score).toBe(3);
    expect(results.attempt.totalQuestions).toBe(questions.length);
    expect(results.answers).toBeDefined();
    expect(results.answers.length).toBe(questions.length);

    // Verify answer details
    const firstAnswer = results.answers[0];
    expect(firstAnswer).toBeDefined();
    expect(firstAnswer.questionId).toBe(questions[0]!.id);
    expect(firstAnswer.selectedAnswer).toBe(questions[0]!.correctAnswer);
    expect(firstAnswer.isCorrect).toBe(1);

    // Verify incorrect answer
    const incorrectAnswer = results.answers[3];
    expect(incorrectAnswer).toBeDefined();
    expect(incorrectAnswer.isCorrect).toBe(0);
  });

  it("should delete quiz and related data", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Get all quizzes before deletion
    const quizzesBefore = await caller.quiz.getAll();
    const initialCount = quizzesBefore.length;
    expect(initialCount).toBeGreaterThan(0);

    const quizToDelete = quizzesBefore[0]!;

    // Delete the quiz
    const deleteResult = await caller.quiz.deleteQuiz({ quizId: quizToDelete.id });
    expect(deleteResult.success).toBe(true);

    // Verify quiz is deleted
    const quizzesAfter = await caller.quiz.getAll();
    expect(quizzesAfter.length).toBe(initialCount - 1);
    expect(quizzesAfter.find((q) => q.id === quizToDelete.id)).toBeUndefined();
  });
});

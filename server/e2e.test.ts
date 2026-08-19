import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { addQuestionsToQuiz, createQuiz, deleteQuizAndRelated } from "./db";

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

async function createQuizFixture() {
  const quizId = await createQuiz({
    title: `End-to-end test quiz ${Date.now()}-${Math.random()}`,
    description: "Temporary fixture for end-to-end quiz tests.",
    totalQuestions: 5,
    isAiGenerated: 0,
    createdBy: 1,
    publicationStatus: "published",
  });
  await addQuestionsToQuiz(quizId, Array.from({ length: 5 }, (_, index) => ({
    question: `Fixture question ${index + 1}: Which choice is correct?`,
    options: { A: "Correct", B: "Distractor one", C: "Distractor two", D: "Distractor three" },
    answer: "A",
  })));
  return quizId;
}

describe("End-to-End: Quiz Submit and Results", () => {
  it("should submit quiz attempt and retrieve results with correct calculations", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const quizId = await createQuizFixture();

    try {
      // Get questions for the isolated quiz fixture.
      const questions = await caller.quiz.getQuestions({ quizId, shuffle: false });
      expect(questions).toHaveLength(5);

      // Simulate user answers: the server derives correctness from the stored answer key.
      const answers = questions.map((q, index) => ({
        questionId: q.id,
        selectedAnswer: index < 3 ? "A" as const : "B" as const,
      }));

      // Submit the quiz attempt
      const submitResult = await caller.quiz.submitAttempt({
        quizId,
        answers,
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
      expect(firstAnswer.selectedAnswer).toBe("A");
      expect(firstAnswer.isCorrect).toBe(1);

      // Verify incorrect answer
      const incorrectAnswer = results.answers[3];
      expect(incorrectAnswer).toBeDefined();
      expect(incorrectAnswer.isCorrect).toBe(0);
    } finally {
      await deleteQuizAndRelated(quizId, 1);
    }
  });

  it("should delete quiz and related data", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const quizId = await createQuizFixture();

    // The fixture is the only record this scenario is permitted to delete.
    const quizzesBefore = await caller.quiz.getAll();
    const initialCount = quizzesBefore.length;
    expect(quizzesBefore.some((quiz) => quiz.id === quizId)).toBe(true);

    // Delete the quiz
    const deleteResult = await caller.quiz.deleteQuiz({ quizId });
    expect(deleteResult.success).toBe(true);

    // Verify quiz is deleted
    const quizzesAfter = await caller.quiz.getAll();
    expect(quizzesAfter.length).toBeLessThanOrEqual(initialCount);
    expect(quizzesAfter.find((q) => q.id === quizId)).toBeUndefined();
  });
});

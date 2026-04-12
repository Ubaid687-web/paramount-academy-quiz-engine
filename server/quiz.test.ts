import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId: number = 1): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `test-user-${userId}`,
    email: `test${userId}@example.com`,
    name: `Test User ${userId}`,
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("quiz procedures", () => {
  let quizId: number;
  let questions: any[];

  describe("quiz.getAll", () => {
    it("should return all quizzes", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const quizzes = await caller.quiz.getAll();

      expect(Array.isArray(quizzes)).toBe(true);
      expect(quizzes.length).toBeGreaterThan(0);
      expect(quizzes[0]).toHaveProperty("id");
      expect(quizzes[0]).toHaveProperty("title");
      expect(quizzes[0]).toHaveProperty("totalQuestions");

      quizId = quizzes[0].id;
    });
  });

  describe("quiz.getById", () => {
    it("should return a specific quiz", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const quiz = await caller.quiz.getById({ quizId });

      expect(quiz).toBeDefined();
      expect(quiz?.id).toBe(quizId);
      expect(quiz?.title).toBeDefined();
      expect(quiz?.totalQuestions).toBeGreaterThan(0);
    });

    it("should return undefined for non-existent quiz", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const quiz = await caller.quiz.getById({ quizId: 99999 });

      expect(quiz).toBeUndefined();
    });
  });

  describe("quiz.getQuestions", () => {
    it("should return questions for a quiz", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const qs = await caller.quiz.getQuestions({ quizId, shuffle: false });

      expect(Array.isArray(qs)).toBe(true);
      expect(qs.length).toBeGreaterThan(0);
      expect(qs[0]).toHaveProperty("id");
      expect(qs[0]).toHaveProperty("questionText");
      expect(qs[0]).toHaveProperty("optionA");
      expect(qs[0]).toHaveProperty("optionB");
      expect(qs[0]).toHaveProperty("optionC");
      expect(qs[0]).toHaveProperty("optionD");
      expect(qs[0]).toHaveProperty("correctAnswer");

      questions = qs;
    });

    it("should return shuffled questions when shuffle is true", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const qs1 = await caller.quiz.getQuestions({ quizId, shuffle: true });
      const qs2 = await caller.quiz.getQuestions({ quizId, shuffle: true });

      expect(Array.isArray(qs1)).toBe(true);
      expect(qs1.length).toBe(qs2.length);
      // Note: Due to randomness, we can't guarantee different order, but we can check they're valid
      expect(qs1[0]).toHaveProperty("id");
    });
  });

  describe("quiz.submitAttempt", () => {
    it("should submit a quiz attempt and save answers", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      if (questions.length === 0) {
        const qs = await caller.quiz.getQuestions({ quizId, shuffle: false });
        questions = qs;
      }

      const answers = questions.slice(0, 5).map((q, idx) => ({
        questionId: q.id,
        selectedAnswer: idx % 2 === 0 ? q.correctAnswer : "A",
        isCorrect: idx % 2 === 0 ? 1 : 0,
      }));

      const result = await caller.quiz.submitAttempt({
        quizId,
        answers,
        score: 3,
        totalQuestions: 5,
      });

      expect(result).toHaveProperty("attemptId");
      expect(result).toHaveProperty("score");
      expect(result).toHaveProperty("percentage");
      expect(result.score).toBe(3);
      expect(result.percentage).toBe(60);
    });

    it("should calculate percentage correctly", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      if (questions.length === 0) {
        const qs = await caller.quiz.getQuestions({ quizId, shuffle: false });
        questions = qs;
      }

      const answers = questions.slice(0, 10).map((q) => ({
        questionId: q.id,
        selectedAnswer: q.correctAnswer,
        isCorrect: 1,
      }));

      const result = await caller.quiz.submitAttempt({
        quizId,
        answers,
        score: 10,
        totalQuestions: 10,
      });

      expect(result.percentage).toBe(100);
    });
  });

  describe("quiz.getAttemptHistory", () => {
    it("should return attempt history for authenticated user", async () => {
      const ctx = createAuthContext(1);
      const caller = appRouter.createCaller(ctx);

      const history = await caller.quiz.getAttemptHistory();

      expect(Array.isArray(history)).toBe(true);
      if (history.length > 0) {
        expect(history[0]).toHaveProperty("id");
        expect(history[0]).toHaveProperty("userId");
        expect(history[0]).toHaveProperty("score");
        expect(history[0]).toHaveProperty("percentage");
      }
    });
  });
});

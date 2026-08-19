import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { addQuestionsToQuiz, createQuiz, deleteQuizAndRelated } from "./db";

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
  let privateQuizId: number;
  let questions: any[] = [];

  beforeAll(async () => {
    quizId = await createQuiz({
      title: `Quiz procedure test ${Date.now()}`,
      description: "Temporary deterministic fixture for quiz procedure tests.",
      totalQuestions: 10,
      isAiGenerated: 0,
      createdBy: 1,
      publicationStatus: "published",
    });

    await addQuestionsToQuiz(quizId, Array.from({ length: 10 }, (_, index) => ({
      question: `Test question ${index + 1}: Which option is correct?`,
      options: { A: "Correct answer", B: "Distractor one", C: "Distractor two", D: "Distractor three" },
      answer: "A",
    })));

    privateQuizId = await createQuiz({
      title: `Private quiz procedure test ${Date.now()}`,
      description: "Owner-only draft used to verify cross-user access protection.",
      totalQuestions: 1,
      isAiGenerated: 1,
      createdBy: 1,
      sourceContent: "Private textbook extract",
      generationMetadata: JSON.stringify({ provider: "test" }),
      publicationStatus: "draft",
    });
    await addQuestionsToQuiz(privateQuizId, [{ question: "Private question", options: { A: "A", B: "B", C: "C", D: "D" }, answer: "A" }]);
  });

  afterAll(async () => {
    if (quizId) await deleteQuizAndRelated(quizId, 1);
    if (privateQuizId) await deleteQuizAndRelated(privateQuizId, 1);
  });

  describe("quiz.getAll", () => {
    it("should return all quizzes", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const quizzes = await caller.quiz.getAll();

      expect(Array.isArray(quizzes)).toBe(true);
      const testQuiz = quizzes.find((quiz) => quiz.id === quizId);
      expect(testQuiz).toBeDefined();
      expect(testQuiz).toHaveProperty("id");
      expect(testQuiz).toHaveProperty("title");
      expect(testQuiz).toHaveProperty("totalQuestions");
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
      expect(qs[0]).not.toHaveProperty("correctAnswer");

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

      const answers = questions.map((q) => ({
        questionId: q.id,
        selectedAnswer: "A" as const,
      }));

      const result = await caller.quiz.submitAttempt({
        quizId,
        answers,
      });

      expect(result).toHaveProperty("attemptId");
      expect(result).toHaveProperty("score");
      expect(result).toHaveProperty("percentage");
      expect(result.score).toBe(10);
      expect(result.percentage).toBe(100);
    });

    it("should calculate percentage correctly", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      if (questions.length === 0) {
        const qs = await caller.quiz.getQuestions({ quizId, shuffle: false });
        questions = qs;
      }

      const answers = questions.map((q) => ({
        questionId: q.id,
        selectedAnswer: "A" as const,
      }));

      const result = await caller.quiz.submitAttempt({
        quizId,
        answers,
      });

      expect(result.percentage).toBe(100);
    });

    it("derives correctness on the server rather than accepting a claimed client score", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      const answers = questions.map((q, index) => ({
        questionId: q.id,
        selectedAnswer: index === 0 ? "B" as const : "A" as const,
      }));

      const result = await caller.quiz.submitAttempt({ quizId, answers });
      expect(result.score).toBe(9);
      expect(result.percentage).toBe(90);
    });
  });

  describe("quiz confidentiality", () => {
    it("rejects anonymous question delivery", async () => {
      const caller = appRouter.createCaller({ ...createAuthContext(), user: null });
      await expect(caller.quiz.getQuestions({ quizId, shuffle: false })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    });

    it("does not return one learner's attempt result to another learner", async () => {
      const owner = appRouter.createCaller(createAuthContext(1));
      const result = await owner.quiz.submitAttempt({
        quizId,
        answers: questions.map((q) => ({ questionId: q.id, selectedAnswer: "A" as const })),
      });
      const otherUser = appRouter.createCaller(createAuthContext(2));

      await expect(otherUser.quiz.getAttemptResults({ attemptId: result.attemptId })).resolves.toBeUndefined();
    });

    it("does not expose another user's unpublished draft, source snapshot, questions, answer checks, submissions, or deletion action", async () => {
      const otherUser = appRouter.createCaller(createAuthContext(2));
      const visible = await otherUser.quiz.getAll();
      expect(visible.some((quiz) => quiz.id === privateQuizId)).toBe(false);
      expect(await otherUser.quiz.getById({ quizId: privateQuizId })).toBeUndefined();
      await expect(otherUser.quiz.getQuestions({ quizId: privateQuizId, shuffle: false })).rejects.toThrow("unavailable");
      await expect(otherUser.quiz.checkAnswer({ quizId: privateQuizId, questionId: 1, selectedAnswer: "A" })).rejects.toThrow("unavailable");
      await expect(otherUser.quiz.submitAttempt({ quizId: privateQuizId, answers: [{ questionId: 1, selectedAnswer: "A" }] })).rejects.toThrow("unavailable");
      await expect(otherUser.quiz.deleteQuiz({ quizId: privateQuizId })).rejects.toThrow("Only the quiz creator");
    });

    it("strips private source snapshots from an accessible published quiz response", async () => {
      const otherUser = appRouter.createCaller(createAuthContext(2));
      const quiz = await otherUser.quiz.getById({ quizId });
      expect(quiz).toBeDefined();
      expect(quiz).not.toHaveProperty("sourceContent");
      expect(quiz).not.toHaveProperty("scopeSnapshot");
      expect(quiz).not.toHaveProperty("generationMetadata");
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

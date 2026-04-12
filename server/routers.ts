import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  quiz: router({
    getAll: publicProcedure.query(async () => {
      const { getQuizzes } = await import("./db");
      return getQuizzes();
    }),

    getById: publicProcedure
      .input(z.object({ quizId: z.number() }))
      .query(async ({ input }) => {
        const { getQuizById } = await import("./db");
        return getQuizById(input.quizId);
      }),

    getQuestions: publicProcedure
      .input(z.object({ quizId: z.number(), shuffle: z.boolean().default(false) }))
      .query(async ({ input }) => {
        const { getQuestionsByQuizId } = await import("./db");
        return getQuestionsByQuizId(input.quizId, input.shuffle);
      }),

    submitAttempt: protectedProcedure
      .input(
        z.object({
          quizId: z.number(),
          answers: z.array(
            z.object({
              questionId: z.number(),
              selectedAnswer: z.string(),
              isCorrect: z.number(),
            })
          ),
          score: z.number(),
          totalQuestions: z.number(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { createQuizAttempt, saveUserAnswers } = await import("./db");
        const percentage = Math.round((input.score / input.totalQuestions) * 100);

        const attemptId = await createQuizAttempt({
          userId: ctx.user.id,
          quizId: input.quizId,
          score: input.score,
          totalQuestions: input.totalQuestions,
          percentage,
          startedAt: new Date(),
          completedAt: new Date(),
        });

        const userAnswersData = input.answers.map((answer) => ({
          attemptId,
          questionId: answer.questionId,
          selectedAnswer: answer.selectedAnswer,
          isCorrect: answer.isCorrect,
        }));

        await saveUserAnswers(userAnswersData);

        return { attemptId, score: input.score, percentage };
      }),

    getAttemptResults: publicProcedure
      .input(z.object({ attemptId: z.number() }))
      .query(async ({ input }) => {
        const { getAttemptWithAnswers } = await import("./db");
        return getAttemptWithAnswers(input.attemptId);
      }),

    getAttemptHistory: protectedProcedure.query(async ({ ctx }) => {
      const { getUserAttemptHistory } = await import("./db");
      return getUserAttemptHistory(ctx.user.id);
    }),
  }),
});

export type AppRouter = typeof appRouter;

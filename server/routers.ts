import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { sharingRouter } from "./sharingRouter";
import { spacedRepetitionRouter } from "./spacedRepetitionRouter";

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

    deleteQuiz: protectedProcedure
      .input(z.object({ quizId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { deleteQuizAndRelated } = await import("./db");
        return deleteQuizAndRelated(input.quizId, ctx.user.id);
      }),
  }),

  sharing: sharingRouter,
  spaced: spacedRepetitionRouter,

  aiAgent: router({
    generateMCQs: protectedProcedure
      .input(
        z.object({
          contentText: z.string().min(100, "Content must be at least 100 characters"),
          numQuestions: z.number().min(5).max(50),
          difficulty: z.enum(["balanced", "easy", "medium", "hard"]).default("balanced"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { generateMCQsFromContent } = await import("./aiAgent");
        return generateMCQsFromContent(
          ctx.user.id,
          input.contentText,
          input.numQuestions,
          input.difficulty
        );
      }),

    saveGeneratedQuiz: protectedProcedure
      .input(
        z.object({
          jobId: z.number(),
          quizTitle: z.string().min(1),
          mcqs: z.array(z.object({
            question: z.string(),
            options: z.object({
              A: z.string(),
              B: z.string(),
              C: z.string(),
              D: z.string(),
            }),
            answer: z.string(),
            explanation: z.string(),
            difficulty: z.string(),
          })),
          sourceContent: z.string(),
          difficulty: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { getGenerationJob } = await import("./db");
        const { saveGeneratedQuizToDatabase } = await import("./aiAgent");

        const job = await getGenerationJob(input.jobId);
        if (!job || job.userId !== ctx.user.id) {
          throw new Error("Job not found or unauthorized");
        }

        const quiz = await saveGeneratedQuizToDatabase(
          ctx.user.id,
          input.jobId,
          input.quizTitle,
          input.mcqs,
          input.sourceContent,
          input.difficulty
        );

        return { success: true, quizId: quiz.id };
      }),

    getGenerationStatus: protectedProcedure
      .input(z.object({ jobId: z.number() }))
      .query(async ({ ctx, input }) => {
        const { getGenerationJob } = await import("./db");
        const job = await getGenerationJob(input.jobId);

        if (!job || job.userId !== ctx.user.id) {
          throw new Error("Job not found or unauthorized");
        }

        return job;
      }),
  }),
});

export type AppRouter = typeof appRouter;
// Routers are added at the end

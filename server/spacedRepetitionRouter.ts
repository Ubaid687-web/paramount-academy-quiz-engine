import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { eq, and, gte, lte } from "drizzle-orm";
import { getDb } from "./db";
import {
  reviewSchedules,
  reviewHistory,
  userQuestionStats,
  quizzes,
  questions,
  quizAttempts,
  userAnswers,
} from "../drizzle/schema";

/**
 * SM-2 Spaced Repetition Algorithm Implementation
 * Based on SuperMemo 2 algorithm for optimal learning intervals
 */
class SM2Algorithm {
  /**
   * Calculate next interval and ease factor based on user performance
   * @param easeFactor Current ease factor (stored as int * 1000)
   * @param repetitions Number of successful repetitions
   * @param quality User rating (0-4: again, hard, good, easy)
   */
  static calculateNextInterval(easeFactor: number, repetitions: number, quality: number, prevInterval: number = 1) {
    // Quality: 0=again, 1=hard, 2=good, 3=easy
    const qualityMap = { again: 0, hard: 1, good: 2, easy: 3 };
    const q = typeof quality === "string" ? qualityMap[quality as keyof typeof qualityMap] : quality;

    // If quality < 2, reset repetitions
    if (q < 2) {
      return {
        interval: 1,
        easeFactor: Math.max(1300, easeFactor - 300), // Min ease factor 1.3
        repetitions: 0,
      };
    }

    // Calculate new ease factor
    let newEaseFactor = easeFactor + (50 * q - 200);
    newEaseFactor = Math.max(1300, Math.min(2500, newEaseFactor)); // Clamp between 1.3 and 2.5

    // Calculate interval based on SM-2 algorithm
    let interval: number;
    if (repetitions === 0) {
      interval = 1; // First review: 1 day
    } else if (repetitions === 1) {
      interval = 3; // Second review: 3 days
    } else {
      // Subsequent reviews: previous interval * ease factor
      interval = Math.round(prevInterval * (newEaseFactor / 1000));
    }

    return {
      interval,
      easeFactor: newEaseFactor,
      repetitions: repetitions + 1,
    };
  }
}

/**
 * Spaced Repetition Router
 * Handles review scheduling, tracking, and SM-2 algorithm
 */
export const spacedRepetitionRouter = router({
  /**
   * Get questions due for review today
   */
  getNextReview: protectedProcedure
    .input(z.object({ quizId: z.number().int().positive().optional() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      try {
        const now = new Date();

        // Get all due reviews for user
        let query = db
          .select({
            schedule: reviewSchedules,
            question: questions,
            quiz: quizzes,
          })
          .from(reviewSchedules)
          .innerJoin(questions, eq(reviewSchedules.quizId, questions.quizId))
          .innerJoin(quizzes, eq(reviewSchedules.quizId, quizzes.id))
          .where(
            and(
              eq(reviewSchedules.userId, ctx.user.id),
              lte(reviewSchedules.nextReviewDate, now),
              input.quizId ? eq(reviewSchedules.quizId, input.quizId) : undefined
            )
          );

        const dueReviews = await query;

        return {
          totalDue: dueReviews.length,
          reviews: dueReviews.slice(0, 10), // Return top 10 for this session
        };
      } catch (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to get reviews" });
      }
    }),

  /**
   * Record a review attempt and update schedule
   */
  recordReview: protectedProcedure
    .input(
      z.object({
        questionId: z.number().int().positive(),
        quizId: z.number().int().positive(),
        result: z.enum(["again", "hard", "good", "easy"]),
        difficulty: z.number().int().min(1).max(5),
        timeSpent: z.number().int().positive().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      try {
        // Get current schedule
        const schedules = await db
          .select()
          .from(reviewSchedules)
          .where(
            and(
              eq(reviewSchedules.userId, ctx.user.id),
              eq(reviewSchedules.quizId, input.quizId)
            )
          )
          .limit(1);

        const schedule = schedules[0];
        if (!schedule) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Review schedule not found" });
        }

        // Calculate next interval using SM-2
        const resultMap = { again: 0, hard: 1, good: 2, easy: 3 };
        const { interval, easeFactor, repetitions } = SM2Algorithm.calculateNextInterval(
          schedule.easeFactor,
          schedule.repetitions,
          resultMap[input.result],
          schedule.interval
        );

        // Calculate next review date
        const nextReviewDate = new Date();
        nextReviewDate.setDate(nextReviewDate.getDate() + interval);

        // Record review history
        await db.insert(reviewHistory).values({
          userId: ctx.user.id,
          questionId: input.questionId,
          result: input.result,
          difficulty: input.difficulty,
          timeSpent: input.timeSpent,
        });

        // Update schedule
        await db
          .update(reviewSchedules)
          .set({
            nextReviewDate,
            interval,
            easeFactor,
            repetitions,
            lastReviewDate: new Date(),
          })
          .where(eq(reviewSchedules.id, schedule.id));

        // Update question stats
        const isCorrect = input.result !== "again";
        const stats = await db
          .select()
          .from(userQuestionStats)
          .where(
            and(
              eq(userQuestionStats.userId, ctx.user.id),
              eq(userQuestionStats.questionId, input.questionId)
            )
          )
          .limit(1);

        if (stats.length) {
          const newStats = {
            correctCount: stats[0].correctCount + (isCorrect ? 1 : 0),
            incorrectCount: stats[0].incorrectCount + (isCorrect ? 0 : 1),
            lastReviewDate: new Date(),
          };
          await db
            .update(userQuestionStats)
            .set(newStats)
            .where(eq(userQuestionStats.id, stats[0].id));
        } else {
          await db.insert(userQuestionStats).values({
            userId: ctx.user.id,
            questionId: input.questionId,
            correctCount: isCorrect ? 1 : 0,
            incorrectCount: isCorrect ? 0 : 1,
            lastReviewDate: new Date(),
          });
        }

        return {
          success: true,
          nextReviewDate,
          interval,
          easeFactor: easeFactor / 1000, // Return as decimal
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to record review" });
      }
    }),

  /**
   * Get review statistics for user
   */
  getReviewStats: protectedProcedure
    .input(z.object({ quizId: z.number().int().positive().optional() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      try {
        // Get user's question stats
        let statsQuery = db
          .select()
          .from(userQuestionStats)
          .where(eq(userQuestionStats.userId, ctx.user.id));

        const allStats = await statsQuery;

        // Filter by quiz if provided
        let quizStats = allStats;
        if (input.quizId) {
          const quizQuestions = await db
            .select({ id: questions.id })
            .from(questions)
            .where(eq(questions.quizId, input.quizId));

          const questionIds = new Set(quizQuestions.map(q => q.id));
          quizStats = allStats.filter(s => questionIds.has(s.questionId));
        }

        // Calculate statistics
        const totalReviewed = quizStats.length;
        const totalCorrect = quizStats.reduce((sum, s) => sum + s.correctCount, 0);
        const totalIncorrect = quizStats.reduce((sum, s) => sum + s.incorrectCount, 0);
        const accuracy = totalReviewed > 0 ? Math.round((totalCorrect / (totalCorrect + totalIncorrect)) * 100) : 0;

        // Get due reviews count
        const now = new Date();
        const dueReviews = await db
          .select({ id: reviewSchedules.id })
          .from(reviewSchedules)
          .where(
            and(
              eq(reviewSchedules.userId, ctx.user.id),
              lte(reviewSchedules.nextReviewDate, now),
              input.quizId ? eq(reviewSchedules.quizId, input.quizId) : undefined
            )
          );

        return {
          totalReviewed,
          totalCorrect,
          totalIncorrect,
          accuracy,
          dueCount: dueReviews.length,
          stats: quizStats,
        };
      } catch (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to get review stats" });
      }
    }),

  /**
   * Initialize spaced repetition for a quiz after attempt
   */
  initializeReview: protectedProcedure
    .input(
      z.object({
        attemptId: z.number().int().positive(),
        quizId: z.number().int().positive(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      try {
        // Check if review schedule already exists
        const existing = await db
          .select()
          .from(reviewSchedules)
          .where(
            and(
              eq(reviewSchedules.userId, ctx.user.id),
              eq(reviewSchedules.quizId, input.quizId)
            )
          )
          .limit(1);

        if (existing.length) {
          return { success: true, message: "Review schedule already exists" };
        }

        // Create review schedule - first review tomorrow
        const nextReviewDate = new Date();
        nextReviewDate.setDate(nextReviewDate.getDate() + 1);

        await db.insert(reviewSchedules).values({
          userId: ctx.user.id,
          quizId: input.quizId,
          nextReviewDate,
          interval: 1,
          easeFactor: 2500, // Start with 2.5
          repetitions: 0,
        });

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to initialize review" });
      }
    }),

  /**
   * Get review history for a question
   */
  getQuestionHistory: protectedProcedure
    .input(z.object({ questionId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      try {
        const history = await db
          .select()
          .from(reviewHistory)
          .where(
            and(
              eq(reviewHistory.userId, ctx.user.id),
              eq(reviewHistory.questionId, input.questionId)
            )
          );

        return history;
      } catch (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to get history" });
      }
    }),
});

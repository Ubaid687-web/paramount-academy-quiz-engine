import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { eq, and } from "drizzle-orm";
import { getDb } from "./db";
import { quizShares, quizCollaborators, sharedQuizAttempts, quizzes, questions } from "../drizzle/schema";

/**
 * Quiz Sharing & Collaboration Router
 * Handles shareable links, collaborators, and shared attempt tracking
 */
export const sharingRouter = router({
  /**
   * Create a shareable link for a quiz
   * Generates a unique token with optional expiration and usage limits
   */
  createShareLink: protectedProcedure
    .input(
      z.object({
        quizId: z.number().int().positive(),
        expiresAt: z.date().optional(),
        maxUses: z.number().int().positive().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      try {
        // Verify quiz ownership
        const quiz = await db.select().from(quizzes).where(eq(quizzes.id, input.quizId)).limit(1);
        if (!quiz.length) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Quiz not found" });
        }

        if (quiz[0].createdBy !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You can only share your own quizzes" });
        }

        // Generate unique share token
        const shareToken = nanoid(32);

        // Create share record
        const result = await db.insert(quizShares).values({
          quizId: input.quizId,
          shareToken,
          createdBy: ctx.user.id,
          expiresAt: input.expiresAt,
          maxUses: input.maxUses,
          currentUses: 0,
          isActive: 1,
        });

        return {
          shareToken,
          shareUrl: `${process.env.VITE_APP_URL || "https://aiquizhub.com"}/shared/${shareToken}`,
          expiresAt: input.expiresAt,
          maxUses: input.maxUses,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create share link" });
      }
    }),

  /**
   * Get a shared quiz by token (no authentication required)
   * Increments usage counter and validates expiration/limits
   */
  getSharedQuiz: publicProcedure
    .input(z.object({ shareToken: z.string().min(1) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      try {
        // Get share record
        const shares = await db.select().from(quizShares).where(eq(quizShares.shareToken, input.shareToken)).limit(1);

        if (!shares.length) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Share link not found" });
        }

        const share = shares[0];

        // Validate share is active
        if (!share.isActive) {
          throw new TRPCError({ code: "FORBIDDEN", message: "This share link has been disabled" });
        }

        // Check expiration
        if (share.expiresAt && new Date() > share.expiresAt) {
          throw new TRPCError({ code: "FORBIDDEN", message: "This share link has expired" });
        }

        // Check usage limit
        if (share.maxUses && share.currentUses >= share.maxUses) {
          throw new TRPCError({ code: "FORBIDDEN", message: "This share link has reached its usage limit" });
        }

        // Get quiz and questions
        const quizData = await db.select().from(quizzes).where(eq(quizzes.id, share.quizId)).limit(1);

        if (!quizData.length) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Quiz not found" });
        }

        const questionsData = await db.select().from(questions).where(eq(questions.quizId, share.quizId));

        // Increment usage counter
        await db
          .update(quizShares)
          .set({ currentUses: (share.currentUses || 0) + 1 })
          .where(eq(quizShares.id, share.id));

        return {
          quiz: quizData[0],
          questions: questionsData,
          shareToken: input.shareToken,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to retrieve shared quiz" });
      }
    }),

  /**
   * List quizzes shared with the current user
   */
  listSharedWithMe: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    try {
      // Get quizzes where user is a collaborator
      const collaborations = await db
        .select({
          quizId: quizCollaborators.quizId,
          role: quizCollaborators.role,
          quiz: quizzes,
        })
        .from(quizCollaborators)
        .innerJoin(quizzes, eq(quizCollaborators.quizId, quizzes.id))
        .where(eq(quizCollaborators.userId, ctx.user.id));

      return collaborations;
    } catch (error) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to list shared quizzes" });
    }
  }),

  /**
   * Add a collaborator to a quiz
   */
  addCollaborator: protectedProcedure
    .input(
      z.object({
        quizId: z.number().int().positive(),
        userId: z.number().int().positive(),
        role: z.enum(["viewer", "editor", "admin"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      try {
        // Verify quiz ownership
        const quiz = await db.select().from(quizzes).where(eq(quizzes.id, input.quizId)).limit(1);

        if (!quiz.length) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Quiz not found" });
        }

        if (quiz[0].createdBy !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only quiz owner can add collaborators" });
        }

        // Add collaborator
        await db.insert(quizCollaborators).values({
          quizId: input.quizId,
          userId: input.userId,
          role: input.role,
          addedBy: ctx.user.id,
        });

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to add collaborator" });
      }
    }),

  /**
   * Remove a collaborator from a quiz
   */
  removeCollaborator: protectedProcedure
    .input(
      z.object({
        quizId: z.number().int().positive(),
        userId: z.number().int().positive(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      try {
        // Verify quiz ownership
        const quiz = await db.select().from(quizzes).where(eq(quizzes.id, input.quizId)).limit(1);

        if (!quiz.length) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Quiz not found" });
        }

        if (quiz[0].createdBy !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only quiz owner can remove collaborators" });
        }

        // Remove collaborator
        await db
          .delete(quizCollaborators)
          .where(and(eq(quizCollaborators.quizId, input.quizId), eq(quizCollaborators.userId, input.userId)));

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to remove collaborator" });
      }
    }),

  /**
   * Track a shared quiz attempt
   */
  trackSharedAttempt: protectedProcedure
    .input(
      z.object({
        shareToken: z.string().min(1),
        attemptId: z.number().int().positive(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      try {
        // Get share record
        const shares = await db.select().from(quizShares).where(eq(quizShares.shareToken, input.shareToken)).limit(1);

        if (!shares.length) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Share link not found" });
        }

        // Record the attempt
        await db.insert(sharedQuizAttempts).values({
          shareTokenId: shares[0].id,
          userId: ctx.user.id,
          attemptId: input.attemptId,
        });

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to track attempt" });
      }
    }),

  /**
   * Get share statistics for a quiz
   */
  getShareStats: protectedProcedure
    .input(z.object({ quizId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      try {
        // Verify quiz ownership
        const quiz = await db.select().from(quizzes).where(eq(quizzes.id, input.quizId)).limit(1);

        if (!quiz.length) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Quiz not found" });
        }

        if (quiz[0].createdBy !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only quiz owner can view stats" });
        }

        // Get share records
        const shares = await db.select().from(quizShares).where(eq(quizShares.quizId, input.quizId));

        // Get collaborators
        const collaborators = await db
          .select()
          .from(quizCollaborators)
          .where(eq(quizCollaborators.quizId, input.quizId));

        return {
          totalShares: shares.length,
          totalUses: shares.reduce((sum, s) => sum + (s.currentUses || 0), 0),
          activeShares: shares.filter(s => s.isActive).length,
          collaboratorCount: collaborators.length,
          shareLinks: shares,
          collaboratorsList: collaborators,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to get share stats" });
      }
    }),
});

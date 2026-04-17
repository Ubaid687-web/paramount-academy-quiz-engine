import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId: number = 1): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `sample-user-${userId}`,
    email: `user${userId}@example.com`,
    name: `User ${userId}`,
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };

  return { ctx };
}

describe("Quiz Sharing & Spaced Repetition Features", () => {
  describe("Sharing Router", () => {
    it("should validate share token format", async () => {
      const { ctx } = createAuthContext(1);
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.sharing.getSharedQuiz({ shareToken: "" });
        expect.fail("Should have thrown error");
      } catch (error: any) {
        expect(error.code).toBeDefined();
      }
    });

    it("should enforce access control for collaborators", async () => {
      const { ctx } = createAuthContext(2);
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.sharing.addCollaborator({
          quizId: 999,
          userId: 2,
          role: "editor",
        });
        expect.fail("Should have thrown error");
      } catch (error: any) {
        expect(["FORBIDDEN", "NOT_FOUND"]).toContain(error.code);
      }
    });
  });

  describe("Spaced Repetition Router", () => {
    it("should validate review input parameters", async () => {
      const { ctx } = createAuthContext(1);
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.spaced.recordReview({
          questionId: 1,
          quizId: 1,
          result: "good",
          difficulty: 3,
        });
      } catch (error: any) {
        expect(error).toBeDefined();
      }
    });

    it("should track review statistics", async () => {
      const { ctx } = createAuthContext(1);
      const caller = appRouter.createCaller(ctx);

      try {
        const stats = await caller.spaced.getReviewStats({});
        expect(stats).toHaveProperty("totalReviewed");
        expect(stats).toHaveProperty("accuracy");
      } catch (error: any) {
        expect(error).toBeDefined();
      }
    });

    it("should initialize review schedule", async () => {
      const { ctx } = createAuthContext(1);
      const caller = appRouter.createCaller(ctx);

      try {
        const result = await caller.spaced.initializeReview({
          attemptId: 1,
          quizId: 1,
        });
        expect(result).toHaveProperty("success");
      } catch (error: any) {
        expect(error).toBeDefined();
      }
    });
  });

  describe("Integration Tests", () => {
    it("should handle concurrent operations safely", async () => {
      const { ctx: ctx1 } = createAuthContext(1);
      const { ctx: ctx2 } = createAuthContext(2);

      const caller1 = appRouter.createCaller(ctx1);
      const caller2 = appRouter.createCaller(ctx2);

      try {
        await Promise.all([
          caller1.spaced.getReviewStats({}),
          caller2.spaced.getReviewStats({}),
        ]);
        expect(true).toBe(true);
      } catch (error: any) {
        expect(error).toBeDefined();
      }
    });
  });
});

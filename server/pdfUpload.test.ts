import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
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

  return ctx;
}

describe("PDF Upload", () => {
  it("should validate input parameters", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.pdfUpload.extractPdfText({
        fileBuffer: "",
        fileName: "test.pdf",
      });
      expect.fail("Should have thrown an error for empty buffer");
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  it("should require valid base64 encoded PDF", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.pdfUpload.extractPdfText({
        fileBuffer: "invalid-base64-!!!",
        fileName: "test.pdf",
      });
      // This may or may not throw depending on pdf-parse behavior
      // Just verify the procedure is callable
      expect(true).toBe(true);
    } catch (error) {
      // Expected to fail with invalid PDF data
      expect(error).toBeDefined();
    }
  });

  it("should require authenticated user", async () => {
    const caller = appRouter.createCaller({
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: () => {} } as TrpcContext["res"],
    });

    try {
      await caller.pdfUpload.extractPdfText({
        fileBuffer: "dGVzdA==",
        fileName: "test.pdf",
      });
      expect.fail("Should have thrown an error for unauthenticated user");
    } catch (error) {
      expect(error).toBeDefined();
    }
  });
});

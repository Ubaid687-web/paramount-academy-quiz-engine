import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createContext(role: "admin" | "teacher" | "user"): TrpcContext {
  return {
    user: {
      id: 42,
      openId: `${role}-scope-user`,
      name: "Scope User",
      email: "scope@example.com",
      loginMethod: "manus",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("teacher-facing curriculum catalog", () => {
  it("returns the read-only active chapter catalog to teachers without requiring an administrator role", async () => {
    const caller = appRouter.createCaller(createContext("teacher"));

    const result = await caller.curriculum.getActiveScopeCatalog({ subject: "physics" });

    expect(result === null || typeof result === "object").toBe(true);
  });

  it("does not expose active source-scope metadata to an ordinary user", async () => {
    const caller = appRouter.createCaller(createContext("user"));

    await expect(caller.curriculum.getActiveScopeCatalog({ subject: "physics" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("returns read-only MCQ source readiness without exposing curriculum management actions", async () => {
    const caller = appRouter.createCaller(createContext("user"));

    const result = await caller.assessment.getAvailability({ subject: "physics" });

    expect(typeof result.supportedModes.mcq).toBe("boolean");
  });
});

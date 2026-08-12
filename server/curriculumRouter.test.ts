import { describe, expect, it } from "vitest";
import { TRPCError } from "@trpc/server";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createContext(role: "admin" | "user"): TrpcContext {
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

describe("curriculum.getActiveScopeCatalog", () => {
  it("rejects students because chapter sources and scope options are administrator-only", async () => {
    const caller = appRouter.createCaller(createContext("user"));

    await expect(caller.curriculum.getActiveScopeCatalog({ subject: "physics" }))
      .rejects.toMatchObject<Partial<TRPCError>>({ code: "FORBIDDEN" });
  });
});

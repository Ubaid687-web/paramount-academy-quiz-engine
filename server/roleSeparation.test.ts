import { describe, expect, it } from "vitest";
import type { TrpcContext } from "./_core/context";
import { appRouter } from "./routers";

function createContext(role: "user" | "teacher" | "admin"): TrpcContext {
  return {
    user: {
      id: role === "admin" ? 1 : role === "teacher" ? 2 : 3,
      openId: `role-${role}`,
      email: `${role}@example.com`,
      name: role,
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

describe("teacher and Portal Admin separation", () => {
  it("keeps curriculum administration and staff role management outside a teacher account", async () => {
    const teacher = appRouter.createCaller(createContext("teacher"));

    await expect(teacher.curriculum.listSets()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(teacher.staff.listRoleDirectory()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("keeps ordinary accounts outside teacher and Portal Admin workflows", async () => {
    const ordinaryUser = appRouter.createCaller(createContext("user"));

    await expect(ordinaryUser.curriculum.listSets()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(ordinaryUser.staff.listRoleDirectory()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

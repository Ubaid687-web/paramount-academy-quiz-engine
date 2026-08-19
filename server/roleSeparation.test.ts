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

const exportInput = {
  title: "Teacher export check",
  mcqs: [{
    question: "Which statement is supported by the approved source?",
    options: { A: "Supported", B: "Distractor one", C: "Distractor two", D: "Distractor three" },
    answer: "A" as const,
    explanation: "The approved source supports option A.",
    sourceReference: "Chapter 1, page 1",
    learningObjective: "Verify a source-supported statement.",
  }],
};

describe("teacher and Portal Admin separation", () => {
  it("allows a teacher to export an assessment paper without granting curriculum administration", async () => {
    const teacher = appRouter.createCaller(createContext("teacher"));

    await expect(teacher.printablePaper.renderMcqPaper(exportInput)).resolves.toBeDefined();
    await expect(teacher.curriculum.listSets()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(teacher.staff.listRoleDirectory()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("keeps ordinary accounts outside teacher and Portal Admin workflows", async () => {
    const ordinaryUser = appRouter.createCaller(createContext("user"));

    await expect(ordinaryUser.printablePaper.renderMcqPaper(exportInput)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(ordinaryUser.curriculum.listSets()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(ordinaryUser.staff.listRoleDirectory()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

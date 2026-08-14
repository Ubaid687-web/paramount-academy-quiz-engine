import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createReplacementCurriculumSet: vi.fn(),
  activateAssessmentPatternSource: vi.fn(),
}));

vi.mock("./db", () => ({
  createReplacementCurriculumSet: mocks.createReplacementCurriculumSet,
  activateAssessmentPatternSource: mocks.activateAssessmentPatternSource,
}));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createContext(role: "admin" | "user"): TrpcContext {
  return {
    user: { id: 77, openId: `lifecycle-${role}`, name: "Lifecycle User", email: "lifecycle@example.com", loginMethod: "manus", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("curriculum lifecycle administration", () => {
  it("creates a linked draft replacement only through Portal Admin", async () => {
    mocks.createReplacementCurriculumSet.mockResolvedValue({ id: 901, status: "draft", replacesSetId: 60001 });
    const caller = appRouter.createCaller(createContext("admin"));

    await expect(caller.curriculum.replaceActiveSet({ currentSetId: 60001, label: "FBISE Physics replacement", editionLabel: "2027 edition" })).resolves.toMatchObject({ id: 901, status: "draft" });
    expect(mocks.createReplacementCurriculumSet).toHaveBeenCalledWith(60001, { label: "FBISE Physics replacement", editionLabel: "2027 edition", createdBy: 77 });
  });

  it("keeps paper-pattern activation restricted to Portal Admin", async () => {
    const caller = appRouter.createCaller(createContext("user"));
    await expect(caller.curriculum.activatePaperPatternSource({ sourceId: 41 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.activateAssessmentPatternSource).not.toHaveBeenCalled();
  });
});

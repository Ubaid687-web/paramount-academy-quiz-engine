import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({
  getActiveCurriculumScopeCatalog: vi.fn(),
  generateMCQsFromContent: vi.fn(),
}));

vi.mock("./db", () => ({ getActiveCurriculumScopeCatalog: mocks.getActiveCurriculumScopeCatalog }));
vi.mock("./aiAgent", () => ({ generateMCQsFromContent: mocks.generateMCQsFromContent }));

import { appRouter } from "./routers";

function createAdminContext(): TrpcContext {
  return {
    user: {
      id: 7,
      openId: "admin-scoped-generation",
      email: "admin@example.com",
      name: "Admin",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("scoped curriculum draft generation", () => {
  it("resolves the reviewed chapter server-side and passes its immutable provenance to the draft engine", async () => {
    mocks.getActiveCurriculumScopeCatalog.mockResolvedValue({
      curriculumSet: { id: 77, grade: "10", subject: "physics", label: "FBISE Grade 10 Physics", editionLabel: "2026" },
      chapters: [{
        id: 10, curriculumSetId: 77, sequence: 1, code: "Ch. 10", title: "Kinematics", blockKey: null, partKey: null,
        startPage: 1, endPage: 20, contentText: "Kinematics explains displacement, velocity, acceleration, and the relationships between them. ".repeat(4), isActive: 1,
      }],
      segments: [],
      templates: [],
      templateMemberships: [],
    });
    mocks.generateMCQsFromContent.mockResolvedValue({ jobId: 200, mcqs: [], analysis: {}, draft: { status: "success" } });

    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.aiAgent.generateMCQs({
      numQuestions: 12,
      difficulty: "balanced",
      scope: { subject: "physics", scopeType: "single_chapter", chapterIds: [10] },
    });

    expect(result).toMatchObject({ jobId: 200, draft: { status: "success" } });
    expect(mocks.generateMCQsFromContent).toHaveBeenCalledWith(
      7,
      expect.stringContaining("Kinematics explains displacement"),
      12,
      "balanced",
      expect.objectContaining({
        sourceType: "curriculum_scope",
        sourceTitle: "Kinematics",
        curriculumSetId: 77,
        scopeType: "single_chapter",
        selectedChapterIds: [10],
        scopeSnapshot: expect.objectContaining({ displayLabel: "Kinematics" }),
      })
    );
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({
  getGenerationProviderSettings: vi.fn(),
  setGeminiFallbackEnabled: vi.fn(),
  listAdminGenerationHistory: vi.fn(),
  listReviewedAssessmentPatternGuidance: vi.fn(),
  listApprovedStyleAnchorExamples: vi.fn(),
  listEligibleStyleAnchorQuestions: vi.fn(),
  approveStyleAnchorExample: vi.fn(),
  removeStyleAnchorExample: vi.fn(),
}));

vi.mock("./db", () => ({
  getGenerationProviderSettings: mocks.getGenerationProviderSettings,
  setGeminiFallbackEnabled: mocks.setGeminiFallbackEnabled,
  listAdminGenerationHistory: mocks.listAdminGenerationHistory,
  listReviewedAssessmentPatternGuidance: mocks.listReviewedAssessmentPatternGuidance,
  listApprovedStyleAnchorExamples: mocks.listApprovedStyleAnchorExamples,
  listEligibleStyleAnchorQuestions: mocks.listEligibleStyleAnchorQuestions,
  approveStyleAnchorExample: mocks.approveStyleAnchorExample,
  removeStyleAnchorExample: mocks.removeStyleAnchorExample,
}));

import { appRouter } from "./routers";

function context(role: "admin" | "teacher"): TrpcContext {
  return {
    user: { id: 7, openId: `${role}-generation-admin`, email: `${role}@example.com`, name: role, loginMethod: "manus", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("Portal Admin generation controls", () => {
  beforeEach(() => {
    mocks.getGenerationProviderSettings.mockReset().mockResolvedValue({ id: 1, geminiFallbackEnabled: 0, updatedBy: null, updatedAt: new Date() });
    mocks.setGeminiFallbackEnabled.mockReset().mockResolvedValue({ id: 1, geminiFallbackEnabled: 1, updatedBy: 7, updatedAt: new Date() });
    mocks.listAdminGenerationHistory.mockReset().mockResolvedValue([{ id: 31, generationProvider: "gemini_byok", fallbackUsed: 1, primaryFailureType: "quota_exhaustion" }]);
    mocks.listReviewedAssessmentPatternGuidance.mockReset().mockResolvedValue([{ sourceKind: "past_paper", academicYear: "2026", sectionAInstruction: "Attempt all MCQs." }]);
    mocks.listApprovedStyleAnchorExamples.mockReset().mockResolvedValue([]);
    mocks.listEligibleStyleAnchorQuestions.mockReset().mockResolvedValue([]);
    mocks.approveStyleAnchorExample.mockReset().mockResolvedValue([]);
    mocks.removeStyleAnchorExample.mockReset().mockResolvedValue([]);
  });

  it("allows Portal Admin to inspect and update the fallback setting and provider history", async () => {
    const caller = appRouter.createCaller(context("admin"));

    const settings = await caller.generation.getProviderSettings();
    const updated = await caller.generation.setGeminiFallbackEnabled({ enabled: true });
    const history = await caller.generation.listHistory({ limit: 20 });

    expect(settings).toMatchObject({ id: 1, geminiFallbackEnabled: 0, geminiCredentialConfigured: expect.any(Boolean) });
    expect(updated).toMatchObject({ geminiFallbackEnabled: 1, updatedBy: 7 });
    expect(history[0]).toMatchObject({ generationProvider: "gemini_byok", primaryFailureType: "quota_exhaustion" });
    expect(mocks.setGeminiFallbackEnabled).toHaveBeenCalledWith(true, 7);
    expect(mocks.listAdminGenerationHistory).toHaveBeenCalledWith(20);
  });

  it("shows a first-use style anchor without examples and keeps its controls Portal Admin-only", async () => {
    const adminCaller = appRouter.createCaller(context("admin"));
    const anchor = await adminCaller.generation.getStyleAnchor({ programme: { board: "FBISE", grade: "10", subject: "physics" } });

    expect(anchor.anchor).toMatchObject({ approvedExampleCount: 0, hasReviewedPatternRules: true });
    expect(anchor.approvedExamples).toEqual([]);

    const teacherCaller = appRouter.createCaller(context("teacher"));
    await expect(teacherCaller.generation.getStyleAnchor({ programme: { board: "FBISE", grade: "10", subject: "physics" } })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(teacherCaller.generation.approveStyleAnchorExample({ programme: { board: "FBISE", grade: "10", subject: "physics" }, questionId: 12 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("blocks teachers from provider settings and generation-history monitoring", async () => {
    const caller = appRouter.createCaller(context("teacher"));

    await expect(caller.generation.getProviderSettings()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.generation.listHistory({ limit: 20 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

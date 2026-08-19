import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({
  getGenerationProviderSettings: vi.fn(),
  setGeminiFallbackEnabled: vi.fn(),
  listAdminGenerationHistory: vi.fn(),
}));

vi.mock("./db", () => ({
  getGenerationProviderSettings: mocks.getGenerationProviderSettings,
  setGeminiFallbackEnabled: mocks.setGeminiFallbackEnabled,
  listAdminGenerationHistory: mocks.listAdminGenerationHistory,
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

  it("blocks teachers from provider settings and generation-history monitoring", async () => {
    const caller = appRouter.createCaller(context("teacher"));

    await expect(caller.generation.getProviderSettings()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.generation.listHistory({ limit: 20 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

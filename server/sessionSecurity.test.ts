import { beforeEach, describe, expect, it, vi } from "vitest";

const { createAppSession, revokeAppSession } = vi.hoisted(() => ({
  createAppSession: vi.fn(),
  revokeAppSession: vi.fn(),
}));

vi.mock("./_core/env", () => ({
  ENV: {
    appId: "test-app",
    cookieSecret: "test-session-signing-secret-with-32-bytes",
    oAuthServerUrl: "https://oauth.example.test",
  },
}));

vi.mock("./db", () => ({
  createAppSession,
  revokeAppSession,
}));

import { sdk } from "./_core/sdk";

describe("server-backed application sessions", () => {
  beforeEach(() => {
    createAppSession.mockReset();
    revokeAppSession.mockReset();
  });

  it("registers a random hashed session identifier before issuing a signed token", async () => {
    const token = await sdk.createSessionToken("teacher-open-id", { name: "Teacher" });
    const verified = await sdk.verifySession(token);

    expect(verified?.openId).toBe("teacher-open-id");
    expect(verified?.sessionId).toHaveLength(43);
    expect(createAppSession).toHaveBeenCalledWith(expect.objectContaining({
      openId: "teacher-open-id",
      sessionIdHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      expiresAt: expect.any(Date),
    }));
  });

  it("revokes the stored session record instead of relying only on cookie deletion", async () => {
    const token = await sdk.createSessionToken("teacher-open-id", { name: "Teacher" });
    await sdk.revokeSessionToken(token);

    expect(revokeAppSession).toHaveBeenCalledWith(expect.stringMatching(/^[a-f0-9]{64}$/));
  });
});

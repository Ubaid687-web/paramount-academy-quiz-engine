import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SignJWT } from "jose";

const { createAppSession, revokeAppSession } = vi.hoisted(() => ({
  createAppSession: vi.fn(),
  revokeAppSession: vi.fn(),
}));

vi.mock("./_core/env", () => ({
  ENV: {
    appId: "test-app",
    cookieSecret: "opaque-platform-key",
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
    vi.useRealTimers();
    createAppSession.mockReset();
    revokeAppSession.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
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

  it("signs and verifies sessions with an opaque non-empty managed secret", async () => {
    const token = await sdk.createSessionToken("teacher-open-id", { name: "Teacher" });

    await expect(sdk.verifySession(token)).resolves.toMatchObject({
      openId: "teacher-open-id",
      appId: "test-app",
    });
  });

  it("admits only already-expiring pre-derivation session cookies during the one-time compatibility window", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-23T13:00:00.000Z"));
    const legacyKey = new TextEncoder().encode("opaque-platform-key");
    const compatibleToken = await new SignJWT({
      openId: "portal-admin-open-id",
      appId: "test-app",
      name: "Portal Admin",
      sessionId: "legacy-session-id",
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setExpirationTime(Math.floor(Date.UTC(2026, 7, 24, 0, 45, 0) / 1000))
      .sign(legacyKey);
    const postWindowToken = await new SignJWT({
      openId: "portal-admin-open-id",
      appId: "test-app",
      name: "Portal Admin",
      sessionId: "post-window-session-id",
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setExpirationTime(Math.floor(Date.UTC(2026, 7, 24, 0, 46, 0) / 1000))
      .sign(legacyKey);

    await expect(sdk.verifySession(compatibleToken)).resolves.toMatchObject({
      openId: "portal-admin-open-id",
      appId: "test-app",
    });
    await expect(sdk.verifySession(postWindowToken)).resolves.toBeNull();
  });

  it("revokes the stored session record instead of relying only on cookie deletion", async () => {
    const token = await sdk.createSessionToken("teacher-open-id", { name: "Teacher" });
    await sdk.revokeSessionToken(token);

    expect(revokeAppSession).toHaveBeenCalledWith(expect.stringMatching(/^[a-f0-9]{64}$/));
  });
});

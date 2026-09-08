import { describe, expect, it } from "vitest";
import type { Request } from "express";
import { createOAuthStateRecord, createOriginBinding, getOAuthStartOrigin, getTrustedRequestOrigin, normalizeReturnPath, normalizeTrustedOrigin, ORIGIN_BINDING_COOKIE_NAME, ORIGIN_BINDING_TTL_MS, verifyOAuthState, verifyOriginBinding } from "./_core/oauthState";
import { OAUTH_STATE_COOKIE_NAME } from "../shared/const";

function requestWith(headers: Record<string, string | undefined>, protocol = "https") {
  return { headers, protocol, get: (name: string) => headers[name.toLowerCase()] } as unknown as Request;
}

describe("browser-bound OAuth state", () => {
  it("accepts only the exact state stored in the HTTP-only state cookie", () => {
    const record = createOAuthStateRecord("/generate?grade=10", "https://aiquizhub-g2y5mute.manus.space");
    const request = requestWith({ cookie: `${OAUTH_STATE_COOKIE_NAME}=${record.cookieValue}` });

    expect(verifyOAuthState(request, record.state)).toEqual({ origin: "https://aiquizhub-g2y5mute.manus.space", returnPath: "/generate?grade=10" });
    expect(verifyOAuthState(request, `${record.state}x`)).toBeNull();
  });

  it("normalizes unsafe return paths to the application root", () => {
    expect(normalizeReturnPath("https://attacker.example")).toBe("/");
    expect(normalizeReturnPath("//attacker.example")).toBe("/");
    expect(normalizeReturnPath("/curriculum")).toBe("/curriculum");
  });

  it("accepts only configured managed or local development hosts", () => {
    expect(getTrustedRequestOrigin(requestWith({ host: "aiquizhub-g2y5mute.manus.space" }))).toBe("https://aiquizhub-g2y5mute.manus.space");
    expect(getTrustedRequestOrigin(requestWith({ host: "attacker.example" }))).toBeNull();
    expect(normalizeTrustedOrigin("https://aiquizhub-g2y5mute.manus.space")).toBe("https://aiquizhub-g2y5mute.manus.space");
    expect(normalizeTrustedOrigin("https://attacker.example")).toBeNull();
  });

  it("accepts only a valid, unexpired OAuth origin binding for the browser origin", () => {
    const now = 1_800_000_000_000;
    const origin = "https://aiquizhub-g2y5mute.manus.space";
    const binding = createOriginBinding(origin, now);
    const request = requestWith({ cookie: `${ORIGIN_BINDING_COOKIE_NAME}=${binding}` });
    expect(verifyOriginBinding(request, origin, now)).toBe(true);
    expect(verifyOriginBinding(request, "https://other.manus.space", now)).toBe(false);
    expect(verifyOriginBinding(request, origin, now + ORIGIN_BINDING_TTL_MS + 1)).toBe(false);
    const tampered = `${binding.slice(0, -1)}${binding.endsWith("a") ? "b" : "a"}`;
    expect(verifyOriginBinding(requestWith({ cookie: `${ORIGIN_BINDING_COOKIE_NAME}=${tampered}` }), origin, now)).toBe(false);
  });

  it("uses the browser's allow-listed academy origin when a managed proxy supplies an internal host", () => {
    const proxiedRequest = requestWith({ host: "service.internal" });
    expect(getOAuthStartOrigin(proxiedRequest, "https://aiquizhub-g2y5mute.manus.space")).toBe("https://aiquizhub-g2y5mute.manus.space");
    expect(getOAuthStartOrigin(proxiedRequest, "https://attacker.example")).toBeNull();
  });
});

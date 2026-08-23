import { describe, expect, it } from "vitest";
import type { Request } from "express";
import { createOAuthStateRecord, getOAuthStartOrigin, getTrustedRequestOrigin, normalizeReturnPath, normalizeTrustedOrigin, verifyOAuthState } from "./_core/oauthState";
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

  it("uses the browser's allow-listed academy origin when a managed proxy supplies an internal host", () => {
    const proxiedRequest = requestWith({ host: "service.internal" });
    expect(getOAuthStartOrigin(proxiedRequest, "https://aiquizhub-g2y5mute.manus.space")).toBe("https://aiquizhub-g2y5mute.manus.space");
    expect(getOAuthStartOrigin(proxiedRequest, "https://attacker.example")).toBeNull();
  });

  it("uses the managed proxy's forwarded public host for same-origin mutation checks", () => {
    const proxiedRequest = requestWith({
      host: "service.internal",
      "x-forwarded-host": "aiquizhub-g2y5mute.manus.space",
      "x-forwarded-proto": "https",
    }, "http");

    expect(getTrustedRequestOrigin(proxiedRequest)).toBe("https://aiquizhub-g2y5mute.manus.space");
  });

  it("does not convert an untrusted forwarded host into a trusted mutation origin", () => {
    const proxiedRequest = requestWith({
      host: "service.internal",
      "x-forwarded-host": "attacker.example",
      "x-forwarded-proto": "https",
    }, "http");

    expect(getTrustedRequestOrigin(proxiedRequest)).toBeNull();
  });
});

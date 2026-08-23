import { describe, expect, it } from "vitest";
import type { Request } from "express";
import { createOAuthStateRecord, getTrustedRequestOrigin, normalizeReturnPath, verifyOAuthState } from "./_core/oauthState";
import { OAUTH_STATE_COOKIE_NAME } from "../shared/const";

function requestWith(headers: Record<string, string | undefined>, protocol = "https") {
  return { headers, protocol, get: (name: string) => headers[name.toLowerCase()] } as unknown as Request;
}

describe("browser-bound OAuth state", () => {
  it("accepts only the exact state stored in the HTTP-only state cookie", () => {
    const record = createOAuthStateRecord("/generate?grade=10");
    const request = requestWith({ cookie: `${OAUTH_STATE_COOKIE_NAME}=${record.cookieValue}` });

    expect(verifyOAuthState(request, record.state)).toBe("/generate?grade=10");
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
  });
});

import { COOKIE_NAME, OAUTH_STATE_COOKIE_NAME } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getOAuthStateCookieOptions, getSessionCookieOptions } from "./cookies";
import { ENV } from "./env";
import { createOAuthStateRecord, getTrustedRequestOrigin, normalizeReturnPath, OAUTH_STATE_TTL_MS, verifyOAuthState } from "./oauthState";
import { sdk } from "./sdk";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/start", (req: Request, res: Response) => {
    const origin = getTrustedRequestOrigin(req);
    if (!origin) {
      res.status(400).json({ error: "Unsupported sign-in host" });
      return;
    }
    const { state, cookieValue } = createOAuthStateRecord(normalizeReturnPath(getQueryParam(req, "returnPath")));
    res.cookie(OAUTH_STATE_COOKIE_NAME, cookieValue, { ...getOAuthStateCookieOptions(req), maxAge: OAUTH_STATE_TTL_MS });
    const portalUrl = new URL("/app-auth", ENV.oAuthPortalUrl);
    portalUrl.searchParams.set("appId", ENV.appId);
    portalUrl.searchParams.set("redirectUri", `${origin}/api/oauth/callback`);
    portalUrl.searchParams.set("state", state);
    portalUrl.searchParams.set("type", "signIn");
    res.redirect(302, portalUrl.toString());
  });

  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    const origin = getTrustedRequestOrigin(req);
    const returnPath = state ? verifyOAuthState(req, state) : null;
    if (!code || !state || !origin || !returnPath) {
      res.clearCookie(OAUTH_STATE_COOKIE_NAME, { ...getOAuthStateCookieOptions(req), maxAge: -1 });
      res.status(400).json({ error: "Invalid or expired sign-in request" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, `${origin}/api/oauth/callback`);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(userInfo.openId, { name: userInfo.name || "" });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: 1000 * 60 * 60 * 12 });
      res.clearCookie(OAUTH_STATE_COOKIE_NAME, { ...getOAuthStateCookieOptions(req), maxAge: -1 });

      res.redirect(302, returnPath);
    } catch (error) {
      console.error("[OAuth] Callback failed", error instanceof Error ? error.name : "unknown");
      res.clearCookie(OAUTH_STATE_COOKIE_NAME, { ...getOAuthStateCookieOptions(req), maxAge: -1 });
      res.status(400).json({ error: "Sign-in could not be completed" });
    }
  });
}

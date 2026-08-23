import { AXIOS_TIMEOUT_MS, COOKIE_NAME } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import axios, { type AxiosInstance } from "axios";
import { parse as parseCookieHeader } from "cookie";
import { createHash, randomBytes } from "crypto";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";
import type {
  ExchangeTokenRequest,
  ExchangeTokenResponse,
  GetUserInfoResponse,
  GetUserInfoWithJwtRequest,
  GetUserInfoWithJwtResponse,
} from "./types/manusTypes";
// Utility function
const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

export type SessionPayload = {
  openId: string;
  appId: string;
  name: string;
  sessionId: string;
};

export type AuthenticatedUser = User & { taskUid?: string; isCron?: boolean };
const CRON_OPEN_ID_PREFIX = "cron_";
export const APP_SESSION_TTL_MS = 1000 * 60 * 60 * 12;
// Session cookies issued before the domain-separated signing-key migration used
// the opaque managed secret directly. Their maximum normal lifetime was 12h;
// this fixed expiration horizon admits only that already-issued population.
const LEGACY_RAW_SESSION_MAX_EXPIRY_SECONDS = Math.floor(Date.UTC(2026, 7, 24, 0, 45, 0) / 1000);

const EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
const GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
const GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;

class OAuthService {
  constructor(private client: ReturnType<typeof axios.create>) {
    console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    if (!ENV.oAuthServerUrl) {
      console.error(
        "[OAuth] ERROR: OAUTH_SERVER_URL is not configured! Set OAUTH_SERVER_URL environment variable."
      );
    }
  }

  async getTokenByCode(
    code: string,
    redirectUri: string
  ): Promise<ExchangeTokenResponse> {
    const payload: ExchangeTokenRequest = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri,
    };

    const { data } = await this.client.post<ExchangeTokenResponse>(
      EXCHANGE_TOKEN_PATH,
      payload
    );

    return data;
  }

  async getUserInfoByToken(
    token: ExchangeTokenResponse
  ): Promise<GetUserInfoResponse> {
    const { data } = await this.client.post<GetUserInfoResponse>(
      GET_USER_INFO_PATH,
      {
        accessToken: token.accessToken,
      }
    );

    return data;
  }
}

const createOAuthHttpClient = (): AxiosInstance =>
  axios.create({
    baseURL: ENV.oAuthServerUrl,
    timeout: AXIOS_TIMEOUT_MS,
  });

class SDKServer {
  private readonly client: AxiosInstance;
  private readonly oauthService: OAuthService;

  constructor(client: AxiosInstance = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }

  private deriveLoginMethod(
    platforms: unknown,
    fallback: string | null | undefined
  ): string | null {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set<string>(
      platforms.filter((p): p is string => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (
      set.has("REGISTERED_PLATFORM_MICROSOFT") ||
      set.has("REGISTERED_PLATFORM_AZURE")
    )
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }

  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(
    code: string,
    redirectUri: string
  ): Promise<ExchangeTokenResponse> {
    return this.oauthService.getTokenByCode(code, redirectUri);
  }

  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken: string): Promise<GetUserInfoResponse> {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken,
    } as ExchangeTokenResponse);
    const loginMethod = this.deriveLoginMethod(
      (data as any)?.platforms,
      (data as any)?.platform ?? data.platform ?? null
    );
    return {
      ...(data as any),
      platform: loginMethod,
      loginMethod,
    } as GetUserInfoResponse;
  }

  private parseCookies(cookieHeader: string | undefined) {
    if (!cookieHeader) {
      return new Map<string, string>();
    }

    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }

  private getSessionSecret() {
    const secret = ENV.cookieSecret;
    if (!secret) {
      throw new Error("Session signing configuration is unavailable");
    }
    // The deployment secret is opaque platform configuration. Derive a fixed-size
    // domain-separated HMAC key instead of treating its character count as entropy.
    return createHash("sha256")
      .update("paramount-academy/session-signing/v1\0", "utf8")
      .update(secret, "utf8")
      .digest();
  }

  private getLegacySessionSecret() {
    const secret = ENV.cookieSecret;
    if (!secret) {
      throw new Error("Session signing configuration is unavailable");
    }
    return new TextEncoder().encode(secret);
  }

  private hashSessionId(sessionId: string) {
    return createHash("sha256").update(sessionId).digest("hex");
  }

  /**
   * Create a session token for a Manus user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(
    openId: string,
    options: { expiresInMs?: number; name?: string } = {}
  ): Promise<string> {
    const expiresInMs = options.expiresInMs ?? APP_SESSION_TTL_MS;
    const sessionId = randomBytes(32).toString("base64url");
    await db.createAppSession({
      sessionIdHash: this.hashSessionId(sessionId),
      openId,
      appId: ENV.appId,
      expiresAt: new Date(Date.now() + expiresInMs),
    });
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || "",
        sessionId,
      },
      { expiresInMs }
    );
  }

  async signSession(
    payload: SessionPayload,
    options: { expiresInMs?: number } = {}
  ): Promise<string> {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? APP_SESSION_TTL_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1000);
    const secretKey = this.getSessionSecret();

    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name,
      sessionId: payload.sessionId,
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setExpirationTime(expirationSeconds)
      .sign(secretKey);
  }

  async verifySession(
    cookieValue: string | undefined | null
  ): Promise<{ openId: string; appId: string; name: string; sessionId: string } | null> {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }

    try {
      const secretKey = this.getSessionSecret();
      let payload: Record<string, unknown>;
      try {
        ({ payload } = await jwtVerify(cookieValue, secretKey, {
          algorithms: ["HS256"],
        }) as { payload: Record<string, unknown> });
      } catch (primaryVerificationError) {
        // This bridge is deliberately narrow: it only permits a legacy token
        // whose claimed expiration could have been produced before migration.
        const { payload: legacyPayload } = await jwtVerify(cookieValue, this.getLegacySessionSecret(), {
          algorithms: ["HS256"],
        });
        if (typeof legacyPayload.exp !== "number" || legacyPayload.exp > LEGACY_RAW_SESSION_MAX_EXPIRY_SECONDS) {
          throw primaryVerificationError;
        }
        payload = legacyPayload as Record<string, unknown>;
      }
      const { openId, appId, name, sessionId } = payload as Record<string, unknown>;

      if (
        !isNonEmptyString(openId) ||
        !isNonEmptyString(appId) ||
        !isNonEmptyString(sessionId) ||
        appId !== ENV.appId
      ) {
        console.warn("[Auth] Session payload is incomplete or for another application");
        return null;
      }

      return {
        openId,
        appId,
        name: typeof name === "string" ? name : "",
        sessionId,
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }

  async getUserInfoWithJwt(
    jwtToken: string
  ): Promise<GetUserInfoWithJwtResponse> {
    const payload: GetUserInfoWithJwtRequest = {
      jwtToken,
      projectId: ENV.appId,
    };

    const { data } = await this.client.post<GetUserInfoWithJwtResponse>(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );

    const loginMethod = this.deriveLoginMethod(
      (data as any)?.platforms,
      (data as any)?.platform ?? data.platform ?? null
    );
    return {
      ...(data as any),
      platform: loginMethod,
      loginMethod,
    } as GetUserInfoWithJwtResponse;
  }

  async authenticateRequest(req: Request): Promise<AuthenticatedUser> {
    // Regular authentication flow
    const cookies = this.parseCookies(req.headers.cookie);
    const sessionCookie = cookies.get(COOKIE_NAME);
    const session = await this.verifySession(sessionCookie);

    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }

    if (session.openId.startsWith(CRON_OPEN_ID_PREFIX)) {
      const userInfo = await this.getUserInfoWithJwt(sessionCookie ?? "");
      if (!userInfo.taskUid) throw ForbiddenError("Cron session missing task UID");
      const now = new Date();
      return {
        id: -1,
        openId: userInfo.openId,
        name: userInfo.name || "Manus Scheduled Task",
        email: null,
        loginMethod: null,
        role: "user",
        createdAt: now,
        updatedAt: now,
        lastSignedIn: now,
        taskUid: userInfo.taskUid,
        isCron: true,
      } as AuthenticatedUser;
    }

    const sessionRecord = await db.getAppSessionByHash(this.hashSessionId(session.sessionId));
    if (
      !sessionRecord ||
      sessionRecord.openId !== session.openId ||
      sessionRecord.appId !== ENV.appId ||
      sessionRecord.revokedAt ||
      sessionRecord.expiresAt.getTime() <= Date.now()
    ) {
      throw ForbiddenError("Session has expired or been revoked");
    }
    await db.touchAppSession(sessionRecord.sessionIdHash);

    const sessionUserId = session.openId;
    const signedInAt = new Date();
    let user = await db.getUserByOpenId(sessionUserId);

    // If user not in DB, sync from OAuth server automatically
    if (!user) {
      try {
        const userInfo = await this.getUserInfoWithJwt(sessionCookie ?? "");
        await db.upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: signedInAt,
        });
        user = await db.getUserByOpenId(userInfo.openId);
      } catch (error) {
        console.error("[Auth] Failed to sync user from OAuth:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }

    if (!user) {
      throw ForbiddenError("User not found");
    }

    await db.upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt,
    });

    if (await db.promoteApprovedTeacherOnSignIn(user.openId, user.email)) {
      user = await db.getUserByOpenId(user.openId);
    }

    if (!user) {
      throw ForbiddenError("User not found after role refresh");
    }

    return user;
  }

  async revokeSessionToken(cookieValue: string | undefined | null) {
    const session = await this.verifySession(cookieValue);
    if (!session || session.openId.startsWith(CRON_OPEN_ID_PREFIX)) return;
    await db.revokeAppSession(this.hashSessionId(session.sessionId));
  }
}

export const sdk = new SDKServer();

import { randomBytes, timingSafeEqual } from "crypto";
import type { Request } from "express";
import { parse as parseCookieHeader } from "cookie";
import { OAUTH_STATE_COOKIE_NAME } from "@shared/const";

export const OAUTH_STATE_TTL_MS = 1000 * 60 * 10;

function isTrustedHost(host: string) {
  const normalized = host.toLowerCase().split(":")[0] ?? "";
  return normalized === "localhost" || normalized === "127.0.0.1" || normalized.endsWith(".manus.space") || normalized.endsWith(".manus.computer") || normalized.endsWith(".manus-asia.computer") || normalized.endsWith(".manuscomputer.ai");
}

export function getTrustedRequestOrigin(req: Request) {
  const host = req.get("host") ?? "";
  if (!isTrustedHost(host)) return null;
  const forwardedProto = req.headers["x-forwarded-proto"];
  const protocol = (Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto?.split(",")[0])?.trim().toLowerCase() || req.protocol;
  if (protocol !== "https" && protocol !== "http") return null;
  return `${protocol}://${host}`;
}

export function normalizeReturnPath(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/";
  return value;
}

export function createOAuthStateRecord(returnPath: string) {
  const state = randomBytes(32).toString("base64url");
  return { state, cookieValue: `${state}.${encodeURIComponent(normalizeReturnPath(returnPath))}` };
}

export function verifyOAuthState(req: Request, receivedState: string) {
  const cookieValue = parseCookieHeader(req.headers.cookie ?? "")[OAUTH_STATE_COOKIE_NAME];
  if (!cookieValue) return null;
  const separator = cookieValue.indexOf(".");
  if (separator <= 0) return null;
  const expectedState = cookieValue.slice(0, separator);
  const expected = Buffer.from(expectedState);
  const received = Buffer.from(receivedState);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
  try {
    return normalizeReturnPath(decodeURIComponent(cookieValue.slice(separator + 1)));
  } catch {
    return null;
  }
}

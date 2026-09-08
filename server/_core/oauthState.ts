import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import type { Request } from "express";
import { parse as parseCookieHeader } from "cookie";
import { OAUTH_STATE_COOKIE_NAME } from "@shared/const";
import { ENV } from "./env";

export const ORIGIN_BINDING_COOKIE_NAME = "__Host-academy-origin";
export const ORIGIN_BINDING_TTL_MS = 1000 * 60 * 60 * 12;

export const OAUTH_STATE_TTL_MS = 1000 * 60 * 10;

function isTrustedHost(host: string) {
  const normalized = host.toLowerCase().split(":")[0] ?? "";
  return normalized === "localhost" || normalized === "127.0.0.1" || normalized.endsWith(".manus.space") || normalized.endsWith(".manus.computer") || normalized.endsWith(".manus-asia.computer") || normalized.endsWith(".manuscomputer.ai");
}

export function normalizeTrustedOrigin(value: unknown) {
  if (typeof value !== "string") return null;
  try {
    const parsed = new URL(value);
    const isLocal = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
    if (!isTrustedHost(parsed.host) || (parsed.protocol !== "https:" && !(isLocal && parsed.protocol === "http:"))) return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

export function getTrustedRequestOrigin(req: Request) {
  const host = req.get("host") ?? "";
  const forwardedProto = req.headers["x-forwarded-proto"];
  const protocol = (Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto?.split(",")[0])?.trim().toLowerCase() || req.protocol;
  return normalizeTrustedOrigin(`${protocol}://${host}`);
}

/** Prefer the browser-provided, allow-listed frontend origin when a managed proxy does not preserve the public Host header. */
export function getOAuthStartOrigin(req: Request, requestedOrigin: unknown) {
  return normalizeTrustedOrigin(requestedOrigin) ?? getTrustedRequestOrigin(req);
}

function originBindingSignature(payload: string) {
  return createHmac("sha256", ENV.cookieSecret || "development-origin-binding-secret").update(payload).digest("base64url");
}

export function createOriginBinding(origin: string, now = Date.now()) {
  const normalized = normalizeTrustedOrigin(origin);
  if (!normalized) throw new Error("Cannot bind an untrusted origin.");
  const payload = Buffer.from(`${normalized}|${now + ORIGIN_BINDING_TTL_MS}`).toString("base64url");
  return `${payload}.${originBindingSignature(payload)}`;
}

export function verifyOriginBinding(req: Request, expectedOrigin: string, now = Date.now()) {
  const cookieValue = parseCookieHeader(req.headers.cookie ?? "")[ORIGIN_BINDING_COOKIE_NAME];
  const separator = cookieValue?.lastIndexOf(".") ?? -1;
  if (!cookieValue || separator <= 0) return false;
  const payload = cookieValue.slice(0, separator);
  const signature = cookieValue.slice(separator + 1);
  const expectedSignature = originBindingSignature(payload);
  const actualBytes = Buffer.from(signature);
  const expectedBytes = Buffer.from(expectedSignature);
  if (actualBytes.length !== expectedBytes.length || !timingSafeEqual(actualBytes, expectedBytes)) return false;
  try {
    const decoded = Buffer.from(payload, "base64url").toString("utf8");
    const divider = decoded.lastIndexOf("|");
    const origin = normalizeTrustedOrigin(decoded.slice(0, divider));
    const expiresAt = Number(decoded.slice(divider + 1));
    return origin === normalizeTrustedOrigin(expectedOrigin) && Number.isSafeInteger(expiresAt) && now <= expiresAt;
  } catch {
    return false;
  }
}

export function normalizeReturnPath(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/";
  return value;
}

export function createOAuthStateRecord(returnPath: string, origin: string) {
  const state = randomBytes(32).toString("base64url");
  const cookiePayload = Buffer.from(JSON.stringify({
    origin: normalizeTrustedOrigin(origin),
    returnPath: normalizeReturnPath(returnPath),
  })).toString("base64url");
  return { state, cookieValue: `${state}.${cookiePayload}` };
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
    const payload = JSON.parse(Buffer.from(cookieValue.slice(separator + 1), "base64url").toString("utf8")) as { origin?: unknown; returnPath?: unknown };
    const origin = normalizeTrustedOrigin(payload.origin);
    if (!origin) return null;
    return { origin, returnPath: normalizeReturnPath(payload.returnPath) };
  } catch {
    return null;
  }
}

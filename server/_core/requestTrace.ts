import { randomUUID } from "crypto";
import type { NextFunction, Request, Response } from "express";

export type RequestAuthState = "authenticated" | "cookie_absent" | "session_invalid" | "session_unavailable";

export function attachRequestTrace(req: Request, res: Response, next: NextFunction) {
  if (req.path.startsWith("/api/")) {
    const requestId = randomUUID();
    res.locals.requestTraceId = requestId;
    res.setHeader("X-Request-Id", requestId);
  }
  next();
}

export function getRequestTraceId(res: Response) {
  return typeof res.locals.requestTraceId === "string" ? res.locals.requestTraceId : "untracked";
}

export function isAuthTracePath(path: string) {
  return path.includes("auth.me") || path.includes("curriculum.prepareLargePdfUpload");
}

export function logAuthTrace(requestId: string, path: string, state: RequestAuthState) {
  if (!isAuthTracePath(path)) return;
  console.info(`[AuthTrace] requestId=${requestId} path=${path} state=${state}`);
}

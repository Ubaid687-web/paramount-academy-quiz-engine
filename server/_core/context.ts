import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { COOKIE_NAME } from "@shared/const";
import { sdk } from "./sdk";
import { getRequestTraceId, logAuthTrace, type RequestAuthState } from "./requestTrace";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  requestId: string;
  authState: RequestAuthState;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;
  let authState: RequestAuthState = typeof opts.req.headers.cookie === "string" && opts.req.headers.cookie.includes(`${COOKIE_NAME}=`)
    ? "session_invalid"
    : "cookie_absent";
  const requestId = getRequestTraceId(opts.res);

  try {
    user = await sdk.authenticateRequest(opts.req);
    authState = "authenticated";
  } catch (error) {
    // Authentication is optional for public procedures.
    if (error instanceof Error && error.message !== "Invalid session cookie") {
      authState = "session_unavailable";
    }
    user = null;
  }

  logAuthTrace(requestId, opts.req.path, authState);

  return {
    req: opts.req,
    res: opts.res,
    user,
    requestId,
    authState,
  };
}

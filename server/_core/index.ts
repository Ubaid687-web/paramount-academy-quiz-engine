import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { registerPdfExportRoutes } from "../pdfExportRoute";
import { runOcrExtractionWorker } from "../ocrWorkerRoute";
import { registerOcrReviewRoutes } from "../ocrReviewRoute";
import { registerStorageRoute } from "../storageRoute";
import { serveStatic, setupVite } from "./vite";
import { ENV } from "./env";
import { getTrustedRequestOrigin } from "./oauthState";

function assertProductionConfiguration() {
  if (!ENV.isProduction) return;
  const required = [
    ["DATABASE_URL", ENV.databaseUrl],
    ["JWT_SECRET", ENV.cookieSecret],
    ["OAUTH_SERVER_URL", ENV.oAuthServerUrl],
    ["VITE_OAUTH_PORTAL_URL", ENV.oAuthPortalUrl],
    ["VITE_APP_ID", ENV.appId],
  ] as const;
  const missing = required.filter(([, value]) => !value).map(([name]) => name);
  if (missing.length) throw new Error(`Production configuration is incomplete: ${missing.join(", ")}`);
}

function applySecurityHeaders(req: express.Request, res: express.Response, next: express.NextFunction) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  if (req.secure || req.headers["x-forwarded-proto"]?.toString().split(",").some((value) => value.trim() === "https")) {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
}

function enforceSameOriginForCookieMutations(req: express.Request, res: express.Response, next: express.NextFunction) {
  const mutating = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method);
  if (!mutating || !req.path.startsWith("/api/") || req.path.startsWith("/api/scheduled/")) return next();
  const origin = req.headers.origin;
  const hasSessionCookie = typeof req.headers.cookie === "string" && req.headers.cookie.includes("app_session_id=");
  if (!origin && hasSessionCookie) {
    res.status(403).json({ error: "A same-origin request is required." });
    return;
  }
  if (origin && origin !== getTrustedRequestOrigin(req)) {
    res.status(403).json({ error: "Cross-origin requests are not accepted." });
    return;
  }
  next();
}

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  assertProductionConfiguration();
  const app = express();
  const server = createServer(app);
  app.disable("x-powered-by");
  app.use(applySecurityHeaders);
  // Avoid the extended qs parser for query strings; routes use typed tRPC inputs instead.
  app.set("query parser", "simple");
  // Large textbook transfers use the signed 512 KB resumable tRPC chunks. Keep parsers bounded so
  // untrusted callers cannot make the process buffer an entire source before authentication.
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ limit: "64kb", extended: false }));
  app.use(enforceSameOriginForCookieMutations);
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  registerPdfExportRoutes(app);
  registerOcrReviewRoutes(app);
  registerStorageRoute(app);
  app.post("/api/scheduled/ocr-extraction", runOcrExtractionWorker);
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);

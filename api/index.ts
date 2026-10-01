import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createApp } from "../server/_core/index";

let appPromise: ReturnType<typeof createApp> | undefined;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    appPromise ??= createApp();
    const app = await appPromise;
    return app(req, res);
  } catch (error) {
    console.error("[v0] Vercel application initialization failed", error);
    if (!res.headersSent) {
      res.status(503).json({ error: "The application is not configured for this deployment yet." });
    }
  }
}

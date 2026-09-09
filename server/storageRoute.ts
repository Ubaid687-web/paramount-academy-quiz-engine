import type { Express, Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { storageKeyFromRequest, storageStream } from "./storage";

export function registerStorageRoute(app: Express) {
  app.get("/api/storage", async (req: Request, res: Response) => {
    try {
      await sdk.authenticateRequest(req);
      const key = storageKeyFromRequest(typeof req.query.key === "string" ? req.query.key : undefined);
      if (!key) return res.status(400).json({ error: "Missing storage key." });
      const result = await storageStream(key, req.headers["if-none-match"]);
      if (!result) return res.status(404).json({ error: "File not found." });
      if (result.statusCode === 304) return res.status(304).set("ETag", result.blob.etag).end();
      res.set({
        "Content-Type": result.blob.contentType || "application/octet-stream",
        "Content-Length": String(result.blob.size),
        ETag: result.blob.etag,
        "Cache-Control": "private, no-cache",
        "Content-Disposition": "inline",
      });
      const bytes = Buffer.from(await new Response(result.stream).arrayBuffer());
      return res.send(bytes);
    } catch {
      return res.status(401).json({ error: "Authentication required." });
    }
  });
}

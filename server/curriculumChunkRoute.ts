import express, { type Express, type Request, type Response } from "express";
import { sdk } from "./_core/sdk";
import { appendCurriculumPdfChunk, CURRICULUM_UPLOAD_CHUNK_BYTES } from "./curriculumChunkUpload";

function readIntegerHeader(req: Request, name: string) {
  const value = req.header(name);
  if (!value || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function safeMessage(error: unknown) {
  if (!(error instanceof Error)) return "The protected upload could not accept this chunk.";
  return error.message.slice(0, 240);
}

export function registerCurriculumChunkRoute(app: Express) {
  app.post(
    "/api/curriculum/upload-chunk",
    express.raw({ type: "application/octet-stream", limit: `${CURRICULUM_UPLOAD_CHUNK_BYTES}b` }),
    async (req: Request, res: Response) => {
      const user = await sdk.authenticateRequest(req).catch(() => null);
      if (!user) {
        res.status(401).json({ error: "Staff sign-in is required before uploading a textbook." });
        return;
      }
      if (user.role !== "admin") {
        res.status(403).json({ error: "Only Portal Admin can upload a textbook source." });
        return;
      }

      const uploadToken = req.header("x-upload-token");
      const chunkIndex = readIntegerHeader(req, "x-chunk-index");
      const expectedRevision = readIntegerHeader(req, "x-expected-revision");
      const fileBuffer = Buffer.isBuffer(req.body) ? req.body : null;
      if (!uploadToken || chunkIndex === null || expectedRevision === null || !fileBuffer || fileBuffer.length < 1 || fileBuffer.length > CURRICULUM_UPLOAD_CHUNK_BYTES) {
        res.status(400).json({ error: "The protected upload chunk request is invalid." });
        return;
      }

      try {
        const result = await appendCurriculumPdfChunk({
          userId: user.id,
          uploadToken,
          chunkIndex,
          expectedRevision,
          fileBuffer,
        });
        res.status(200).json(result);
      } catch (error) {
        console.error("[CurriculumUpload] binary chunk route rejected request", {
          chunkIndex,
          expectedRevision,
          byteLength: fileBuffer.length,
          error: safeMessage(error),
        });
        res.status(400).json({ error: safeMessage(error) });
      }
    }
  );
}

import type { Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { ingestPortalAdminCurriculumSource } from "./curriculumSourceIntake";

export const LARGE_CURRICULUM_SOURCE_UPLOAD_PATH = "/api/curriculum/source-upload";

function readPositiveSetId(value: unknown) {
  const parsed = typeof value === "string" ? Number(value) : NaN;
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function readFileName(value: unknown) {
  if (typeof value !== "string") return null;
  const decoded = decodeURIComponent(value).trim();
  return decoded && decoded.length <= 255 && !/[\u0000-\u001F]/.test(decoded) ? decoded : null;
}

/**
 * Receives a binary PDF rather than a base64 tRPC payload so a normal scanned textbook can be
 * accepted without inflating it by a third in browser memory and JSON transport. This route is
 * Portal Admin-only; all source-signature, storage, OCR and review safeguards remain centralised
 * in curriculumSourceIntake.
 */
export async function handleLargeCurriculumSourceUpload(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user) return res.status(401).json({ error: "Sign in as Portal Admin to upload a curriculum source." });
    if (user.role !== "admin") return res.status(403).json({ error: "Only Portal Admin can upload curriculum sources." });
    if (req.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/pdf") {
      return res.status(415).json({ error: "Large curriculum uploads must be PDF files." });
    }

    const curriculumSetId = readPositiveSetId(req.query.curriculumSetId);
    const fileName = readFileName(req.get("x-source-file-name"));
    if (!curriculumSetId || !fileName) {
      return res.status(400).json({ error: "Provide a valid curriculum edition and PDF filename." });
    }
    if (!Buffer.isBuffer(req.body) || !req.body.length) {
      return res.status(400).json({ error: "The uploaded PDF is empty or could not be read." });
    }

    const source = await ingestPortalAdminCurriculumSource({
      curriculumSetId,
      fileName,
      mimeType: "application/pdf",
      fileBuffer: req.body,
      uploadedBy: user.id,
      sessionCookie: req.headers.cookie,
    });
    return res.status(201).json(source);
  } catch (error) {
    const message = error instanceof Error ? error.message : "The curriculum source could not be stored or extracted.";
    return res.status(message.includes("150MB") ? 413 : 400).json({ error: message });
  }
}

import type { Express, Request, Response } from "express";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { getCurriculumSource } from "./db";
import { sdk } from "./_core/sdk";
import { storageGet } from "./storage";
import { writeStoredPdfToPath } from "./chunkedPdfManifest";

const execFileAsync = promisify(execFile);

async function requirePortalAdmin(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user || user.role !== "admin") {
      res.status(403).json({ message: "Portal Admin access is required for OCR source review." });
      return null;
    }
    return user;
  } catch {
    res.status(403).json({ message: "Portal Admin access is required for OCR source review." });
    return null;
  }
}

async function downloadStoredSource(storageKey: string) {
  const { url } = await storageGet(storageKey);
  const response = await fetch(url);
  if (!response.ok) throw new Error("The stored source file is unavailable for page review.");
  return Buffer.from(await response.arrayBuffer());
}

export async function renderOcrReviewPage(input: { storageKey: string; mimeType: string; pageNumber: number }) {
  if (input.mimeType !== "application/pdf") {
    if (input.pageNumber !== 1) throw new Error("A photographed source contains one reviewable page only.");
    return { bytes: await downloadStoredSource(input.storageKey), contentType: input.mimeType };
  }

  const workDir = await mkdtemp(path.join(os.tmpdir(), "paramount-ocr-review-"));
  try {
    const pdfPath = path.join(workDir, "source.pdf");
    const imageBasePath = path.join(workDir, "page");
    const imagePath = `${imageBasePath}.jpg`;
    await writeStoredPdfToPath(input.storageKey, pdfPath);
    await execFileAsync("pdftoppm", ["-f", String(input.pageNumber), "-l", String(input.pageNumber), "-r", "170", "-singlefile", "-jpeg", pdfPath, imageBasePath], {
      maxBuffer: 1024 * 1024,
      timeout: 50_000,
    });
    return { bytes: await readFile(imagePath), contentType: "image/jpeg" };
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

export function registerOcrReviewRoutes(app: Express) {
  app.get("/api/ocr-review/source/:sourceId/page/:pageNumber", async (req, res) => {
    const user = await requirePortalAdmin(req, res);
    if (!user) return;
    const sourceId = Number(req.params.sourceId);
    const pageNumber = Number(req.params.pageNumber);
    if (!Number.isInteger(sourceId) || sourceId < 1 || !Number.isInteger(pageNumber) || pageNumber < 1) {
      res.status(400).json({ message: "A valid source and page number are required for OCR review." });
      return;
    }
    try {
      const source = await getCurriculumSource(sourceId);
      if (!source || source.pageCount && pageNumber > source.pageCount) {
        res.status(404).json({ message: "The requested source page is unavailable." });
        return;
      }
      const rendered = await renderOcrReviewPage({ storageKey: source.storageKey, mimeType: source.mimeType, pageNumber });
      res.setHeader("Content-Type", rendered.contentType);
      res.setHeader("Content-Length", String(rendered.bytes.length));
      res.setHeader("Content-Disposition", "inline");
      res.setHeader("Cache-Control", "private, no-store, max-age=0");
      res.status(200).send(rendered.bytes);
    } catch (error) {
      console.warn(`[ocr-review] page render failed source=${sourceId} page=${pageNumber} reason=${error instanceof Error ? error.message : "unknown"}`);
      res.status(400).json({ message: error instanceof Error ? error.message : "The source page could not be rendered." });
    }
  });
}

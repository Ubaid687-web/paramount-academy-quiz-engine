import type { Request, Response } from "express";
import { sdk } from "./_core/sdk";
import {
  claimNextOcrExtractionJob,
  getCurriculumSource,
  getOcrSchedulerState,
  requeueStaleOcrExtractionJobs,
  replaceCurriculumSourcePageReviews,
  updateCurriculumSourceExtraction,
  updateOcrExtractionJob,
} from "./db";
import { assessExtractedSourceQuality } from "./ocrQuality";
import { extractOcrBatch, mergeOcrTranscript, parseOcrTranscript } from "./ocrPipeline";
import type { SupportedCurriculumMimeType } from "./curriculumIngestion";

const supportedOcrMimeTypes = new Set<SupportedCurriculumMimeType>(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

export async function runOcrExtractionWorker(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only" });
    const scheduler = await getOcrSchedulerState();
    if (!scheduler || scheduler.taskUid !== user.taskUid) return res.status(403).json({ error: "unrecognized-ocr-schedule" });

    await requeueStaleOcrExtractionJobs();
    const job = await claimNextOcrExtractionJob();
    if (!job) return res.json({ ok: true, skipped: "no-pending-ocr-work" });
    const source = await getCurriculumSource(job.sourceId);
    if (!source || !supportedOcrMimeTypes.has(source.mimeType as SupportedCurriculumMimeType)) {
      await updateOcrExtractionJob(job.id, { status: "failed", errorMessage: "The queued source is unavailable or is not an OCR-supported file." });
      if (source) await updateCurriculumSourceExtraction(source.id, { extractionStatus: "failed", extractionError: "The queued source is unavailable or is not an OCR-supported file." });
      return res.json({ ok: true, failedJobId: job.id });
    }

    try {
      const pages = await extractOcrBatch({
        storageKey: source.storageKey,
        mimeType: source.mimeType as SupportedCurriculumMimeType,
        startPage: job.nextPage,
        totalPages: job.totalPages,
      });
      const transcript = mergeOcrTranscript(source.extractedText, pages);
      const allPages = parseOcrTranscript(transcript);
      await replaceCurriculumSourcePageReviews(source.id, assessExtractedSourceQuality(allPages));
      const nextPage = job.nextPage + pages.length;

      if (nextPage > job.totalPages) {
        await updateCurriculumSourceExtraction(source.id, {
          extractionStatus: "extracted",
          extractedText: transcript,
          extractionError: null,
          extractedAt: new Date(),
        });
        await updateOcrExtractionJob(job.id, { status: "completed", nextPage, errorMessage: null, completedAt: new Date() });
        return res.json({ ok: true, completedJobId: job.id, pagesProcessed: pages.length });
      }

      await updateCurriculumSourceExtraction(source.id, { extractionStatus: "pending", extractedText: transcript, extractionError: null });
      await updateOcrExtractionJob(job.id, { status: "pending", nextPage, errorMessage: null });
      return res.json({ ok: true, jobId: job.id, nextPage, pagesProcessed: pages.length });
    } catch (error) {
      const message = error instanceof Error ? error.message : "OCR processing failed.";
      const terminal = job.attemptCount >= 3;
      await updateOcrExtractionJob(job.id, { status: terminal ? "failed" : "pending", errorMessage: message });
      await updateCurriculumSourceExtraction(source.id, { extractionStatus: terminal ? "failed" : "pending", extractionError: message });
      return res.status(terminal ? 200 : 500).json({ ok: false, jobId: job.id, error: message, terminal });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "OCR worker failed.";
    console.error("[OCR worker]", error);
    return res.status(500).json({ error: message, timestamp: new Date().toISOString() });
  }
}

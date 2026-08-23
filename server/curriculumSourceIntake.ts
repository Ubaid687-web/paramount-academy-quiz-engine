import { createHash, randomUUID } from "node:crypto";
import {
  createCurriculumSource,
  createOcrExtractionJob,
  getCurriculumSet,
  replaceCurriculumSourcePageReviews,
} from "./db";
import {
  extractCurriculumSourceText,
  validateCurriculumSourceFileSignature,
  type SupportedCurriculumMimeType,
} from "./curriculumIngestion";
import { assessExtractedSourceQuality } from "./ocrQuality";
import { ensureOcrScheduler } from "./ocrScheduler";
import { notifyOwnerException } from "./ownerExceptionAlerts";
import { storagePut } from "./storage";
import { storeChunkedPdfManifest } from "./chunkedPdfManifest";

export const MAX_PORTAL_ADMIN_SOURCE_BYTES = 150 * 1024 * 1024;

export function assertPortalAdminSourceSize(byteLength: number) {
  if (!Number.isSafeInteger(byteLength) || byteLength < 1 || byteLength > MAX_PORTAL_ADMIN_SOURCE_BYTES) {
    throw new Error("Curriculum source must be between 1 byte and 150MB.");
  }
}

export async function ingestPortalAdminCurriculumSource(input: {
  curriculumSetId: number;
  fileName: string;
  mimeType: SupportedCurriculumMimeType;
  fileBuffer: Buffer;
  uploadedBy: number;
  sessionCookie?: string;
}) {
  const curriculumSet = await getCurriculumSet(input.curriculumSetId);
  if (!curriculumSet) throw new Error("Curriculum set not found");

  assertPortalAdminSourceSize(input.fileBuffer.length);
  validateCurriculumSourceFileSignature(input.fileBuffer, input.mimeType);
  const extracted = await extractCurriculumSourceText({
    fileBuffer: input.fileBuffer,
    fileName: input.fileName,
    mimeType: input.mimeType,
  });
  const extension = input.mimeType === "application/pdf" ? "pdf" : input.mimeType === "text/plain" ? "txt" : input.mimeType === "image/png" ? "png" : input.mimeType === "image/webp" ? "webp" : "jpg";
  const stored = await storagePut(
    `curricula/${input.curriculumSetId}/${randomUUID()}.${extension}`,
    input.fileBuffer,
    input.mimeType,
  );
  const source = await createCurriculumSource({
    curriculumSetId: input.curriculumSetId,
    storageKey: stored.key,
    storageUrl: stored.url,
    originalFileName: input.fileName,
    mimeType: input.mimeType,
    contentHash: createHash("sha256").update(input.fileBuffer).digest("hex"),
    extractionStatus: extracted.mode === "ocr_required" ? "pending" : "extracted",
    pageCount: extracted.pageCount,
    extractedText: extracted.text,
    uploadedBy: input.uploadedBy,
    extractedAt: extracted.mode === "native_text" ? new Date() : null,
  });

  if (extracted.mode === "ocr_required") {
    await createOcrExtractionJob({ sourceId: source.id, totalPages: extracted.pageCount ?? 1 });
    await ensureOcrScheduler(input.sessionCookie);
  } else {
    const pageReviews = assessExtractedSourceQuality(extracted.pages);
    await replaceCurriculumSourcePageReviews(source.id, pageReviews);
    if (pageReviews.some((page) => page.reviewStatus === "needs_review")) {
      await notifyOwnerException({
        title: "Curriculum source requires review",
        content: "A newly uploaded curriculum source has weak extracted pages. Open Curriculum Library and complete the existing page review before activation.",
      });
    }
  }
  return source;
}

export async function ingestChunkedPdfManifestSource(input: {
  curriculumSetId: number;
  fileName: string;
  fileSize: number;
  contentHash: string;
  firstChunk: Buffer;
  chunks: Array<{ key: string; byteLength: number }>;
  uploadedBy: number;
  sessionCookie?: string;
}) {
  const curriculumSet = await getCurriculumSet(input.curriculumSetId);
  if (!curriculumSet) throw new Error("Curriculum set not found");
  assertPortalAdminSourceSize(input.fileSize);
  validateCurriculumSourceFileSignature(input.firstChunk, "application/pdf");
  if (!/^[a-f0-9]{64}$/i.test(input.contentHash) || !input.chunks.length) {
    throw new Error("The protected textbook upload manifest is invalid.");
  }
  const totalChunkBytes = input.chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  if (totalChunkBytes !== input.fileSize) throw new Error("The protected textbook upload manifest does not match the received file size.");
  const stored = await storeChunkedPdfManifest({
    fileName: input.fileName,
    byteLength: input.fileSize,
    contentHash: input.contentHash,
    chunks: input.chunks,
  });
  const source = await createCurriculumSource({
    curriculumSetId: input.curriculumSetId,
    storageKey: stored.key,
    storageUrl: stored.url,
    originalFileName: input.fileName,
    mimeType: "application/pdf",
    contentHash: input.contentHash,
    extractionStatus: "pending",
    pageCount: null,
    extractedText: null,
    uploadedBy: input.uploadedBy,
    extractedAt: null,
  });
  // The worker discovers the actual page count from a temporary sequential materialization.
  await createOcrExtractionJob({ sourceId: source.id, totalPages: 1 });
  await ensureOcrScheduler(input.sessionCookie);
  return source;
}

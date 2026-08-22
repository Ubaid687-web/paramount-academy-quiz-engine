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

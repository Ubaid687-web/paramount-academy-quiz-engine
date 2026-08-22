import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurriculumSet: vi.fn(),
  createCurriculumSource: vi.fn(),
  createOcrExtractionJob: vi.fn(),
  replaceCurriculumSourcePageReviews: vi.fn(),
  validateCurriculumSourceFileSignature: vi.fn(),
  extractCurriculumSourceText: vi.fn(),
  assessExtractedSourceQuality: vi.fn(),
  ensureOcrScheduler: vi.fn(),
  notifyOwnerException: vi.fn(),
  storagePut: vi.fn(),
}));

vi.mock("./db", () => ({
  getCurriculumSet: mocks.getCurriculumSet,
  createCurriculumSource: mocks.createCurriculumSource,
  createOcrExtractionJob: mocks.createOcrExtractionJob,
  replaceCurriculumSourcePageReviews: mocks.replaceCurriculumSourcePageReviews,
}));
vi.mock("./curriculumIngestion", () => ({
  validateCurriculumSourceFileSignature: mocks.validateCurriculumSourceFileSignature,
  extractCurriculumSourceText: mocks.extractCurriculumSourceText,
}));
vi.mock("./ocrQuality", () => ({ assessExtractedSourceQuality: mocks.assessExtractedSourceQuality }));
vi.mock("./ocrScheduler", () => ({ ensureOcrScheduler: mocks.ensureOcrScheduler }));
vi.mock("./ownerExceptionAlerts", () => ({ notifyOwnerException: mocks.notifyOwnerException }));
vi.mock("./storage", () => ({ storagePut: mocks.storagePut }));

import {
  assertPortalAdminSourceSize,
  ingestPortalAdminCurriculumSource,
  MAX_PORTAL_ADMIN_SOURCE_BYTES,
} from "./curriculumSourceIntake";

describe("Portal Admin large curriculum source intake", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getCurriculumSet.mockResolvedValue({ id: 71 });
    mocks.storagePut.mockResolvedValue({ key: "curricula/71/source.pdf", url: "/manus-storage/curricula/71/source.pdf" });
    mocks.createCurriculumSource.mockResolvedValue({ id: 901, extractionStatus: "pending" });
    mocks.extractCurriculumSourceText.mockResolvedValue({ text: "", pageCount: 180, pages: [], mode: "ocr_required" });
    mocks.assessExtractedSourceQuality.mockReturnValue([]);
  });

  it("accepts the exact 150 MB boundary and rejects a byte beyond it without allocating the upload", () => {
    expect(() => assertPortalAdminSourceSize(MAX_PORTAL_ADMIN_SOURCE_BYTES)).not.toThrow();
    expect(() => assertPortalAdminSourceSize(MAX_PORTAL_ADMIN_SOURCE_BYTES + 1)).toThrow("150MB");
  });

  it("keeps a large scanned PDF behind the existing secure storage and page-batched OCR workflow", async () => {
    const source = await ingestPortalAdminCurriculumSource({
      curriculumSetId: 71,
      fileName: "grade-9-physics.pdf",
      mimeType: "application/pdf",
      fileBuffer: Buffer.from("%PDF-large-book"),
      uploadedBy: 22,
      sessionCookie: "session=secure",
    });

    expect(mocks.validateCurriculumSourceFileSignature).toHaveBeenCalledWith(expect.any(Buffer), "application/pdf");
    expect(mocks.storagePut).toHaveBeenCalledWith(expect.stringMatching(/^curricula\/71\/.+\.pdf$/), expect.any(Buffer), "application/pdf");
    expect(mocks.createOcrExtractionJob).toHaveBeenCalledWith({ sourceId: 901, totalPages: 180 });
    expect(mocks.ensureOcrScheduler).toHaveBeenCalledWith("session=secure");
    expect(source).toMatchObject({ id: 901, extractionStatus: "pending" });
  });

  it("alerts the owner once when a newly extracted source enters the existing page-review workflow", async () => {
    mocks.extractCurriculumSourceText.mockResolvedValue({
      text: "Extracted text",
      pageCount: 1,
      pages: [{ pageNumber: 1, text: "weak" }],
      mode: "native_text",
    });
    mocks.createCurriculumSource.mockResolvedValue({ id: 902, extractionStatus: "extracted" });
    mocks.assessExtractedSourceQuality.mockReturnValue([{ pageNumber: 1, reviewStatus: "needs_review" }]);

    await ingestPortalAdminCurriculumSource({
      curriculumSetId: 71,
      fileName: "grade-9-physics.txt",
      mimeType: "text/plain",
      fileBuffer: Buffer.from("Extracted text"),
      uploadedBy: 22,
    });

    expect(mocks.notifyOwnerException).toHaveBeenCalledTimes(1);
    expect(mocks.notifyOwnerException).toHaveBeenCalledWith(expect.objectContaining({
      title: "Curriculum source requires review",
      content: expect.not.stringContaining("Extracted text"),
    }));
  });
});

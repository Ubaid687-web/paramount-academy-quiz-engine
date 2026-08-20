import { describe, expect, it } from "vitest";
import { extractCurriculumSourceText, isOcrRequiredMimeType, validateCurriculumSourceFileSignature } from "./curriculumIngestion";

describe("curriculum ingestion OCR routing", () => {
  it("queues photographed textbook files for OCR instead of decoding binary bytes as source text", async () => {
    const result = await extractCurriculumSourceText({
      fileBuffer: Buffer.from([137, 80, 78, 71]),
      fileName: "chapter-photo.png",
      mimeType: "image/png",
    });

    expect(result).toEqual({ text: "", pageCount: 1, pages: [], mode: "ocr_required" });
  });

  it("recognizes only the approved photographed textbook formats as OCR inputs", () => {
    expect(isOcrRequiredMimeType("image/jpeg")).toBe(true);
    expect(isOcrRequiredMimeType("image/png")).toBe(true);
    expect(isOcrRequiredMimeType("image/webp")).toBe(true);
    expect(isOcrRequiredMimeType("application/pdf")).toBe(false);
    expect(isOcrRequiredMimeType("text/plain")).toBe(false);
  });

  it("accepts only file bytes that match the declared curriculum source type", () => {
    expect(() => validateCurriculumSourceFileSignature(Buffer.from("%PDF-1.7"), "application/pdf")).not.toThrow();
    expect(() => validateCurriculumSourceFileSignature(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), "image/png")).not.toThrow();
    expect(() => validateCurriculumSourceFileSignature(Buffer.from("not a PDF"), "application/pdf")).toThrow("does not match the selected PDF format");
    expect(() => validateCurriculumSourceFileSignature(Buffer.from("not an image"), "image/jpeg")).toThrow("does not match the selected JPEG format");
    expect(() => validateCurriculumSourceFileSignature(Buffer.from([0xff, 0x00, 0x61]), "text/plain")).toThrow("not valid UTF-8 text");
  });
});

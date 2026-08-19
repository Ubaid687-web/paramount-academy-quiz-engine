import { describe, expect, it } from "vitest";
import { extractCurriculumSourceText, isOcrRequiredMimeType } from "./curriculumIngestion";

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
});

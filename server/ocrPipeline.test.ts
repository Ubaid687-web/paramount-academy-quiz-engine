import { describe, expect, it } from "vitest";
import { buildOcrTranscript, mergeOcrTranscript, OCR_LANGUAGE, parseOcrTranscript } from "./ocrPipeline";

describe("OCR transcript page evidence", () => {
  it("uses the installed Urdu-and-English language models for every scanned page", () => {
    expect(OCR_LANGUAGE).toBe("urd+eng");
  });

  it("keeps OCR text explicitly separated and ordered by source page", () => {
    const transcript = buildOcrTranscript([
      { pageNumber: 3, text: "Third scanned page" },
      { pageNumber: 1, text: "First scanned page" },
    ]);

    expect(transcript).toBe("[OCR page 1]\nFirst scanned page\n\n[OCR page 3]\nThird scanned page");
    expect(parseOcrTranscript(transcript)).toEqual([
      { pageNumber: 1, text: "First scanned page" },
      { pageNumber: 3, text: "Third scanned page" },
    ]);
  });

  it("merges later OCR batches without losing previously completed page evidence", () => {
    const firstBatch = buildOcrTranscript([{ pageNumber: 1, text: "Title and introduction" }]);
    const merged = mergeOcrTranscript(firstBatch, [
      { pageNumber: 2, text: "Chapter one content" },
      { pageNumber: 1, text: "Corrected title and introduction" },
    ]);

    expect(parseOcrTranscript(merged)).toEqual([
      { pageNumber: 1, text: "Corrected title and introduction" },
      { pageNumber: 2, text: "Chapter one content" },
    ]);
  });
});

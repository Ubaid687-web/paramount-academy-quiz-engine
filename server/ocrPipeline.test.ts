import { describe, expect, it } from "vitest";
import { buildOcrTranscript, mergeOcrTranscript, OCR_LANGUAGE, parseOcrTranscript, replaceOcrTranscriptPage } from "./ocrPipeline";

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

  it("replaces exactly one existing OCR page without changing its neighbours", () => {
    const transcript = buildOcrTranscript([
      { pageNumber: 55, text: "Original page 55" },
      { pageNumber: 56, text: "Unreadable symbols" },
      { pageNumber: 57, text: "Original page 57" },
    ]);

    expect(parseOcrTranscript(replaceOcrTranscriptPage(transcript, 56, "Corrected electrochemical table")).map((page) => page.text)).toEqual([
      "Original page 55", "Corrected electrochemical table", "Original page 57",
    ]);
    expect(() => replaceOcrTranscriptPage(transcript, 58, "No page")).toThrow("OCR page 58 was not found");
  });
});

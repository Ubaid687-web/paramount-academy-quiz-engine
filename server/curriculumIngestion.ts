import { readPdfTextCandidate, validateExtractedPdfText } from "./pdfProcessor";

export type SupportedCurriculumMimeType = "application/pdf" | "text/plain" | "image/jpeg" | "image/png" | "image/webp";
export type CurriculumExtractionMode = "native_text" | "ocr_required";

const photographedTextbookMimeTypes = new Set<SupportedCurriculumMimeType>(["image/jpeg", "image/png", "image/webp"]);

export function isOcrRequiredMimeType(mimeType: SupportedCurriculumMimeType) {
  return photographedTextbookMimeTypes.has(mimeType);
}

export async function extractCurriculumSourceText(input: {
  fileBuffer: Buffer;
  fileName: string;
  mimeType: SupportedCurriculumMimeType;
}): Promise<{ text: string; pageCount: number | null; pages: Array<{ pageNumber: number; text: string }>; mode: CurriculumExtractionMode }> {
  if (isOcrRequiredMimeType(input.mimeType)) {
    return { text: "", pageCount: 1, pages: [], mode: "ocr_required" };
  }

  if (input.mimeType === "application/pdf") {
    const extracted = await readPdfTextCandidate(input.fileBuffer, input.fileName);
    try {
      validateExtractedPdfText(extracted.text, extracted.pageCount, input.fileName);
      return { text: extracted.text.trim(), pageCount: extracted.pageCount, pages: extracted.pages, mode: "native_text" };
    } catch {
      if (!extracted.pageCount) throw new Error(`Could not determine the page count for ${input.fileName}. Upload a valid textbook PDF or image.`);
      return { text: "", pageCount: extracted.pageCount, pages: [], mode: "ocr_required" };
    }
  }

  const text = input.fileBuffer.toString("utf8").trim();
  if (text.length < 100) {
    throw new Error("The text source is too short to create reviewable chapter material. Upload a fuller file or paste more source text.");
  }
  return { text, pageCount: null, pages: [{ pageNumber: 1, text }], mode: "native_text" };
}

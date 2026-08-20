import { readPdfTextCandidate, validateExtractedPdfText } from "./pdfProcessor";

export type SupportedCurriculumMimeType = "application/pdf" | "text/plain" | "image/jpeg" | "image/png" | "image/webp";
export type CurriculumExtractionMode = "native_text" | "ocr_required";

const photographedTextbookMimeTypes = new Set<SupportedCurriculumMimeType>(["image/jpeg", "image/png", "image/webp"]);

export function validateCurriculumSourceFileSignature(fileBuffer: Buffer, mimeType: SupportedCurriculumMimeType) {
  if (!fileBuffer.length) throw new Error("Curriculum source must not be empty.");
  const startsWith = (signature: number[]) => signature.every((value, index) => fileBuffer[index] === value);
  if (mimeType === "application/pdf" && !fileBuffer.subarray(0, 5).equals(Buffer.from("%PDF-", "ascii"))) {
    throw new Error("The uploaded file does not match the selected PDF format.");
  }
  if (mimeType === "image/jpeg" && !startsWith([0xff, 0xd8, 0xff])) {
    throw new Error("The uploaded file does not match the selected JPEG format.");
  }
  if (mimeType === "image/png" && !startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    throw new Error("The uploaded file does not match the selected PNG format.");
  }
  if (mimeType === "image/webp" && (!fileBuffer.subarray(0, 4).equals(Buffer.from("RIFF", "ascii")) || !fileBuffer.subarray(8, 12).equals(Buffer.from("WEBP", "ascii")))) {
    throw new Error("The uploaded file does not match the selected WebP format.");
  }
  if (mimeType === "text/plain" && (fileBuffer.includes(0) || fileBuffer.toString("utf8").includes("\uFFFD"))) {
    throw new Error("The uploaded text file is not valid UTF-8 text.");
  }
}

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

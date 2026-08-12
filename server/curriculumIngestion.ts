import { extractTextFromPdf } from "./pdfProcessor";

export type SupportedCurriculumMimeType = "application/pdf" | "text/plain";

export async function extractCurriculumSourceText(input: {
  fileBuffer: Buffer;
  fileName: string;
  mimeType: SupportedCurriculumMimeType;
}): Promise<{ text: string; pageCount: number | null }> {
  if (input.mimeType === "application/pdf") {
    const extracted = await extractTextFromPdf(input.fileBuffer, input.fileName);
    return { text: extracted.text.trim(), pageCount: extracted.pageCount };
  }

  const text = input.fileBuffer.toString("utf8").trim();
  if (text.length < 100) {
    throw new Error("The text source is too short to create reviewable chapter material. Upload a fuller file or paste more source text.");
  }
  return { text, pageCount: null };
}

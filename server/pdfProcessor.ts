import { TRPCError } from "@trpc/server";
import { PDFParse } from "pdf-parse";

export function validateExtractedPdfText(text: string, pageCount: number, fileName: string) {
  const normalizedText = text.replace(/\s+/g, " ").trim();
  const readableCharactersPerPage = normalizedText.length / Math.max(pageCount, 1);
  const meaningfulWords = normalizedText.match(/[A-Za-z]{3,}/g)?.length ?? 0;

  if (readableCharactersPerPage < 120 || meaningfulWords < Math.max(40, pageCount * 4)) {
    throw new Error(
      `${fileName} appears to be scanned or image-based and does not contain enough selectable text for reliable quiz generation. Please upload an OCR-enabled/text-based PDF or paste the extracted text.`
    );
  }
}

export async function extractTextFromPdf(fileBuffer: Buffer, fileName: string) {
  const parser = new PDFParse({ data: fileBuffer });

  try {
    const result = await parser.getText();
    const text = result.text.replace(/\u0000/g, "").trim();

    if (!text) {
      throw new Error(`No selectable text was found in ${fileName}. If this is a scanned PDF, use an OCR-enabled copy.`);
    }

    validateExtractedPdfText(text, result.total, fileName);

    return {
      text,
      pageCount: result.total,
      pages: result.pages.map((page) => ({ pageNumber: page.num, text: page.text.replace(/\u0000/g, "").trim() })),
    };
  } catch (error) {
    console.error(`PDF extraction error for ${fileName}:`, error);
    throw new Error(error instanceof Error ? error.message : `Failed to extract text from PDF: ${fileName}`);
  } finally {
    await parser.destroy();
  }
}

import { TRPCError } from "@trpc/server";
import * as pdfjs from "pdfjs-dist";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = require.resolve("pdfjs-dist/build/pdf.worker.min.mjs");

export async function extractTextFromPdf(fileBuffer: Buffer, fileName: string) {
  try {
    const pdfDocument = await pdfjs.getDocument({ data: new Uint8Array(fileBuffer) }).promise;
    let fullText = "";
    for (let i = 1; i <= pdfDocument.numPages; i++) {
      const page = await pdfDocument.getPage(i);
      const textContent = await page.getTextContent();
      fullText += textContent.items.map((item: any) => item.str).join(" ") + "\n";
    }
    return { text: fullText, pageCount: pdfDocument.numPages };
  } catch (error) {
    console.error(`PDF extraction error for ${fileName}:`, error);
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: `Failed to extract text from PDF: ${fileName}`,
      cause: error,
    });
  }
}

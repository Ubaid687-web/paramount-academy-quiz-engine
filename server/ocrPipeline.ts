import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { PDFDocument } from "pdf-lib";
import { storageGet } from "./storage";
import type { SupportedCurriculumMimeType } from "./curriculumIngestion";
import { writeStoredPdfToPath } from "./chunkedPdfManifest";
import { isVisionOcrConfigured, runVisionOcr } from "./visionOcr";

const execFileAsync = promisify(execFile);
export const OCR_PAGES_PER_RUN = 2;
export const OCR_LANGUAGE = "urd+eng";

export type OcrTextPage = { pageNumber: number; text: string };

function extensionForMimeType(mimeType: SupportedCurriculumMimeType) {
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
}

export function buildOcrTranscript(pages: OcrTextPage[]) {
  return [...pages]
    .sort((left, right) => left.pageNumber - right.pageNumber)
    .map((page) => `[OCR page ${page.pageNumber}]\n${page.text.trim()}`)
    .join("\n\n");
}

export function parseOcrTranscript(existingText: string | null | undefined) {
  const pages = new Map<number, string>();
  for (const match of Array.from((existingText ?? "").matchAll(/\[OCR page (\d+)\]\n([\s\S]*?)(?=\n\n\[OCR page \d+\]\n|$)/g))) {
    pages.set(Number(match[1]), match[2].trim());
  }
  return Array.from(pages.entries()).map(([pageNumber, text]) => ({ pageNumber, text }));
}

export function mergeOcrTranscript(existingText: string | null | undefined, additions: OcrTextPage[]) {
  const pages = new Map<number, string>();
  for (const page of parseOcrTranscript(existingText)) pages.set(page.pageNumber, page.text);
  for (const page of additions) pages.set(page.pageNumber, page.text.trim());
  return buildOcrTranscript(Array.from(pages.entries()).map(([pageNumber, text]) => ({ pageNumber, text })));
}

export function replaceOcrTranscriptPage(existingText: string | null | undefined, pageNumber: number, correctedText: string) {
  const pages = parseOcrTranscript(existingText);
  if (!pages.some((page) => page.pageNumber === pageNumber)) {
    throw new Error(`OCR page ${pageNumber} was not found in this stored transcript.`);
  }
  const normalized = correctedText.replace(/\u0000/g, "").replace(/\r\n/g, "\n").trim();
  if (!normalized) throw new Error("The corrected OCR text cannot be empty.");
  return buildOcrTranscript(pages.map((page) => page.pageNumber === pageNumber ? { ...page, text: normalized } : page));
}

async function runTesseract(imagePath: string) {
  const { stdout } = await execFileAsync("tesseract", [imagePath, "stdout", "-l", OCR_LANGUAGE, "--psm", "3"], {
    maxBuffer: 4 * 1024 * 1024,
    timeout: 50_000,
  });
  return stdout.replace(/\u0000/g, "").trim();
}

async function extractOcrBatchWithVision(input: {
  bytes: Buffer;
  mimeType: SupportedCurriculumMimeType;
  startPage: number;
  pageEnd: number;
}): Promise<OcrTextPage[]> {
  if (input.mimeType !== "application/pdf") {
    // Non-PDF sources are a single image, which the pipeline treats as one page.
    const text = await runVisionOcr({ data: input.bytes, mediaType: input.mimeType });
    return [{ pageNumber: input.startPage, text }];
  }

  const source = await PDFDocument.load(input.bytes, { ignoreEncryption: true });
  const total = source.getPageCount();
  const pages: OcrTextPage[] = [];

  for (let pageNumber = input.startPage; pageNumber <= input.pageEnd; pageNumber += 1) {
    if (pageNumber > total) break;
    // Send exactly one page per request so the transcript maps cleanly to page
    // numbers and the model never has to disambiguate multiple pages.
    const single = await PDFDocument.create();
    const [copied] = await single.copyPages(source, [pageNumber - 1]);
    single.addPage(copied);
    const singleBytes = await single.save();
    const text = await runVisionOcr({ data: singleBytes, mediaType: "application/pdf" });
    pages.push({ pageNumber, text });
  }

  return pages;
}

export async function extractOcrBatch(input: {
  storageKey: string;
  mimeType: SupportedCurriculumMimeType;
  startPage: number;
  totalPages: number;
}): Promise<OcrTextPage[]> {
  const pageEnd = Math.min(input.totalPages, input.startPage + OCR_PAGES_PER_RUN - 1);
  if (input.startPage < 1 || input.startPage > input.totalPages) return [];

  const workDir = await mkdtemp(path.join(os.tmpdir(), "paramount-ocr-"));
  try {
    const inputPath = path.join(workDir, `source.${extensionForMimeType(input.mimeType)}`);
    await writeStoredPdfToPath(input.storageKey, inputPath);

    // Preferred, self-owned path: a vision model reads the page directly (no
    // native binaries, higher accuracy for Urdu + English scans).
    if (isVisionOcrConfigured()) {
      const bytes = await readFile(inputPath);
      return await extractOcrBatchWithVision({ bytes, mimeType: input.mimeType, startPage: input.startPage, pageEnd });
    }

    // Fallback path for container deployments without an AI Gateway: tesseract.
    const pages: OcrTextPage[] = [];
    for (let pageNumber = input.startPage; pageNumber <= pageEnd; pageNumber += 1) {
      const imagePath = input.mimeType === "application/pdf"
        ? path.join(workDir, `page-${pageNumber}.jpg`)
        : inputPath;
      if (input.mimeType === "application/pdf") {
        await execFileAsync("pdftoppm", ["-f", String(pageNumber), "-l", String(pageNumber), "-r", "170", "-singlefile", "-jpeg", inputPath, imagePath.slice(0, -4)], {
          maxBuffer: 1024 * 1024,
          timeout: 50_000,
        });
      }
      pages.push({ pageNumber, text: await runTesseract(imagePath) });
    }
    return pages;
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

export async function getStoredPdfPageCount(storageKey: string) {
  const workDir = await mkdtemp(path.join(os.tmpdir(), "paramount-pdf-pages-"));
  try {
    const inputPath = path.join(workDir, "source.pdf");
    await writeStoredPdfToPath(storageKey, inputPath);
    // Pure-JS page count (pdf-lib) so this works on serverless hosts without the
    // poppler `pdfinfo` binary.
    const bytes = await readFile(inputPath);
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const pageCount = doc.getPageCount();
    if (!Number.isSafeInteger(pageCount) || pageCount < 1 || pageCount > 2_000) throw new Error("The protected PDF page count is unavailable or exceeds the review limit.");
    return pageCount;
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

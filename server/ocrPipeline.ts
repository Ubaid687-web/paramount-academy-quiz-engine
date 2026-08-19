import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { storageGet } from "./storage";
import type { SupportedCurriculumMimeType } from "./curriculumIngestion";

const execFileAsync = promisify(execFile);
export const OCR_PAGES_PER_RUN = 2;

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

async function downloadSource(storageKey: string) {
  const { url } = await storageGet(storageKey);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not retrieve the stored source for OCR (${response.status}).`);
  return Buffer.from(await response.arrayBuffer());
}

async function runTesseract(imagePath: string) {
  const { stdout } = await execFileAsync("tesseract", [imagePath, "stdout", "-l", "eng", "--psm", "3"], {
    maxBuffer: 4 * 1024 * 1024,
    timeout: 50_000,
  });
  return stdout.replace(/\u0000/g, "").trim();
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
    await writeFile(inputPath, await downloadSource(input.storageKey));
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

import { readFile } from "node:fs/promises";
import { storagePut } from "../server/storage.ts";

const year = process.argv[2];
if (year !== "2024" && year !== "2025") {
  throw new Error("Pass a supported paper year: 2024 or 2025.");
}

const transcriptPath = `/home/ubuntu/webdev-static-assets/paramount-assessment-pattern-sources/fbise-grade10-computer-science-${year}-past-paper-ocr-transcript.txt`;
const storageKey = `assessment-patterns/grade-10/computer-science/${year}/fbise-grade10-computer-science-${year}-past-paper-ocr-transcript.txt`;
const sourceText = await readFile(transcriptPath);
const result = await storagePut(storageKey, sourceText, "text/plain; charset=utf-8");

console.log(JSON.stringify({ year, storageKey, ...result }, null, 2));

import { readFile } from "node:fs/promises";
import { storagePut } from "../server/storage.ts";

const sourcePath = "/home/ubuntu/webdev-static-assets/paramount-curriculum-sources/fbise-grade10-physics-2025-ocr.txt";
const sourceText = await readFile(sourcePath);
const result = await storagePut(
  "curriculum/grade-10/physics/2025/fbise-grade10-physics-2025-ocr-transcript.txt",
  sourceText,
  "text/plain; charset=utf-8"
);

console.log(JSON.stringify({ ...result, bytes: sourceText.byteLength }));

import { readFile } from "node:fs/promises";
import { storagePut } from "../server/storage.ts";

const sourcePath = "/home/ubuntu/webdev-static-assets/paramount-curriculum-sources/fbise-grade10-computer-science-2022-23-ocr-transcript.txt";
const storageKey = "curriculum/grade-10/computer-science/2022-23/fbise-grade10-computer-science-2022-23-ocr-transcript.txt";
const sourceText = await readFile(sourcePath);
const result = await storagePut(storageKey, sourceText, "text/plain; charset=utf-8");

console.log(JSON.stringify({ storageKey, ...result }, null, 2));

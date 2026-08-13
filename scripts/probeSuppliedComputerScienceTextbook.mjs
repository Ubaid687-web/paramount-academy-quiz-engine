import { readFile } from "node:fs/promises";
import { extractTextFromPdf } from "../server/pdfProcessor.ts";

const sourcePath = "/home/ubuntu/upload/class10computerbookpdffederalboard.pdf";
const sourceBuffer = await readFile(sourcePath);
const result = await extractTextFromPdf(sourceBuffer, "class10computerbookpdffederalboard.pdf");

console.log(JSON.stringify({
  pageCount: result.pageCount,
  characterCount: result.text.length,
  sample: result.text.slice(0, 1500),
}, null, 2));

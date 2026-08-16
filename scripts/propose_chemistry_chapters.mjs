import { readFile, writeFile } from "node:fs/promises";
import { proposeChaptersFromExtractedText } from "../server/chapterProposal.ts";

const paths = [
  "sources/chemistry_ocr_001_030.txt",
  "sources/chemistry_ocr_031_060.txt",
  "sources/chemistry_ocr_061_090.txt",
  "sources/chemistry_ocr_091_120.txt",
  "sources/chemistry_ocr_121_164.txt",
];
const text = (await Promise.all(paths.map((path) => readFile(path, "utf8")))).join("\n");
const proposals = proposeChaptersFromExtractedText(text);
await writeFile("sources/chemistry_chapter_proposals.json", JSON.stringify({ sourceFile: "class10chemistrybookpdffederalboard.pdf", pageCount: 164, proposalCount: proposals.length, proposals }, null, 2) + "\n", "utf8");
console.log(JSON.stringify(proposals.map(({ sequence, code, title, startPage, endPage }) => ({ sequence, code, title, startPage, endPage })), null, 2));

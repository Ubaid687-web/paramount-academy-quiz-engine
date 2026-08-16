import { readFile } from "node:fs/promises";
import {
  createCurriculumChapter,
  getCurriculumSet,
  getCurriculumSource,
  listCurriculumChapters,
  listCurriculumSets,
  listCurriculumSources,
} from "../server/db.ts";

const unitMap = [
  [1, "History of Chemistry", 7, 13],
  [2, "Matter", 14, 25],
  [3, "Stoichiometry", 26, 45],
  [4, "Electrochemistry", 46, 63],
  [5, "Reaction Kinetics", 64, 73],
  [6, "Salts", 74, 81],
  [7, "Nitrogen, Sulphur and Metals", 82, 94],
  [8, "Organic Chemistry", 95, 108],
  [9, "Hydrocarbons", 109, 122],
  [10, "Hydroxy Compounds", 123, 129],
  [11, "Carboxylic Compounds", 130, 136],
  [12, "Polymers", 137, 149],
  [13, "Biochemistry", 150, 164],
];
const ocrPaths = [
  "sources/chemistry_ocr_001_030.txt",
  "sources/chemistry_ocr_031_060.txt",
  "sources/chemistry_ocr_061_090.txt",
  "sources/chemistry_ocr_091_120.txt",
  "sources/chemistry_ocr_121_164.txt",
];
const fullText = (await Promise.all(ocrPaths.map((path) => readFile(path, "utf8")))).join("\n");
const pageMap = new Map();
for (const match of fullText.matchAll(/--- PAGE (\d+) ---([\s\S]*?)(?=--- PAGE \d+ ---|$)/g)) {
  pageMap.set(Number(match[1]), match[2].trim());
}
if (pageMap.size !== 164) throw new Error(`Expected 164 OCR pages, found ${pageMap.size}.`);

const sets = await listCurriculumSets();
const set = sets.find((candidate) => candidate.id === 120001) ?? sets.find((candidate) => candidate.board === "FBISE" && candidate.grade === "10" && candidate.subject === "chemistry" && candidate.label === "FBISE Grade 10 Chemistry — National Book Foundation 2025");
if (!set) throw new Error("Chemistry draft edition was not found.");
const sourceRecord = (await listCurriculumSources(set.id)).find((candidate) => candidate.originalFileName === "class10chemistrybookpdffederalboard.pdf");
const source = sourceRecord ? await getCurriculumSource(sourceRecord.id) : undefined;
if (!source) throw new Error("The user-supplied Chemistry PDF source was not found on the draft edition.");
const existing = await listCurriculumChapters(set.id);
if (existing.length) {
  console.log(JSON.stringify({ setId: set.id, sourceId: source.id, chapterCount: existing.length, status: "already_registered" }, null, 2));
  process.exit(0);
}

const chapters = [];
for (const [sequence, title, startPage, endPage] of unitMap) {
  const contentText = Array.from({ length: endPage - startPage + 1 }, (_, index) => `--- PAGE ${startPage + index} ---\n${pageMap.get(startPage + index) ?? ""}`).join("\n\n").trim();
  if (contentText.length < 100) throw new Error(`Unit ${sequence} OCR content is too short.`);
  chapters.push(await createCurriculumChapter({
    curriculumSetId: set.id,
    sourceId: source.id,
    sequence,
    code: `Unit ${String(sequence).padStart(2, "0")}`,
    title,
    blockKey: `unit-${sequence}`,
    partKey: null,
    startPage,
    endPage,
    contentText,
    isActive: 1,
  }));
}
console.log(JSON.stringify({ setId: set.id, sourceId: source.id, chapterCount: chapters.length, status: "draft_chapters_registered", chapters: chapters.map((chapter) => ({ id: chapter.id, sequence: chapter.sequence, code: chapter.code, title: chapter.title, startPage: chapter.startPage, endPage: chapter.endPage })) }, null, 2));

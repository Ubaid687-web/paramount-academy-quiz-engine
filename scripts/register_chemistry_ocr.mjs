import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createCurriculumSet, createCurriculumSource, getCurriculumSet, listCurriculumSets } from "../server/db.ts";
import { storagePut } from "../server/storage.ts";

const pdfPath = "/home/ubuntu/upload/class10chemistrybookpdffederalboard.pdf";
const ocrPaths = [
  "sources/chemistry_ocr_001_030.txt",
  "sources/chemistry_ocr_031_060.txt",
  "sources/chemistry_ocr_061_090.txt",
  "sources/chemistry_ocr_091_120.txt",
  "sources/chemistry_ocr_121_164.txt",
];
const setLabel = "FBISE Grade 10 Chemistry — National Book Foundation 2025";
const editionLabel = "First Edition, February 2025 · NCP 2022–23";
const now = new Date();

const pdf = await readFile(pdfPath);
const ocr = (await Promise.all(ocrPaths.map((path) => readFile(path, "utf8")))).join("\n");
if (ocr.trim().length < 1000) throw new Error("OCR transcript is unexpectedly short.");

const existingSets = await listCurriculumSets();
const existing = existingSets.find((set) => set.board === "FBISE" && set.grade === "10" && set.subject === "chemistry" && set.label === setLabel);
let set = existing;
if (!set) {
  set = await createCurriculumSet({
    board: "FBISE",
    grade: "10",
    subject: "chemistry",
    label: setLabel,
    editionLabel,
    status: "draft",
    replacesSetId: 30001,
    createdBy: 1,
  });
}

const existingSources = set ? await import("../server/db.ts").then(({ listCurriculumSources }) => listCurriculumSources(set.id)) : [];
let source = existingSources.find((candidate) => candidate.originalFileName === "class10chemistrybookpdffederalboard.pdf" && candidate.contentHash === createHash("sha256").update(pdf).digest("hex"));
if (!source) {
  const stored = await storagePut(`curricula/${set.id}/class10chemistrybookpdffederalboard.pdf`, pdf, "application/pdf");
  source = await createCurriculumSource({
    curriculumSetId: set.id,
    storageKey: stored.key,
    storageUrl: stored.url,
    originalFileName: "class10chemistrybookpdffederalboard.pdf",
    mimeType: "application/pdf",
    contentHash: createHash("sha256").update(pdf).digest("hex"),
    extractionStatus: "extracted",
    pageCount: 164,
    extractedText: ocr,
    uploadedBy: 1,
    extractedAt: now,
  });
}

console.log(JSON.stringify({ setId: set.id, setStatus: set.status, sourceId: source.id, sourceFile: source.originalFileName, pageCount: source.pageCount, ocrCharacters: ocr.length }, null, 2));

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import {
  activateCurriculumSet,
  createCurriculumChapter,
  createCurriculumSet,
  createCurriculumSource,
  createScopeTemplateWithChapters,
  listCurriculumSets,
  replaceChapterSegments,
} from "../server/db.ts";

const adminUserId = 1;
const transcriptPath = "/home/ubuntu/webdev-static-assets/paramount-curriculum-sources/fbise-grade10-chemistry-ocr-transcript.txt";
const storageKey = "fbise-grade10-chemistry-ocr-transcript_68529795.txt";
const storageUrl = "/manus-storage/fbise-grade10-chemistry-ocr-transcript_68529795.txt";

const chapters = [
  [9, "Chemical Equilibrium", 7, 20, "physical-chemistry", "first-half"],
  [10, "Acids, Bases and Salts", 21, 46, "physical-chemistry", "first-half"],
  [11, "Organic Chemistry", 47, 72, "organic-chemistry", "first-half"],
  [12, "Hydrocarbons", 73, 90, "organic-chemistry", "first-half"],
  [13, "Biochemistry", 91, 108, "life-and-environment", "second-half"],
  [14, "Environmental Chemistry I: Atmosphere", 109, 126, "life-and-environment", "second-half"],
  [15, "Environmental Chemistry II: Water", 127, 144, "life-and-environment", "second-half"],
  [16, "Chemical Industries", 145, 169, "industry", "second-half"],
];

const existing = await listCurriculumSets();
const duplicate = existing.find(
  (set) => set.label === "FBISE Grade 10 Chemistry" && set.editionLabel === "2020 NBF textbook · OCR-reviewed transcript",
);
if (duplicate) {
  throw new Error(`The recovered Grade 10 Chemistry curriculum already exists as set ${duplicate.id}.`);
}

const transcript = await readFile(transcriptPath, "utf8");
const pages = transcript.split("\f");
if (pages.length < 169) {
  throw new Error(`Expected at least 169 OCR transcript pages, found ${pages.length}.`);
}

const contentHash = createHash("sha256").update(transcript).digest("hex");

const curriculumSet = await createCurriculumSet({
  grade: "10",
  subject: "chemistry",
  board: "FBISE",
  label: "FBISE Grade 10 Chemistry",
  editionLabel: "2020 NBF textbook · OCR-reviewed transcript",
  status: "draft",
  createdBy: adminUserId,
});

const source = await createCurriculumSource({
  curriculumSetId: curriculumSet.id,
  storageKey,
  storageUrl,
  originalFileName: "FBISE10thChemistryPDFTextBookNewEdition.pdf",
  mimeType: "text/plain; charset=utf-8",
  contentHash,
  extractionStatus: "extracted",
  pageCount: 169,
  extractedText: transcript,
  uploadedBy: adminUserId,
  extractedAt: new Date(),
});

const savedChapters = [];
for (const [unit, title, startPage, endPage, blockKey, partKey] of chapters) {
  const chapterPages = pages.slice(startPage - 1, endPage);
  const contentText = chapterPages.join("\f").trim();
  if (contentText.length < 800) {
    throw new Error(`Unit ${unit} has insufficient extracted content (${contentText.length} characters).`);
  }

  const chapter = await createCurriculumChapter({
    curriculumSetId: curriculumSet.id,
    sourceId: source.id,
    sequence: unit - 8,
    code: `Unit ${unit}`,
    title,
    blockKey,
    partKey,
    startPage,
    endPage,
    contentText,
    isActive: 1,
  });

  const splitAt = Math.ceil(chapterPages.length / 2);
  const firstText = chapterPages.slice(0, splitAt).join("\f").trim();
  const secondText = chapterPages.slice(splitAt).join("\f").trim();
  const firstEndPage = startPage + splitAt - 1;

  await replaceChapterSegments(chapter.id, [
    {
      sequence: 1,
      label: "First half",
      startPage,
      endPage: firstEndPage,
      startOffset: 0,
      endOffset: firstText.length,
      contentText: firstText,
    },
    {
      sequence: 2,
      label: "Second half",
      startPage: firstEndPage + 1,
      endPage,
      startOffset: firstText.length,
      endOffset: firstText.length + secondText.length,
      contentText: secondText,
    },
  ]);
  savedChapters.push(chapter);
}

const chapterIds = savedChapters.map((chapter) => chapter.id);
await createScopeTemplateWithChapters({
  curriculumSetId: curriculumSet.id,
  scopeKind: "half_syllabus",
  label: "First half · Units 9–12",
  description: "Chemical equilibrium, acids and bases, organic chemistry, and hydrocarbons.",
  isActive: 1,
}, chapterIds.slice(0, 4));
await createScopeTemplateWithChapters({
  curriculumSetId: curriculumSet.id,
  scopeKind: "half_syllabus",
  label: "Second half · Units 13–16",
  description: "Biochemistry, environmental chemistry, water, and chemical industries.",
  isActive: 1,
}, chapterIds.slice(4));
await createScopeTemplateWithChapters({
  curriculumSetId: curriculumSet.id,
  scopeKind: "block",
  label: "Physical chemistry · Units 9–10",
  description: "Chemical equilibrium and acids, bases, and salts.",
  isActive: 1,
}, chapterIds.slice(0, 2));
await createScopeTemplateWithChapters({
  curriculumSetId: curriculumSet.id,
  scopeKind: "block",
  label: "Organic, biological and environmental chemistry · Units 11–15",
  description: "Organic chemistry through the atmosphere and water chapters.",
  isActive: 1,
}, chapterIds.slice(2, 7));

const activeSet = await activateCurriculumSet(curriculumSet.id);
console.log(JSON.stringify({
  curriculumSetId: activeSet.id,
  status: activeSet.status,
  sourceId: source.id,
  pageCount: 169,
  chapters: savedChapters.map((chapter) => ({
    id: chapter.id,
    code: chapter.code,
    title: chapter.title,
    startPage: chapter.startPage,
    endPage: chapter.endPage,
  })),
}, null, 2));

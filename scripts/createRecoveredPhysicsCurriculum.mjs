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
const transcriptPath = "/home/ubuntu/webdev-static-assets/paramount-curriculum-sources/fbise-grade10-physics-2025-ocr.txt";
const storageKey = "curriculum/grade-10/physics/2025/fbise-grade10-physics-2025-ocr-transcript.txt";
const storageUrl = "https://d2xsxph8kpxj0f.cloudfront.net/310519663538757281/g2y5mutEzwdHvruUz8MtKx/curriculum/grade-10/physics/2025/fbise-grade10-physics-2025-ocr-transcript.txt";
const contentHash = "b527747c09b86d98cb660ee430f7d3dab0cc2946cac5bb4fa8f49bd2f52a33b3";

const chapters = [
  [10, "Heat Capacity and Modes of Heat Transfer", 13, 46],
  [11, "Thermal Expansion and Change of State", 47, 75],
  [12, "Waves", 76, 93],
  [13, "Sound", 94, 121],
  [14, "Optics", 122, 159],
  [15, "Electrostatics", 160, 185],
  [16, "Current Electricity", 186, 206],
  [17, "Electric Circuits", 207, 237],
  [18, "Electronics", 238, 259],
  [19, "Electromagnetism", 260, 281],
  [20, "Electromagnetic Waves", 282, 309],
  [21, "Nuclear Physics", 310, 364],
];

const existing = await listCurriculumSets();
const duplicate = existing.find((set) => set.label === "FBISE Grade 10 Physics" && set.editionLabel === "2025 textbook · OCR-reviewed transcript");
if (duplicate) {
  throw new Error(`The recovered Grade 10 Physics curriculum already exists as set ${duplicate.id}.`);
}

const transcript = await readFile(transcriptPath, "utf8");
const pages = transcript.split("\f");
if (pages.length < 364) {
  throw new Error(`Expected at least 364 OCR transcript pages, found ${pages.length}.`);
}

const curriculumSet = await createCurriculumSet({
  grade: "10",
  subject: "physics",
  board: "FBISE",
  label: "FBISE Grade 10 Physics",
  editionLabel: "2025 textbook · OCR-reviewed transcript",
  status: "draft",
  createdBy: adminUserId,
});

const source = await createCurriculumSource({
  curriculumSetId: curriculumSet.id,
  storageKey,
  storageUrl,
  originalFileName: "fbise-grade10-physics-2025-ocr-transcript.txt",
  mimeType: "text/plain; charset=utf-8",
  contentHash,
  extractionStatus: "extracted",
  pageCount: 364,
  extractedText: transcript,
  uploadedBy: adminUserId,
  extractedAt: new Date(),
});

const savedChapters = [];
for (const [unit, title, startPage, endPage] of chapters) {
  const chapterPages = pages.slice(startPage - 1, endPage);
  const contentText = chapterPages.join("\f").trim();
  if (contentText.length < 800) {
    throw new Error(`Unit ${unit} has insufficient extracted content (${contentText.length} characters).`);
  }
  const chapter = await createCurriculumChapter({
    curriculumSetId: curriculumSet.id,
    sourceId: source.id,
    sequence: unit - 9,
    code: `Unit ${unit}`,
    title,
    blockKey: unit <= 14 ? "thermal-waves-optics" : "electricity-modern-physics",
    partKey: unit <= 15 ? "first-half" : "second-half",
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
  label: "First half · Units 10–15",
  description: "Thermal physics, waves, sound, optics, and electrostatics.",
  isActive: 1,
}, chapterIds.slice(0, 6));
await createScopeTemplateWithChapters({
  curriculumSetId: curriculumSet.id,
  scopeKind: "half_syllabus",
  label: "Second half · Units 16–21",
  description: "Electricity, circuits, electronics, electromagnetism, and nuclear physics.",
  isActive: 1,
}, chapterIds.slice(6));
await createScopeTemplateWithChapters({
  curriculumSetId: curriculumSet.id,
  scopeKind: "block",
  label: "Thermal, waves and optics · Units 10–14",
  description: "Physics block for thermal physics, waves, sound, and optics practice.",
  isActive: 1,
}, chapterIds.slice(0, 5));
await createScopeTemplateWithChapters({
  curriculumSetId: curriculumSet.id,
  scopeKind: "block",
  label: "Electricity and modern physics · Units 15–21",
  description: "Physics block for electrostatics through nuclear physics.",
  isActive: 1,
}, chapterIds.slice(5));

const activeSet = await activateCurriculumSet(curriculumSet.id);
console.log(JSON.stringify({
  curriculumSetId: activeSet.id,
  status: activeSet.status,
  sourceId: source.id,
  chapters: savedChapters.map((chapter) => ({ id: chapter.id, code: chapter.code, title: chapter.title, startPage: chapter.startPage, endPage: chapter.endPage })),
}, null, 2));

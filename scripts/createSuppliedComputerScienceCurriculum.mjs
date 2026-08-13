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
const transcriptPath = "/home/ubuntu/webdev-static-assets/paramount-curriculum-sources/fbise-grade10-computer-science-2022-23-ocr-transcript.txt";
const storageKey = "curriculum/grade-10/computer-science/2022-23/fbise-grade10-computer-science-2022-23-ocr-transcript.txt";
const storageUrl = "https://d2xsxph8kpxj0f.cloudfront.net/310519663538757281/g2y5mutEzwdHvruUz8MtKx/curriculum/grade-10/computer-science/2022-23/fbise-grade10-computer-science-2022-23-ocr-transcript.txt";

// Boundaries are physical PDF pages verified from the supplied textbook’s table of contents and unit-opening pages.
const chapters = [
  ["Unit 1", "Computer Systems", 7, 53, "computer-systems", "first-half"],
  ["Unit 2", "Computational Thinking & Algorithms", 54, 65, "computational-thinking", "first-half"],
  ["Unit 3", "Programming Fundamentals", 66, 115, "programming", "first-half"],
  ["Unit 4", "Data and Analysis", 116, 147, "data-analysis", "first-half"],
  ["Unit 5", "Applications of Computer Science", 148, 174, "computer-applications", "second-half"],
  ["Unit 6", "Impacts of Computing", 175, 199, "computing-impacts", "second-half"],
  ["Unit 7", "Digital Literacy", 200, 222, "digital-literacy", "second-half"],
  ["Unit 8", "Entrepreneurship in Digital Age", 223, 262, "digital-entrepreneurship", "second-half"],
];

const existing = await listCurriculumSets();
const duplicate = existing.find(
  (set) => set.label === "FBISE Grade 10 Computer Science" && set.editionLabel === "NCP 2022–23 supplied textbook · OCR-reviewed transcript",
);
if (duplicate) {
  throw new Error(`The supplied Grade 10 Computer Science curriculum already exists as set ${duplicate.id}.`);
}

const transcript = await readFile(transcriptPath, "utf8");
const pages = transcript.split("\f");
if (pages.length < 262) {
  throw new Error(`Expected at least 262 OCR transcript pages, found ${pages.length}.`);
}

const contentHash = createHash("sha256").update(transcript).digest("hex");
const curriculumSet = await createCurriculumSet({
  grade: "10",
  subject: "computer_science",
  board: "FBISE",
  label: "FBISE Grade 10 Computer Science",
  editionLabel: "NCP 2022–23 supplied textbook · OCR-reviewed transcript",
  status: "draft",
  createdBy: adminUserId,
});

const source = await createCurriculumSource({
  curriculumSetId: curriculumSet.id,
  storageKey,
  storageUrl,
  originalFileName: "class10computerbookpdffederalboard.pdf",
  mimeType: "text/plain; charset=utf-8",
  contentHash,
  extractionStatus: "extracted",
  pageCount: 262,
  extractedText: transcript,
  uploadedBy: adminUserId,
  extractedAt: new Date(),
});

const savedChapters = [];
for (const [code, title, startPage, endPage, blockKey, partKey] of chapters) {
  const chapterPages = pages.slice(startPage - 1, endPage);
  const contentText = chapterPages.join("\f").trim();
  if (contentText.length < 800) {
    throw new Error(`${code} has insufficient extracted content (${contentText.length} characters).`);
  }

  const chapter = await createCurriculumChapter({
    curriculumSetId: curriculumSet.id,
    sourceId: source.id,
    sequence: savedChapters.length + 1,
    code,
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
  label: "First half · Units 1–4",
  description: "Computer systems, computational thinking, programming, and data analysis.",
  isActive: 1,
}, chapterIds.slice(0, 4));
await createScopeTemplateWithChapters({
  curriculumSetId: curriculumSet.id,
  scopeKind: "half_syllabus",
  label: "Second half · Units 5–8",
  description: "Applications, impacts, digital literacy, and digital entrepreneurship.",
  isActive: 1,
}, chapterIds.slice(4));
await createScopeTemplateWithChapters({
  curriculumSetId: curriculumSet.id,
  scopeKind: "block",
  label: "Systems and computational thinking · Units 1–2",
  description: "Computer systems and algorithmic problem-solving foundations.",
  isActive: 1,
}, chapterIds.slice(0, 2));
await createScopeTemplateWithChapters({
  curriculumSetId: curriculumSet.id,
  scopeKind: "block",
  label: "Programming, data, and applications · Units 3–5",
  description: "Programming fundamentals, data analysis, and computer-science applications.",
  isActive: 1,
}, chapterIds.slice(2, 5));

const activeSet = await activateCurriculumSet(curriculumSet.id);
console.log(JSON.stringify({
  curriculumSetId: activeSet.id,
  status: activeSet.status,
  sourceId: source.id,
  pageCount: 262,
  chapters: savedChapters.map((chapter) => ({
    id: chapter.id,
    code: chapter.code,
    title: chapter.title,
    startPage: chapter.startPage,
    endPage: chapter.endPage,
  })),
}, null, 2));

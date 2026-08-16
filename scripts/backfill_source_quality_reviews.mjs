import { getCurriculumSource, replaceCurriculumSourcePageReviews } from "../server/db.ts";
import { assessExtractedSourceQuality } from "../server/ocrQuality.ts";

const sourceId = Number(process.argv[2] ?? "90001");
const source = await getCurriculumSource(sourceId);
if (!source?.extractedText?.trim()) throw new Error(`Source ${sourceId} has no extracted text to assess.`);

const pages = Array.from(source.extractedText.matchAll(/--- PAGE (\d+) ---([\s\S]*?)(?=--- PAGE \d+ ---|$)/g)).map((match) => ({
  pageNumber: Number(match[1]),
  text: match[2].trim(),
}));
const resolvedPages = pages.length ? pages : [{ pageNumber: 1, text: source.extractedText }];
const assessments = assessExtractedSourceQuality(resolvedPages);
await replaceCurriculumSourcePageReviews(sourceId, assessments);

const weakPages = assessments.filter((page) => page.reviewStatus === "needs_review");
console.log(JSON.stringify({
  sourceId,
  pageCount: assessments.length,
  weakPageCount: weakPages.length,
  weakPages: weakPages.map((page) => ({ pageNumber: page.pageNumber, qualityScore: page.qualityScore, reviewReasons: page.reviewReasons })),
}, null, 2));

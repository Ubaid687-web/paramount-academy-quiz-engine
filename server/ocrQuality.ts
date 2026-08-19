export type ExtractedSourcePage = {
  pageNumber: number;
  text: string;
};

export type PageQualityAssessment = {
  pageNumber: number;
  textCharacters: number;
  meaningfulWords: number;
  qualityScore: number;
  reviewStatus: "clear" | "needs_review";
  reviewReasons: string | null;
};

const readableScriptPattern = /[A-Za-z\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g;
const meaningfulWordPattern = /[A-Za-z\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]{2,}/g;

/**
 * Scores only the readability of extracted page text. This is a deterministic review signal,
 * not a claim about the factual accuracy of the textbook or any OCR engine's confidence.
 */
export function assessExtractedPageQuality(page: ExtractedSourcePage): PageQualityAssessment {
  const normalized = page.text.replace(/\s+/g, " ").trim();
  const textCharacters = normalized.length;
  const meaningfulWords = normalized.match(meaningfulWordPattern)?.length ?? 0;
  const visibleCharacters = normalized.replace(/\s/g, "");
  const letters = normalized.match(readableScriptPattern)?.length ?? 0;
  const letterRatio = visibleCharacters.length ? letters / visibleCharacters.length : 0;
  const reasons: string[] = [];
  let qualityScore = 100;

  if (textCharacters < 180) {
    qualityScore -= 55;
    reasons.push("very little extracted text");
  } else if (textCharacters < 360) {
    qualityScore -= 20;
    reasons.push("limited extracted text");
  }
  if (meaningfulWords < 25) {
    qualityScore -= 35;
    reasons.push("few readable words");
  } else if (meaningfulWords < 55) {
    qualityScore -= 15;
  }
  if (visibleCharacters.length > 40 && letterRatio < 0.22 && meaningfulWords < 80) {
    qualityScore -= 20;
    reasons.push("mostly symbols or unreadable characters");
  }

  qualityScore = Math.max(0, qualityScore);
  const reviewStatus = qualityScore < 60 ? "needs_review" : "clear";
  return {
    pageNumber: page.pageNumber,
    textCharacters,
    meaningfulWords,
    qualityScore,
    reviewStatus,
    reviewReasons: reviewStatus === "needs_review" ? reasons.join("; ") || "weak extracted text" : null,
  };
}

export function assessExtractedSourceQuality(pages: ExtractedSourcePage[]): PageQualityAssessment[] {
  return pages.map(assessExtractedPageQuality);
}

export function assertNoUnresolvedOcrPages(pages: Array<{ reviewStatus: string }>) {
  const unresolvedCount = pages.filter((page) => page.reviewStatus === "needs_review").length;
  if (unresolvedCount) {
    throw new Error(`Review ${unresolvedCount} weak OCR page${unresolvedCount === 1 ? "" : "s"} before activating this curriculum edition.`);
  }
}

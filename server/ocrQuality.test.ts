import { assessExtractedSourceQuality, assertNoUnresolvedOcrPages } from "./ocrQuality";
import { describe, expect, it } from "vitest";

describe("OCR page-quality assessment", () => {
  it("flags a nearly empty page for administrator review with explainable signals", () => {
    const [assessment] = assessExtractedSourceQuality([{ pageNumber: 4, text: "\n  % %% 12  \n" }]);

    expect(assessment).toMatchObject({ pageNumber: 4, reviewStatus: "needs_review" });
    expect(assessment.qualityScore).toBeLessThan(60);
    expect(assessment.reviewReasons).toContain("very little extracted text");
  });

  it("keeps a readable textbook page clear without inventing a confidence claim", () => {
    const [assessment] = assessExtractedSourceQuality([{ pageNumber: 8, text: "Chemical reactions involve the rearrangement of atoms. Students compare reactants and products, identify evidence, and explain the observed changes using the supplied textbook terminology. ".repeat(5) }]);

    expect(assessment).toMatchObject({ pageNumber: 8, reviewStatus: "clear", reviewReasons: null });
    expect(assessment.qualityScore).toBeGreaterThanOrEqual(60);
  });

  it("blocks activation until every weak OCR page has an administrator review state", () => {
    expect(() => assertNoUnresolvedOcrPages([{ reviewStatus: "clear" }, { reviewStatus: "needs_review" }])).toThrow("Review 1 weak OCR page");
    expect(() => assertNoUnresolvedOcrPages([{ reviewStatus: "reviewed" }, { reviewStatus: "clear" }])).not.toThrow();
  });
});

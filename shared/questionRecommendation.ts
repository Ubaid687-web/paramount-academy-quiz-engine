export type ContentComplexity = "simple" | "moderate" | "complex" | "advanced";

export interface QuestionRecommendationInput {
  totalWords: number;
  complexity: ContentComplexity;
  sectionCount?: number;
  topicCount?: number;
}

export interface QuestionRecommendation {
  minimum: number;
  optimal: number;
  maximum: number;
}

/**
 * Recommend a practical quiz size while preserving room for an administrator
 * to cover a single chapter, several chapters, or a larger revision block.
 */
export function calculateQuestionRecommendation({
  totalWords,
  complexity,
  sectionCount = 0,
  topicCount = 0,
}: QuestionRecommendationInput): QuestionRecommendation {
  const safeWordCount = Math.max(0, totalWords);
  const complexityMultiplier: Record<ContentComplexity, number> = {
    simple: 0.85,
    moderate: 1,
    complex: 1.2,
    advanced: 1.35,
  };

  const contentCoverage = Math.ceil(safeWordCount / 90);
  const structureCoverage = Math.min(20, Math.max(2, Math.ceil(sectionCount * 1.5) + Math.ceil(topicCount * 0.75)));
  const uncappedOptimal = Math.ceil(contentCoverage * complexityMultiplier[complexity] + structureCoverage);
  const optimal = Math.min(100, Math.max(10, uncappedOptimal));

  return {
    minimum: Math.max(5, Math.ceil(optimal * 0.5)),
    optimal,
    maximum: Math.min(100, Math.max(optimal, Math.ceil(optimal * 1.35))),
  };
}

import { describe, expect, it } from "vitest";
import { calculateQuestionRecommendation } from "../shared/questionRecommendation";

describe("question recommendation", () => {
  it("recommends substantially more questions for a large, structured document", () => {
    expect(
      calculateQuestionRecommendation({
        totalWords: 5000,
        complexity: "complex",
        sectionCount: 8,
        topicCount: 10,
      })
    ).toEqual({ minimum: 44, optimal: 88, maximum: 100 });
  });

  it("keeps short material within a sensible minimum quiz range", () => {
    expect(
      calculateQuestionRecommendation({
        totalWords: 240,
        complexity: "simple",
        sectionCount: 1,
        topicCount: 1,
      })
    ).toEqual({ minimum: 5, optimal: 10, maximum: 14 });
  });

  it("caps very large requests at the supported quiz-generation limit", () => {
    expect(
      calculateQuestionRecommendation({
        totalWords: 25000,
        complexity: "advanced",
        sectionCount: 20,
        topicCount: 10,
      })
    ).toEqual({ minimum: 50, optimal: 100, maximum: 100 });
  });
});

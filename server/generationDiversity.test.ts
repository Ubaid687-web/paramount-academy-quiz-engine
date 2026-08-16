import { describe, expect, it } from "vitest";
import { buildPriorHistoryExclusion, fingerprintGenerationSource, validateDistinctQuestionCoverage } from "./generationDiversity";

describe("generation diversity safeguards", () => {
  it("rejects the same source concept when it is lightly reworded inside one paper", () => {
    const result = validateDistinctQuestionCoverage([
      { conceptKey: "daniel cell", sourceReference: "Daniel cell", learningObjective: "Describe the construction and working of a Daniel cell.", question: "Describe the construction of a Daniel cell." },
      { conceptKey: "daniel cell", sourceReference: "Daniel cell", learningObjective: "Explain the working principle of a Daniel cell.", question: "Explain the working of a galvanic Daniel cell." },
    ]);

    expect(result.valid).toBe(false);
    expect(result.issues.join(" ")).toMatch(/repeats an underlying concept/i);
  });

  it("rejects a concept already used by an earlier saved paper for the same scope", () => {
    const result = validateDistinctQuestionCoverage([
      { conceptKey: "hydrogen oxygen fuel cell", sourceReference: "Hydrogen-oxygen fuel cell", learningObjective: "Explain the working of a fuel cell.", question: "Explain the hydrogen-oxygen fuel cell." },
    ], [
      { conceptKey: "hydrogen oxygen fuel cell", sourceReference: "Hydrogen-oxygen fuel cell", learningObjective: "Describe a fuel cell.", question: "Describe the working of the hydrogen-oxygen fuel cell.", assessmentMode: "long" },
    ]);

    expect(result.valid).toBe(false);
    expect(result.issues.join(" ")).toMatch(/earlier saved paper/i);
  });

  it("keeps the source fingerprint stable for the same reviewed scope", () => {
    const scope = { curriculumSet: { id: 12 }, scopeType: "single_chapter", chapterIds: [4] };
    expect(fingerprintGenerationSource(scope, "first source")).toBe(fingerprintGenerationSource(scope, "second source"));
  });

  it("formats prior history as explicit exclusions for the model", () => {
    expect(buildPriorHistoryExclusion([{ conceptKey: "daniel cell", question: "Describe it.", sourceReference: "Electrochemistry", learningObjective: "Explain the Daniel cell." }])).toContain("daniel cell");
  });
});

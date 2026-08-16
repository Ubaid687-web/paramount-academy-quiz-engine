import { describe, expect, it } from "vitest";
import { buildPriorHistoryExclusion, fingerprintGenerationSource, validateDistinctQuestionCoverage } from "./generationDiversity";

describe("generation diversity safeguards", () => {
  it("rejects the same source concept when it repeats the same facet and answer target", () => {
    const result = validateDistinctQuestionCoverage([
      { conceptKey: "daniel cell", facetKey: "working", answerTarget: "electron flow from zinc to copper", sourceReference: "Daniel cell", learningObjective: "Explain the working of a Daniel cell.", question: "Explain the working of a Daniel cell." },
      { conceptKey: "daniel cell", facetKey: "working", answerTarget: "electron flow from zinc to copper", sourceReference: "Daniel cell", learningObjective: "Explain the working of a Daniel cell.", question: "How does a Daniel cell work?" },
    ]);

    expect(result.valid).toBe(false);
    expect(result.issues.join(" ")).toMatch(/repeats an answer target|assessable facet/i);
  });

  it("allows distinct source-supported facets of the same concept", () => {
    const result = validateDistinctQuestionCoverage([
      { conceptKey: "pressure", facetKey: "definition", answerTarget: "force per unit area", sourceReference: "Pressure", learningObjective: "Define pressure.", question: "Define pressure." },
      { conceptKey: "pressure", facetKey: "formula", answerTarget: "P equals F divided by A", sourceReference: "Pressure", learningObjective: "State the formula for pressure.", question: "State the formula for pressure." },
      { conceptKey: "pressure", facetKey: "formula application", answerTarget: "calculated pressure value", sourceReference: "Pressure", learningObjective: "Calculate pressure from force and area.", question: "Calculate pressure when a known force acts on a known area." },
    ]);

    expect(result.valid).toBe(true);
  });

  it("rejects a concept already used by an earlier saved paper for the same scope", () => {
    const result = validateDistinctQuestionCoverage([
      { conceptKey: "hydrogen oxygen fuel cell", facetKey: "working", answerTarget: "electricity from hydrogen oxygen reaction", sourceReference: "Hydrogen-oxygen fuel cell", learningObjective: "Explain the working of a fuel cell.", question: "Explain the hydrogen-oxygen fuel cell." },
    ], [
      { conceptKey: "hydrogen oxygen fuel cell", facetKey: "working", answerTarget: "electricity from hydrogen oxygen reaction", sourceReference: "Hydrogen-oxygen fuel cell", learningObjective: "Describe a fuel cell.", question: "Describe the working of the hydrogen-oxygen fuel cell.", assessmentMode: "long" },
    ]);

    expect(result.valid).toBe(false);
    expect(result.issues.join(" ")).toMatch(/earlier saved paper/i);
  });

  it("keeps the source fingerprint stable for the same reviewed scope", () => {
    const scope = { curriculumSet: { id: 12 }, scopeType: "single_chapter", chapterIds: [4] };
    expect(fingerprintGenerationSource(scope, "first source")).toBe(fingerprintGenerationSource(scope, "second source"));
  });

  it("formats prior history as explicit exclusions for the model", () => {
    expect(buildPriorHistoryExclusion([{ conceptKey: "daniel cell", facetKey: "working", answerTarget: "electron flow", question: "Describe it.", sourceReference: "Electrochemistry", learningObjective: "Explain the Daniel cell." }])).toContain("facetKey=working");
  });
});

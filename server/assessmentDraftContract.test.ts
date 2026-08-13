import { describe, expect, it } from "vitest";
import { validateAssessmentDraftPayload } from "../shared/assessmentDraftContract";

const source = {
  sourceReference: "Unit 10, page 18",
  learningObjective: "Apply the selected concept accurately.",
};

describe("assessment draft contract", () => {
  it("accepts a source-grounded MCQ draft with explicit marks", () => {
    const result = validateAssessmentDraftPayload({
      mode: "mcq",
      title: "Physics source-grounded draft",
      estimatedDurationMinutes: 10,
      items: [{
        kind: "mcq",
        question: "Which statement best describes the concept?",
        options: { A: "Correct", B: "Alternative one", C: "Alternative two", D: "Alternative three" },
        answer: "A",
        explanation: "The approved source supports option A.",
        difficulty: "medium",
        marks: 1,
        ...source,
      }],
    }, "mcq");

    expect(result).toMatchObject({ valid: true, totalMarks: 1 });
  });

  it("rejects a long-question draft whose rubric does not match its explicit marks", () => {
    const result = validateAssessmentDraftPayload({
      mode: "long",
      title: "Long draft",
      estimatedDurationMinutes: null,
      items: [{
        kind: "long",
        question: "Explain the process.",
        expectedKeyPoints: ["First supported point"],
        markingRubric: [{ criterion: "Explains the key process", marks: 2 }],
        difficulty: "hard",
        marks: 3,
        ...source,
      }],
    }, "long");

    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.issues).toContain("Long-question rubric marks must equal the item marks.");
  });

  it("requires paper-pattern references and exact marks for a full-paper draft", () => {
    const result = validateAssessmentDraftPayload({
      mode: "full_paper",
      title: "Full paper draft",
      estimatedDurationMinutes: null,
      patternReferences: [],
      totalMarks: 2,
      sections: [{
        label: "Section A",
        instructions: "Attempt the question.",
        items: [{
          kind: "short",
          question: "State the supported concept.",
          expectedAnswer: "A source-grounded answer.",
          markingGuide: ["Names the correct concept"],
          difficulty: "easy",
          marks: 1,
          ...source,
        }],
      }],
    }, "full_paper");

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.issues).toContain("A full paper requires at least one paper-pattern reference.");
      expect(result.issues).toContain("Full-paper total marks must equal the sum of all item marks.");
    }
  });
});

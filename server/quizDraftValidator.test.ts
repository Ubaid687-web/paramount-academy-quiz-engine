import { describe, expect, it } from "vitest";
import { buildDraftQualityChecks, validateGeneratedMcqs } from "./quizDraftValidator";

const validQuestion = {
  question: "Which quantity measures the rate of change of velocity?",
  options: { A: "Speed", B: "Acceleration", C: "Momentum", D: "Displacement" },
  answer: "B" as const,
  explanation: "Acceleration is the rate at which velocity changes.",
  difficulty: "medium" as const,
  sourceReference: "Kinematics: acceleration",
  learningObjective: "Apply the definition of acceleration.",
};

describe("quiz draft validation", () => {
  it("accepts a complete, source-referenced MCQ draft", () => {
    expect(validateGeneratedMcqs([validQuestion], 1)).toEqual({ valid: true, issues: [] });
  });

  it("rejects duplicate, incomplete, and ungrounded questions", () => {
    const invalidQuestion = {
      ...validQuestion,
      options: { A: "Speed", B: "Speed", C: "", D: "Displacement" },
      sourceReference: "",
      learningObjective: "",
    };
    const result = validateGeneratedMcqs([validQuestion, invalidQuestion], 2);
    expect(result.valid).toBe(false);
    expect(result.issues).toContain("Question 2 has duplicate MCQ options.");
    expect(result.issues).toContain("Question 2 has an empty MCQ option.");
    expect(result.issues).toContain("Question 2 has no source reference.");
    expect(result.issues).toContain("Question 2 has no learning objective.");
  });

  it("marks completed AI output as a review-required draft", () => {
    expect(buildDraftQualityChecks([validQuestion], 1)).toMatchObject({
      duplicateQuestionRisk: "low",
      hallucinationRisk: "medium",
    });
    expect(buildDraftQualityChecks([validQuestion], 1).reviewWarnings).toEqual(
      expect.arrayContaining([expect.stringMatching(/faculty review/i)])
    );
  });
});

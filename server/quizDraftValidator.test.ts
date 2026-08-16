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

  it("accepts a legitimate wrapped paper-style option and records fit review instead of applying a blind cap", () => {
    const paperShaped = {
      ...validQuestion,
      question: "A student places dry ice in a sealed container and observes expansion after some time; what is the best explanation for this change?",
      options: {
        A: "The dry ice melted and turned into liquid, increasing volume.",
        B: "The dry ice reacted with oxygen to form new compounds.",
        C: "The dry ice sublimed, producing gas that increases pressure.",
        D: "The container absorbed external heat, causing it to burst.",
      },
    };
    expect(validateGeneratedMcqs([paperShaped], 1)).toEqual({ valid: true, issues: [] });
    expect(buildDraftQualityChecks([paperShaped], 1).layoutWarnings).toEqual(
      expect.arrayContaining([expect.stringMatching(/rendered table-fit review/i)])
    );
  });

  it("rejects paragraph-like options and stems that are outside the supplied paper forms", () => {
    const oversized = {
      ...validQuestion,
      question: "This deliberately overlong question adds repeated background context and several unrelated clauses before finally asking the student to identify one source-supported answer from the supplied textbook material in a fixed Section A row while also considering extra conditions that are not needed for the tested concept or paper format.",
      options: {
        A: "This option is written as a complete explanation with multiple connected ideas rather than as a compact answer choice.",
        B: "Speed",
        C: "Momentum",
        D: "Displacement",
      },
    };
    const result = validateGeneratedMcqs([oversized], 1);
    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.stringMatching(/unusually long stem/i),
      expect.stringMatching(/paragraph-like option/i),
    ]));
  });
});

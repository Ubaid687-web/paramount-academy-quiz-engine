import { describe, expect, it } from "vitest";
import { buildSharedStyleAnchor } from "./styleAnchor";

const paperPatternGuidance = [{
  sourceKind: "past_paper" as const,
  academicYear: "2026",
  sectionAInstruction: "Attempt all MCQs. Select one correct option.",
  orRule: "Attempt one alternative from each numbered OR pair.",
  profileEvidenceNotes: "Questions use concise direct wording.",
}];

const approvedExample = {
  questionId: 14,
  quizId: 5,
  quizTitle: "Published motion practice",
  questionText: "Which quantity represents the rate of change of displacement?",
  optionA: "Velocity",
  optionB: "Distance",
  optionC: "Mass",
  optionD: "Force",
};

describe("shared FBISE style anchor", () => {
  it("works for first use with reviewed structure rules and no approved examples", () => {
    const anchor = buildSharedStyleAnchor({ board: "FBISE", grade: "10", subject: "physics", paperPatternGuidance, approvedExamples: [] });

    expect(anchor.approvedExampleCount).toBe(0);
    expect(anchor.instruction).toContain("No approved examples yet");
    expect(anchor.instruction).toContain("Attempt all MCQs");
    expect(anchor.instruction).toContain("sole authority for every answer");
  });

  it("includes selected examples as style-only evidence and changes cache identity when selection changes", () => {
    const withoutExample = buildSharedStyleAnchor({ board: "FBISE", grade: "10", subject: "physics", paperPatternGuidance, approvedExamples: [] });
    const withExample = buildSharedStyleAnchor({ board: "FBISE", grade: "10", subject: "physics", paperPatternGuidance, approvedExamples: [approvedExample] });

    expect(withExample.approvedExampleCount).toBe(1);
    expect(withExample.instruction).toContain(approvedExample.questionText);
    expect(withExample.instruction).toContain("Never copy or paraphrase an example");
    expect(withExample.fingerprint).not.toBe(withoutExample.fingerprint);
  });
});

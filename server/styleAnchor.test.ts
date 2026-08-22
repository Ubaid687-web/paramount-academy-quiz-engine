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

  it("adds the audited Grade 10 Computer Science direct-wording and selected-scope calibration without turning papers into factual authority", () => {
    const computerScienceAnchor = buildSharedStyleAnchor({ board: "FBISE", grade: "10", subject: "computer_science", paperPatternGuidance, approvedExamples: [] });
    const physicsAnchor = buildSharedStyleAnchor({ board: "FBISE", grade: "10", subject: "physics", paperPatternGuidance, approvedExamples: [] });

    expect(computerScienceAnchor.instruction).toContain("GRADE 10 COMPUTER SCIENCE CALIBRATION");
    expect(computerScienceAnchor.instruction).toContain("natural Which/What/Why/How form");
    expect(computerScienceAnchor.instruction).toContain("Do not let a topic that appeared in a past paper select the scope");
    expect(computerScienceAnchor.instruction).toContain("Never copy a past-paper stem, task, code sample, or answer");
    expect(physicsAnchor.instruction).not.toContain("GRADE 10 COMPUTER SCIENCE CALIBRATION");
  });

  it("keeps Grade 9 reviewed paper-pattern wording programme-local and separate from Grade 10 calibration", () => {
    const grade9Pattern = [{
      sourceKind: "model_paper" as const,
      academicYear: "2027",
      sectionAInstruction: "Choose the best answer for each compact MCQ.",
      profileEvidenceNotes: "Grade 9 model-paper structure reviewed by Portal Admin.",
    }];
    const grade9Anchor = buildSharedStyleAnchor({ board: "FBISE", grade: "9", subject: "computer_science", paperPatternGuidance: grade9Pattern, approvedExamples: [] });
    const grade10Anchor = buildSharedStyleAnchor({ board: "FBISE", grade: "10", subject: "computer_science", paperPatternGuidance, approvedExamples: [] });

    expect(grade9Anchor.instruction).toContain("Programme: FBISE, Grade 9, computer_science.");
    expect(grade9Anchor.instruction).toContain("Choose the best answer for each compact MCQ.");
    expect(grade9Anchor.instruction).toContain("Grade 9 model-paper structure reviewed by Portal Admin.");
    expect(grade9Anchor.instruction).not.toContain("GRADE 10 COMPUTER SCIENCE CALIBRATION");
    expect(grade9Anchor.fingerprint).not.toBe(grade10Anchor.fingerprint);
  });
});

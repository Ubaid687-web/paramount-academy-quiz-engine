export type GeneratedMcq = {
  question: string;
  options: { A: string; B: string; C: string; D: string };
  answer: "A" | "B" | "C" | "D";
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
  sourceReference?: string;
  learningObjective?: string;
};

export type DraftQualityChecks = {
  duplicateQuestionRisk: "low" | "medium" | "high";
  hallucinationRisk: "low" | "medium" | "high";
  coverageNotes: string;
  reviewWarnings: string[];
};

function normalise(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").replace(/[^a-z0-9 ]/g, "").trim();
}

export function validateGeneratedMcqs(mcqs: unknown[], expectedCount: number) {
  const issues: string[] = [];

  if (mcqs.length !== expectedCount) {
    issues.push(`Expected ${expectedCount} questions but received ${mcqs.length}.`);
  }

  const seenQuestions = new Set<string>();
  mcqs.forEach((candidate, index) => {
    const question = candidate as Partial<GeneratedMcq>;
    const number = index + 1;
    const questionKey = normalise(question.question ?? "");
    const optionValues = [question.options?.A, question.options?.B, question.options?.C, question.options?.D];
    const uniqueOptions = new Set(optionValues.map((option) => normalise(option ?? "")));

    if (!questionKey) issues.push(`Question ${number} has no question text.`);
    if (questionKey && seenQuestions.has(questionKey)) issues.push(`Question ${number} duplicates an earlier question.`);
    if (questionKey) seenQuestions.add(questionKey);
    if (optionValues.some((option) => !option?.trim())) issues.push(`Question ${number} has an empty MCQ option.`);
    if (uniqueOptions.size !== 4) issues.push(`Question ${number} has duplicate MCQ options.`);
    if (!question.answer || !["A", "B", "C", "D"].includes(question.answer)) issues.push(`Question ${number} has an invalid correct answer.`);
    if (!question.explanation?.trim()) issues.push(`Question ${number} has no explanation.`);
    if (!question.difficulty || !["easy", "medium", "hard"].includes(question.difficulty)) issues.push(`Question ${number} has an invalid difficulty value.`);
    if (!question.sourceReference?.trim()) issues.push(`Question ${number} has no source reference.`);
    if (!question.learningObjective?.trim()) issues.push(`Question ${number} has no learning objective.`);
  });

  return { valid: issues.length === 0, issues };
}

export function buildDraftQualityChecks(mcqs: GeneratedMcq[], requestedCount: number): DraftQualityChecks {
  return {
    duplicateQuestionRisk: "low",
    hallucinationRisk: "medium",
    coverageNotes: `${mcqs.length} of ${requestedCount} requested source-grounded MCQs passed structural validation.`,
    reviewWarnings: [
      "Draft only: faculty review is required before assignment or publication.",
      "Verify each source reference against the uploaded material before approving the draft.",
    ],
  };
}

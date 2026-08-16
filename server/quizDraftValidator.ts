import { collectMcqLayoutWarnings, diagnoseMcqLayout } from "./mcqLayout";
import { validateDistinctQuestionCoverage, type PriorQuestionHistory } from "./generationDiversity";
import type { TextbookCitationCandidate } from "./curriculumScope";

export type TextbookCitation = {
  citationKey: string;
  curriculumSetId: number;
  chapterId: number;
  chapterCode: string | null;
  chapterTitle: string;
  segmentId: number | null;
  segmentLabel: string | null;
  startPage: number | null;
  endPage: number | null;
  textAnchor: string;
};

export type GeneratedMcq = {
  question: string;
  options: { A: string; B: string; C: string; D: string };
  answer: "A" | "B" | "C" | "D";
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
  conceptKey?: string;
  facetKey?: string;
  answerTarget?: string;
  sourceReference?: string;
  learningObjective?: string;
  sourceCitation?: TextbookCitation;
};

export type DraftQualityChecks = {
  duplicateQuestionRisk: "low" | "medium" | "high";
  hallucinationRisk: "low" | "medium" | "high";
  coverageNotes: string;
  layoutWarnings: string[];
  reviewWarnings: string[];
};

function normalise(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").replace(/[^a-z0-9 ]/g, "").trim();
}

export function validateGeneratedMcqs(mcqs: unknown[], expectedCount: number, priorHistory: PriorQuestionHistory[] = [], citationCandidates: TextbookCitationCandidate[] = []) {
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
    if (!question.facetKey?.trim()) issues.push(`Question ${number} has no assessable facet key.`);
    if (!question.answerTarget?.trim()) issues.push(`Question ${number} has no answer target.`);
    if (citationCandidates.length) {
      const citation = question.sourceCitation;
      const matchingCandidate = citation && citationCandidates.find((candidate) => candidate.citationKey === citation.citationKey);
      if (!matchingCandidate) issues.push(`Question ${number} has no approved textbook citation.`);
      if (!citation?.textAnchor?.trim()) issues.push(`Question ${number} has no textbook text anchor.`);
    }

    const layout = diagnoseMcqLayout(question as GeneratedMcq, number);
    layout.warnings.filter((warning) => /unusually long stem|paragraph-like option|multi-sentence option/i.test(warning)).forEach((warning) => issues.push(warning));
  });

  const coverage = validateDistinctQuestionCoverage(mcqs as GeneratedMcq[], priorHistory);
  issues.push(...coverage.issues);

  return { valid: issues.length === 0, issues };
}

export function buildDraftQualityChecks(mcqs: GeneratedMcq[], requestedCount: number): DraftQualityChecks {
  return {
    duplicateQuestionRisk: "low",
    hallucinationRisk: "medium",
    coverageNotes: `${mcqs.length} of ${requestedCount} requested source-grounded MCQs passed structural and concept-facet-answer diversity validation.`,
    layoutWarnings: collectMcqLayoutWarnings(mcqs),
    reviewWarnings: [
      "Draft only: faculty review is required before assignment or publication.",
      "Verify each source reference against the uploaded material before approving the draft.",
      "Verify that every repeated concept uses a different supported facet and answer target, and that no earlier saved-paper task has been reworded.",
      "Review the printable Section A table preview for any wrapped row that exceeds the supplied paper geometry.",
    ],
  };
}

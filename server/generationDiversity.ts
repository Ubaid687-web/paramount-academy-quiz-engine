import { createHash } from "node:crypto";

export type QuestionCoverageRecord = {
  conceptKey?: string;
  question: string;
  sourceReference?: string;
  learningObjective?: string;
};

export type PriorQuestionHistory = QuestionCoverageRecord & {
  assessmentMode?: "mcq" | "short" | "long";
};

function normalise(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenSet(value: string) {
  return new Set(normalise(value).split(" ").filter((token) => token.length > 2));
}

function tokenSimilarity(left: string, right: string) {
  const leftTokens = tokenSet(left);
  const rightTokens = tokenSet(right);
  if (!leftTokens.size || !rightTokens.size) return 0;
  let overlap = 0;
  leftTokens.forEach((token) => {
    if (rightTokens.has(token)) overlap += 1;
  });
  return overlap / (leftTokens.size + rightTokens.size - overlap);
}

export function canonicalConceptKey(record: QuestionCoverageRecord) {
  return normalise(record.conceptKey ?? record.sourceReference ?? record.learningObjective ?? "");
}

export function questionCoverageFingerprint(record: QuestionCoverageRecord) {
  return normalise([record.sourceReference, record.learningObjective, record.question].filter(Boolean).join(" | "));
}

function isSemanticCollision(left: QuestionCoverageRecord, right: QuestionCoverageRecord) {
  const leftConcept = canonicalConceptKey(left);
  const rightConcept = canonicalConceptKey(right);
  if (leftConcept && rightConcept && leftConcept === rightConcept) return true;

  const leftReference = normalise(left.sourceReference ?? "");
  const rightReference = normalise(right.sourceReference ?? "");
  if (leftReference && rightReference && leftReference === rightReference) return true;

  const leftObjective = normalise(left.learningObjective ?? "");
  const rightObjective = normalise(right.learningObjective ?? "");
  if (leftObjective && rightObjective && leftObjective === rightObjective) return true;

  const comparableLeft = [left.sourceReference, left.learningObjective, left.question].filter(Boolean).join(" ");
  const comparableRight = [right.sourceReference, right.learningObjective, right.question].filter(Boolean).join(" ");
  return tokenSimilarity(comparableLeft, comparableRight) >= 0.9;
}

export function validateDistinctQuestionCoverage(
  items: QuestionCoverageRecord[],
  priorHistory: PriorQuestionHistory[] = [],
) {
  const issues: string[] = [];

  items.forEach((item, index) => {
    const number = index + 1;
    if (!canonicalConceptKey(item)) {
      issues.push(`Question ${number} has no concept key linked to its source heading or term.`);
      return;
    }

    const earlier = items.slice(0, index).find((candidate) => isSemanticCollision(item, candidate));
    if (earlier) {
      issues.push(`Question ${number} repeats an underlying concept already used in this paper.`);
    }

    const previous = priorHistory.find((candidate) => isSemanticCollision(item, candidate));
    if (previous) {
      issues.push(`Question ${number} repeats a concept or near-duplicate from an earlier saved paper.`);
    }
  });

  return { valid: issues.length === 0, issues };
}

export function buildPriorHistoryExclusion(priorHistory: PriorQuestionHistory[], limit = 32) {
  if (!priorHistory.length) return "No earlier saved-paper history is available for this exact source scope.";
  const entries = priorHistory.slice(0, limit).map((item, index) => {
    const concept = canonicalConceptKey(item) || "unclassified concept";
    return `${index + 1}. conceptKey=${concept}; source=${item.sourceReference ?? "not recorded"}; objective=${item.learningObjective ?? "not recorded"}`;
  });
  return `Previously used concepts for this exact source scope — do not reuse, paraphrase, or test the same underlying idea:\n${entries.join("\n")}`;
}

export function fingerprintGenerationSource(scopeSnapshot: unknown, contentText: string) {
  const stableSource = scopeSnapshot && typeof scopeSnapshot === "object"
    ? JSON.stringify(scopeSnapshot)
    : normalise(contentText);
  return createHash("sha256").update(stableSource).digest("hex");
}

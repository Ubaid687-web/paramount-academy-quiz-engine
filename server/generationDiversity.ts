import { createHash } from "node:crypto";

export type QuestionCoverageRecord = {
  conceptKey?: string;
  facetKey?: string;
  answerTarget?: string;
  question?: string;
  sourceReference?: string;
  learningObjective?: string;
};

export type PriorQuestionHistory = QuestionCoverageRecord & {
  assessmentMode?: "mcq" | "short" | "long";
};

export type OrPairCoverageRecord = QuestionCoverageRecord & {
  orGroup?: number | null;
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
  return normalise(record.conceptKey ?? record.sourceReference ?? "");
}

export function canonicalFacetKey(record: QuestionCoverageRecord) {
  return normalise(record.facetKey ?? record.learningObjective ?? "");
}

export function canonicalAnswerTarget(record: QuestionCoverageRecord) {
  return normalise(record.answerTarget ?? "");
}

export function questionCoverageFingerprint(record: QuestionCoverageRecord) {
  return normalise([
    record.conceptKey,
    record.facetKey,
    record.answerTarget,
    record.question,
  ].filter(Boolean).join(" | "));
}

function isSemanticCollision(left: QuestionCoverageRecord, right: QuestionCoverageRecord) {
  const leftQuestion = normalise(left.question ?? "");
  const rightQuestion = normalise(right.question ?? "");
  if (leftQuestion && leftQuestion === rightQuestion) return true;

  const leftConcept = canonicalConceptKey(left);
  const rightConcept = canonicalConceptKey(right);
  const sameConcept = Boolean(leftConcept && rightConcept && leftConcept === rightConcept);
  const leftFacet = canonicalFacetKey(left);
  const rightFacet = canonicalFacetKey(right);
  const leftAnswer = canonicalAnswerTarget(left);
  const rightAnswer = canonicalAnswerTarget(right);

  if (sameConcept && leftFacet && rightFacet && leftFacet === rightFacet) return true;
  if (sameConcept && leftAnswer && rightAnswer && leftAnswer === rightAnswer) return true;

  // Older saved drafts may lack the new metadata. Only then use a strict wording fallback.
  if (sameConcept && (!left.facetKey || !right.facetKey || !left.answerTarget || !right.answerTarget)) {
    const leftComparable = [left.learningObjective, left.question].filter(Boolean).join(" ");
    const rightComparable = [right.learningObjective, right.question].filter(Boolean).join(" ");
    return tokenSimilarity(leftComparable, rightComparable) >= 0.92;
  }

  return tokenSimilarity(leftQuestion, rightQuestion) >= 0.96;
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
    if (!canonicalFacetKey(item)) {
      issues.push(`Question ${number} has no assessable facet for its source concept.`);
      return;
    }
    if (!canonicalAnswerTarget(item)) {
      issues.push(`Question ${number} has no answer target for duplicate checking.`);
      return;
    }

    const earlier = items.slice(0, index).find((candidate) => isSemanticCollision(item, candidate));
    if (earlier) {
      issues.push(`Question ${number} repeats an answer target, assessable facet, or trivial rewording already used in this paper.`);
    }

    const previous = priorHistory.find((candidate) => isSemanticCollision(item, candidate));
    if (previous) {
      issues.push(`Question ${number} repeats an answer target, assessable facet, or trivial rewording from an earlier saved paper.`);
    }
  });

  return { valid: issues.length === 0, issues };
}

export function validateDistinctOrPairCoverage(
  items: OrPairCoverageRecord[],
  priorHistory: PriorQuestionHistory[] = [],
) {
  const issues: string[] = [];
  const groups = new Map<number, OrPairCoverageRecord[]>();
  items.forEach((item, index) => {
    const group = item.orGroup ?? Math.floor(index / 2) + 1;
    groups.set(group, [...(groups.get(group) ?? []), item]);
  });

  Array.from(groups.entries()).sort(([left], [right]) => left - right).forEach(([groupNumber, group]) => {
    if (group.length !== 2) {
      issues.push(`Numbered OR pair ${groupNumber} must contain exactly two alternatives.`);
      return;
    }
    if (isSemanticCollision(group[0]!, group[1]!)) {
      issues.push(`The alternatives in numbered OR pair ${groupNumber} repeat the same answer target, facet, or wording. Use genuinely different source-supported alternatives.`);
    }
  });

  const distinctItems = validateDistinctQuestionCoverage(items, priorHistory);
  issues.push(...distinctItems.issues);
  return { valid: issues.length === 0, issues };
}

export function buildPriorHistoryExclusion(priorHistory: PriorQuestionHistory[], limit = 32) {
  if (!priorHistory.length) return "No earlier saved-paper history is available for this exact source scope.";
  const entries = priorHistory.slice(0, limit).map((item, index) => {
    const concept = canonicalConceptKey(item) || "unclassified concept";
    const facet = canonicalFacetKey(item) || "unclassified facet";
    const answer = canonicalAnswerTarget(item) || "unclassified answer target";
    return `${index + 1}. conceptKey=${concept}; facetKey=${facet}; answerTarget=${answer}; source=${item.sourceReference ?? "not recorded"}`;
  });
  return `Previously used source targets for this exact scope — do not repeat their concept + facet, answer target, or merely reword the same task. A different supported facet of the same concept remains allowed:\n${entries.join("\n")}`;
}

export function fingerprintGenerationSource(scopeSnapshot: unknown, contentText: string) {
  const stableSource = scopeSnapshot && typeof scopeSnapshot === "object"
    ? JSON.stringify(scopeSnapshot)
    : normalise(contentText);
  return createHash("sha256").update(stableSource).digest("hex");
}

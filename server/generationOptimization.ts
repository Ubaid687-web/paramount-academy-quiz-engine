import { createHash } from "crypto";
import { fingerprintGenerationSource, type PriorQuestionHistory } from "./generationDiversity";

export type GenerationMode = "mcq" | "short" | "long";

export function buildGenerationRequestFingerprint(params: {
  mode: GenerationMode;
  sourceSnapshot?: unknown;
  contentText: string;
  difficulty: string;
  requestedCount: number;
  title?: string;
  priorQuestionHistory?: PriorQuestionHistory[];
  styleAnchorFingerprint?: string;
}) {
  const sourceFingerprint = fingerprintGenerationSource(params.sourceSnapshot, params.contentText);
  const historyFingerprint = createHash("sha256").update(JSON.stringify((params.priorQuestionHistory ?? []).map((item) => ({
    conceptKey: item.conceptKey ?? "",
    facetKey: item.facetKey ?? "",
    answerTarget: item.answerTarget ?? "",
    question: item.question ?? "",
  })))).digest("hex");
  return createHash("sha256").update(JSON.stringify({
    sourceFingerprint,
    historyFingerprint,
    mode: params.mode,
    difficulty: params.difficulty,
    requestedCount: params.requestedCount,
    title: params.title?.trim() ?? "",
    styleAnchorFingerprint: params.styleAnchorFingerprint ?? "",
  })).digest("hex");
}

export function buildBudgetedSourceText(contentText: string, maxChars = 24_000) {
  if (contentText.length <= maxChars) {
    return { text: contentText, sourceChars: contentText.length, sentChars: contentText.length, compacted: false };
  }

  const paragraphs = contentText.split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean);
  const sourceSections = paragraphs.length >= 4 ? paragraphs : contentText.match(/[\s\S]{1,1800}(?:\s|$)/g) ?? [contentText];
  const sectionCount = Math.min(8, sourceSections.length);
  const perSectionLimit = Math.max(800, Math.floor((maxChars - sectionCount * 48) / sectionCount));
  const picked = Array.from({ length: sectionCount }, (_, index) => {
    const sourceIndex = Math.min(sourceSections.length - 1, Math.floor((index * (sourceSections.length - 1)) / Math.max(1, sectionCount - 1)));
    return `SOURCE EXCERPT ${index + 1} OF ${sectionCount}:\n${sourceSections[sourceIndex]!.slice(0, perSectionLimit)}`;
  }).join("\n\n");

  return { text: picked, sourceChars: contentText.length, sentChars: picked.length, compacted: true };
}

export function classifyCircuitOpen(errorMessage: string) {
  const normalized = errorMessage.toLowerCase();
  if (errorMessage.includes("429") || normalized.includes("rate limit") || normalized.includes("too many requests")) {
    return { failureType: "transient_rate_limit", holdMinutes: 2 };
  }
  if (errorMessage.includes("412") || normalized.includes("exhausted") || normalized.includes("billing") || normalized.includes("quota")) {
    return { failureType: "quota_exhaustion", holdMinutes: 30 };
  }
  return null;
}

export function circuitOpenMessage(failureType: string, openUntil: Date) {
  const retryAt = openUntil.toISOString();
  return failureType === "quota_exhaustion"
    ? `Generation is temporarily paused because the connected AI service reported a quota or billing restriction. No new model call was made. Try again after ${retryAt} or after an administrator resolves the service account restriction.`
    : `Generation is temporarily paused because the AI service is rate-limited. No new model call was made. Try again after ${retryAt}.`;
}

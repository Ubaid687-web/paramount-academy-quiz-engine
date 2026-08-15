export type VerifiedPaperPatternGuidance = {
  sourceId?: number;
  sourceKind: "model_paper" | "past_paper";
  academicYear: string | null;
  mcqCount?: number | null;
  mcqMarksEach?: number | null;
  shortOrPairCount?: number | null;
  shortMarksEach?: number | null;
  longOrPairCount?: number | null;
  longMarksEach?: number | null;
  totalMarks?: number | null;
  durationMinutes?: number | null;
  orRule?: string | null;
};

const label = (source: VerifiedPaperPatternGuidance) => `${source.sourceKind.replace("_", " ")}${source.academicYear ? ` ${source.academicYear}` : ""}`;

function singleVerifiedValue(values: Array<number | null | undefined>) {
  const unique = Array.from(new Set(values.filter((value): value is number => typeof value === "number")));
  return unique.length === 1 ? unique[0] : null;
}

export function getVerifiedMarkRule(paperType: "short" | "long", sources: VerifiedPaperPatternGuidance[] | undefined) {
  const field = paperType === "short" ? "shortMarksEach" : "longMarksEach";
  return singleVerifiedValue((sources ?? []).map((source) => source[field]));
}

export function buildVerifiedPaperPatternSummary(sources: VerifiedPaperPatternGuidance[] | undefined) {
  if (!sources?.length) return "No active reviewed paper-profile record is attached; do not claim a board-paper structure beyond the draft contract.";

  const sections: string[] = [`Reviewed active format records: ${sources.map(label).join(", ")}.`];
  const mcqCount = singleVerifiedValue(sources.map((source) => source.mcqCount));
  const mcqMarks = singleVerifiedValue(sources.map((source) => source.mcqMarksEach));
  const shortCount = singleVerifiedValue(sources.map((source) => source.shortOrPairCount));
  const shortMarks = getVerifiedMarkRule("short", sources);
  const longCount = singleVerifiedValue(sources.map((source) => source.longOrPairCount));
  const longMarks = getVerifiedMarkRule("long", sources);
  const orSources = sources.filter((source) => (source.shortOrPairCount ?? 0) > 0 && Boolean(source.orRule));

  if (mcqCount !== null && mcqMarks !== null) sections.push(`Section A evidence: ${mcqCount} MCQs of ${mcqMarks} mark each in the reviewed records.`);
  if (shortCount !== null && shortMarks !== null) sections.push(`Section B evidence: ${shortCount} brief parts of ${shortMarks} marks each in the reviewed records.`);
  if (longCount !== null && longMarks !== null) sections.push(`Section C evidence: ${longCount} long-question slots of ${longMarks} marks each in the reviewed records.`);
  if (orSources.length) sections.push(`OR alternatives are verified for Section B and Section C in: ${orSources.map(label).join(", ")}.`);
  else sections.push("No OR rule is imposed unless a reviewed active profile explicitly verifies it.");

  return sections.join(" ");
}

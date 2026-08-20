import { createHash } from "node:crypto";
import type { StyleAnchorQuestion } from "./db";

export type ReviewedPaperPatternGuidance = {
  sourceKind: "model_paper" | "past_paper";
  academicYear: string | null;
  sectionAInstruction?: string | null;
  sectionBInstruction?: string | null;
  sectionCInstruction?: string | null;
  orRule?: string | null;
  profileEvidenceNotes?: string | null;
};

export type SharedStyleAnchor = {
  instruction: string;
  fingerprint: string;
  approvedExampleCount: number;
};

function compact(value: string | null | undefined, maximum = 420) {
  return (value ?? "").replace(/\s+/g, " ").trim().slice(0, maximum);
}

function buildProgrammeCalibration(params: { board: string; grade: string; subject: string }) {
  const isGrade10ComputerScience = params.board.trim().toLowerCase() === "fbise"
    && params.grade.trim() === "10"
    && ["computer_science", "computer science"].includes(params.subject.trim().toLowerCase());

  if (!isGrade10ComputerScience) return "";

  return `\n\nGRADE 10 COMPUTER SCIENCE CALIBRATION — STYLE AND COVERAGE ONLY
The reviewed Computer Science model, 2024, and 2025 papers support a compact Section A register: one direct focus, usually a natural Which/What/Why/How form, and four short parallel options. Use direct identification, purpose, classification, comparison, code/output or logic trace, conversion, or one familiar application only when the selected textbook scope supports that form.

For a multi-unit scope, first spread items across the selected units. For one unit, spread items across distinct source concepts or facets within that unit. Do not let a topic that appeared in a past paper select the scope, become a prediction for 2027, or displace another selected-textbook concept.

Use code fragments, Boolean/logic work, HTML, conversion, calculations, or trace questions only when that exact selected textbook scope teaches them. For data, AI, digital-impact, literacy, or entrepreneurship material, keep the same concise direct register; do not add news, current affairs, or external examples. Never copy a past-paper stem, task, code sample, or answer.`;
}

/**
 * Builds a provider-neutral, per-request style anchor. It contains formatting evidence only;
 * it never supplies textbook facts or replaces generation-specific source instructions.
 */
export function buildSharedStyleAnchor(params: {
  board: string;
  grade: string;
  subject: string;
  paperPatternGuidance: ReviewedPaperPatternGuidance[];
  approvedExamples: StyleAnchorQuestion[];
}): SharedStyleAnchor {
  const reviewedProfiles = params.paperPatternGuidance.slice(0, 6);
  const profiles = reviewedProfiles.map((profile) => {
    const structure = [profile.sectionAInstruction, profile.sectionBInstruction, profile.sectionCInstruction, profile.orRule, profile.profileEvidenceNotes]
      .map((value) => compact(value, 360)).filter(Boolean).join(" ");
    return `- ${profile.sourceKind.replace("_", " ")}${profile.academicYear ? ` ${profile.academicYear}` : ""}: ${structure || "Reviewed style profile available."}`;
  });
  const examples = params.approvedExamples.slice(0, 4).map((example, index) =>
    `${index + 1}. Stem: ${compact(example.questionText, 240)}\n   Options: A. ${compact(example.optionA, 90)} | B. ${compact(example.optionB, 90)} | C. ${compact(example.optionC, 90)} | D. ${compact(example.optionD, 90)}`,
  );
  const instruction = `\n\nSHARED FBISE STYLE ANCHOR — FORMAT ONLY\nProgramme: ${params.board}, Grade ${params.grade}, ${params.subject}.\nUse this anchor for compact wording, command register, marks presentation, option form, and OR-pair structure only. It is not factual evidence. The selected textbook remains the sole authority for every answer. Never copy or paraphrase an example, and never infer content, facts, answers, or syllabus coverage from a past paper or style example.\n\nREVIEWED PAPER-PATTERN RULES:\n${profiles.length ? profiles.join("\n") : "- No reviewed paper-pattern profile is available. Use the base FBISE direct-wording rules only."}${buildProgrammeCalibration(params)}\n\nPORTAL ADMIN-APPROVED STYLE EXAMPLES (OPTIONAL; STYLE ONLY):\n${examples.length ? examples.join("\n") : "- No approved examples yet. Proceed using the reviewed structure rules above; examples are not required."}\n`;
  return {
    instruction,
    fingerprint: createHash("sha256").update(JSON.stringify({ board: params.board, grade: params.grade, subject: params.subject, profiles: reviewedProfiles, examples: params.approvedExamples.slice(0, 4).map((example) => example.questionId) })).digest("hex"),
    approvedExampleCount: examples.length,
  };
}

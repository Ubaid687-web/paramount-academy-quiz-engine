import { mkdir, writeFile } from "node:fs/promises";
import mysql from "mysql2/promise";

const OUTPUT_DIR = "/home/ubuntu/ai-quiz-platform/analysis-output-2027-preparation";
const MODEL = "gpt-5-mini";
const normalize = (value) => String(value ?? "")
  .toLowerCase()
  .replace(/\s+/g, " ")
  .replace(/[^a-z0-9+\-./ ]/g, "")
  .trim();

const schema = {
  name: "chronological_paper_observations",
  strict: true,
  schema: {
    type: "object",
    properties: {
      extractionConfidence: { type: "string", enum: ["high", "medium", "low"] },
      observations: {
        type: "array",
        maxItems: 10,
        items: {
          type: "object",
          properties: {
            section: { type: "string", enum: ["A", "B", "C", "unknown"] },
            commandPhrase: { type: "string" },
            paperQuote: { type: "string" },
            taskForm: { type: "string", enum: ["direct_term", "definition_or_purpose", "comparison", "process_or_steps", "calculation_or_conversion", "code_or_trace", "scenario_or_application", "diagram_or_representation", "other"] },
            conceptPhrase: { type: "string" },
            cognitiveDemand: { type: "string", enum: ["knowledge", "understanding", "application"] },
          },
          required: ["section", "commandPhrase", "paperQuote", "taskForm", "conceptPhrase", "cognitiveDemand"],
          additionalProperties: false,
        },
      },
      limitations: { type: "array", items: { type: "string" }, maxItems: 4 },
    },
    required: ["extractionConfidence", "observations", "limitations"],
    additionalProperties: false,
  },
};

async function analyzePaper(paper) {
  const text = String(paper.extractedText ?? "");
  const response = await fetch(`${process.env.BUILT_IN_FORGE_API_URL.replace(/\/$/, "")}/v1/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.BUILT_IN_FORGE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_completion_tokens: 2200,
      messages: [
        {
          role: "system",
          content: "You are a careful examination-source analyst. Use only the supplied paper transcript. Do not infer missing wording, do not predict future papers, do not give answers, and do not treat a paper as factual authority. Record only observations with a short literal paperQuote copied from the transcript. If OCR is unclear, reduce confidence and explain the limitation rather than filling gaps.",
        },
        {
          role: "user",
          content: `Analyse this user-supplied Grade 10 Computer Science paper as one point in a chronology. It is ${paper.sourceKind} ${paper.academicYear}, ${paper.variantLabel ?? "single supplied record"}, file ${paper.originalFileName}. Extract at most ten concise observations spanning available sections A/B/C. Each observation must describe a literal command or task form and give a literal paperQuote. Use conceptPhrase only when the concept words themselves occur in the quote or adjacent prompt text.\n\nREVIEWED STRUCTURE NOTE (format evidence only):\n${paper.profileEvidenceNotes ?? "None"}\n\nPAPER TRANSCRIPT:\n${text.slice(0, 26000)}`,
        },
      ],
      response_format: { type: "json_schema", json_schema: schema },
    }),
  });
  if (!response.ok) throw new Error(`Model analysis failed for source ${paper.id}: ${response.status} ${await response.text()}`);
  const body = await response.json();
  const content = body.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new Error(`No structured analysis returned for source ${paper.id}.`);
  return JSON.parse(content);
}

await mkdir(OUTPUT_DIR, { recursive: true });
const connection = await mysql.createConnection(process.env.DATABASE_URL);
const [papers] = await connection.query(`
  SELECT s.id, s.academicYear, s.sourceKind, s.originalFileName, s.status, s.extractedText,
    p.profileEvidenceNotes, p.sectionAInstruction, p.sectionBInstruction, p.sectionCInstruction,
    p.mcqCount, p.shortOrPairCount, p.shortMarksEach, p.longOrPairCount, p.longMarksEach, p.totalMarks
  FROM assessmentPatternSources s
  LEFT JOIN assessmentPatternProfiles p ON p.patternSourceId = s.id
  WHERE s.board = 'FBISE' AND s.grade = '10' AND s.subject = 'computer_science'
    AND s.extractionStatus = 'extracted' AND p.reviewStatus = 'reviewed'
  ORDER BY CASE s.academicYear WHEN '2022-2023' THEN 2023 ELSE CAST(s.academicYear AS UNSIGNED) END, s.id
`);
const [chapters] = await connection.query(`
  SELECT cc.sequence, cc.code, cc.title, cc.contentText
  FROM curriculumSets cs
  JOIN curriculumChapters cc ON cc.curriculumSetId = cs.id
  WHERE cs.board = 'FBISE' AND cs.grade = '10' AND cs.subject = 'computer_science'
    AND cs.status = 'active' AND cc.isActive = 1
  ORDER BY cc.sequence
`);
await connection.end();

const textbookText = chapters.map((chapter) => chapter.contentText).join("\n");
const chronologicalPapers = papers.flatMap((paper) => {
  const pages = String(paper.extractedText ?? "").split(/(?=--- SOURCE PDF PAGE \d+ ---)/g).filter(Boolean);
  const shouldSplitIntoVariants = paper.sourceKind === "past_paper" && pages.length >= 6 && pages.length % 3 === 0;
  if (!shouldSplitIntoVariants) return [{ ...paper, corpusId: String(paper.id), variantLabel: "single supplied record" }];
  const variants = [];
  for (let start = 0; start < pages.length; start += 3) {
    const end = start + 3;
    variants.push({
      ...paper,
      corpusId: `${paper.id}-variant-${start / 3 + 1}`,
      variantLabel: `supplied PDF pages ${start + 1}-${end} (variant label not stated in the source)`,
      extractedText: pages.slice(start, end).join("\n"),
    });
  }
  return variants;
});
const chronology = [];
for (const paper of chronologicalPapers) {
  const analysis = await analyzePaper(paper);
  const paperText = normalize(paper.extractedText);
  const verifiedObservations = analysis.observations
    .filter((observation) => normalize(observation.paperQuote).length >= 8 && paperText.includes(normalize(observation.paperQuote)))
    .map((observation) => ({
      ...observation,
      textbookTermVerified: normalize(observation.conceptPhrase).length >= 3 && normalize(textbookText).includes(normalize(observation.conceptPhrase)),
    }));
  chronology.push({
    corpusId: paper.corpusId,
    sourceId: paper.id,
    academicYear: paper.academicYear,
    sourceKind: paper.sourceKind,
    originalFileName: paper.originalFileName,
    variantLabel: paper.variantLabel,
    status: paper.status,
    reviewedStructure: {
      mcqCount: paper.mcqCount,
      shortOrPairCount: paper.shortOrPairCount,
      shortMarksEach: paper.shortMarksEach,
      longOrPairCount: paper.longOrPairCount,
      longMarksEach: paper.longMarksEach,
      totalMarks: paper.totalMarks,
      sectionAInstruction: paper.sectionAInstruction,
      sectionBInstruction: paper.sectionBInstruction,
      sectionCInstruction: paper.sectionCInstruction,
    },
    extractionConfidence: analysis.extractionConfidence,
    limitations: analysis.limitations,
    observations: verifiedObservations,
    rejectedObservationCount: analysis.observations.length - verifiedObservations.length,
  });
}

const confirmedTextbookObservations = chronology.flatMap((paper) => paper.observations
  .filter((observation) => observation.textbookTermVerified)
  .map((observation) => ({ corpusId: paper.corpusId, sourceId: paper.sourceId, academicYear: paper.academicYear, variantLabel: paper.variantLabel, ...observation })));
const report = {
  governance: {
    textbookAuthority: "Only the active user-supplied Grade 10 Computer Science textbook may supply factual answer content.",
    paperRole: "Supplied model and annual papers provide chronological evidence of format, command wording, task form, and cognitive demand only.",
    predictionBoundary: "This analysis identifies preparation priorities, not future-paper probabilities or repeat predictions.",
  },
  activeTextbook: chapters.map((chapter) => ({ sequence: chapter.sequence, code: chapter.code, title: chapter.title })),
  chronology,
  confirmedTextbookObservations,
};

await writeFile(`${OUTPUT_DIR}/computer-science-chronology.json`, JSON.stringify(report, null, 2));
const rows = chronology.map((paper) => `| ${paper.academicYear} | ${paper.variantLabel} | ${paper.originalFileName} | ${paper.reviewedStructure.mcqCount ?? "—"} | ${paper.reviewedStructure.shortOrPairCount ?? "—"} × ${paper.reviewedStructure.shortMarksEach ?? "—"} | ${paper.reviewedStructure.longOrPairCount ?? "—"} × ${paper.reviewedStructure.longMarksEach ?? "—"} | ${paper.extractionConfidence} | ${paper.observations.length} |`).join("\n");
const evidenceRows = confirmedTextbookObservations.map((item) => `| ${item.academicYear} | ${item.variantLabel} | ${item.section} | ${item.taskForm} | ${item.commandPhrase} | ${item.conceptPhrase} | ${item.paperQuote.replace(/\|/g, "\\|")} |`).join("\n");
await writeFile(`${OUTPUT_DIR}/COMPUTER_SCIENCE_CHRONOLOGY_EVIDENCE.md`, `# Grade 10 Computer Science: Chronological Supplied-Paper Evidence\n\n## Governance\n\nThis file records only observations retained after literal-paper-quote and active-textbook-term verification. It does **not** predict 2027 questions or permit papers to supply factual answers.\n\n## Corpus\n\n| Year | Supplied paper variant | File | MCQs | Section B | Section C | Extraction confidence | Retained observations |\n|---|---|---|---:|---|---|---|---:|\n${rows}\n\n> **Variant boundary:** The 2024 and 2025 PDFs each contain two three-page paper variants. Their source pages do not explicitly label them annual, supply, or improvement in legible extracted text, so this analysis preserves them as neutral supplied variants rather than guessing their official status.\n\n## Literal Paper Forms With Active Textbook-Term Support\n\n| Year | Supplied variant | Section | Task form | Command phrase | Textbook term | Literal supplied-paper quote |\n|---|---|---|---|---|---|---|\n${evidenceRows || "| — | — | — | — | No literal cross-verified observation was retained. | — | — |"}\n\n## Boundary\n\nA past-paper prompt is not a reusable answer or a prediction. A preparation item may use a retained task form only when it is grounded in the active textbook and uses a distinct textbook concept or learning objective.\n`);
console.log(JSON.stringify({ sources: chronology.length, retainedObservations: confirmedTextbookObservations.length, outputDir: OUTPUT_DIR }, null, 2));

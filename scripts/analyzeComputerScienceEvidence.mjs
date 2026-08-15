import { mkdir, writeFile } from "node:fs/promises";
import mysql from "mysql2/promise";
import { invokeLLM } from "../server/_core/llm.ts";

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const [units] = await connection.query(`
  SELECT cc.sequence, cc.code, cc.title, cc.contentText
  FROM curriculumSets cs
  JOIN curriculumChapters cc ON cc.curriculumSetId = cs.id
  WHERE cs.board = 'FBISE' AND cs.grade = '10' AND cs.subject = 'computer_science' AND cs.status = 'active'
  ORDER BY cc.sequence
`);
const [papers] = await connection.query(`
  SELECT sourceKind, academicYear, originalFileName, extractedText
  FROM assessmentPatternSources
  WHERE board = 'FBISE' AND grade = '10' AND subject = 'computer_science'
    AND extractionStatus = 'extracted' AND academicYear IN ('2024', '2025', '2026', '2022-2023')
  ORDER BY sourceKind, academicYear, id
`);
await connection.end();

const paperEvidence = papers.map((paper) => `SOURCE: ${paper.sourceKind} ${paper.academicYear ?? 'undated'} — ${paper.originalFileName}\n${paper.extractedText}`).join("\n\n===== NEXT SUPPLIED PAPER =====\n\n");
const outputDir = "/home/ubuntu/ai-quiz-platform/analysis-output-2026-evening";
await mkdir(outputDir, { recursive: true });

const responseFormat = {
  type: "json_schema",
  json_schema: {
    name: "unit_exam_readiness_map",
    strict: true,
    schema: {
      type: "object",
      properties: {
        unitTitle: { type: "string" },
        curriculumAlignmentSummary: { type: "string" },
        mappings: {
          type: "array",
          items: {
            type: "object",
            properties: {
              textbookConcept: { type: "string" },
              textbookExerciseCue: { type: "string" },
              observedPaperForm: { type: "string" },
              alignment: { type: "string", enum: ["confirmed", "unconfirmed", "outside_active_textbook"] },
              cognitiveDemand: { type: "string", enum: ["knowledge", "understanding", "application"] },
              controlledTransformation: { type: "string" },
              studentPreparationFocus: { type: "string" },
              textbookEvidenceQuote: { type: "string" },
              paperEvidenceQuote: { type: "string" },
              caution: { type: "string" }
            },
            required: ["textbookConcept", "textbookExerciseCue", "observedPaperForm", "alignment", "cognitiveDemand", "controlledTransformation", "studentPreparationFocus", "textbookEvidenceQuote", "paperEvidenceQuote", "caution"],
            additionalProperties: false
          }
        },
        unsupportedPastPaperForms: { type: "array", items: { type: "string" } },
        analysisLimits: { type: "array", items: { type: "string" } }
      },
      required: ["unitTitle", "curriculumAlignmentSummary", "mappings", "unsupportedPastPaperForms", "analysisLimits"],
      additionalProperties: false
    }
  }
};

for (const unit of units) {
  const response = await invokeLLM({
    maxTokens: 4200,
    messages: [
      {
        role: "system",
        content: "You are a cautious FBISE curriculum evidence analyst. Use only the user-supplied Grade 10 Computer Science textbook unit and the supplied Computer Science model/annual paper text below. The textbook is the only factual authority. Papers may identify wording and assessment forms only; they may never supply answer facts. Do not use external knowledge. Do not predict probability or claim repetition. If a paper form lacks direct support in the active textbook unit, mark it unconfirmed or outside_active_textbook. Keep quotes short and literal. Do not manufacture exercises, section numbers, marks, or content."
      },
      {
        role: "user",
        content: `ACTIVE TEXTBOOK UNIT\n${unit.code}: ${unit.title}\n${unit.contentText}\n\n===== SUPPLIED COMPUTER SCIENCE MODEL / ANNUAL PAPER EVIDENCE =====\n${paperEvidence}\n\nMap this one textbook unit to observed paper forms. Focus especially on the controlled step from a direct textbook explanation or exercise into an FBISE-style knowledge, understanding, or application demand. Use \"no direct observed form\" where necessary rather than inventing a match.`
      }
    ],
    response_format: responseFormat
  });
  const content = response.choices?.[0]?.message?.content;
  if (!content) throw new Error(`No analysis returned for ${unit.code}.`);
  const result = JSON.parse(content);
  await writeFile(`${outputDir}/unit-${String(unit.sequence).padStart(2, "0")}.json`, JSON.stringify(result, null, 2));
  console.log(`Mapped ${unit.code}: ${unit.title}`);
}

console.log(`Saved ${units.length} controlled unit maps to ${outputDir}.`);

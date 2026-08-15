import { readdir, readFile, writeFile } from "node:fs/promises";
import mysql from "mysql2/promise";

const outputDir = "/home/ubuntu/ai-quiz-platform/analysis-output-2026-evening";
const normalize = (value) => value
  .toLowerCase()
  .replace(/[`*_#>[\]{}()]/g, " ")
  .replace(/[^a-z0-9+\-./\s]/g, " ")
  .replace(/\s+/g, " ")
  .trim();

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const [papers] = await connection.query(`
  SELECT id, academicYear, originalFileName, extractedText
  FROM assessmentPatternSources
  WHERE board = 'FBISE' AND grade = '10' AND subject = 'computer_science'
    AND extractionStatus = 'extracted' AND academicYear IN ('2024', '2025', '2026', '2022-2023')
`);
const [units] = await connection.query(`
  SELECT cc.sequence, cc.contentText
  FROM curriculumSets cs
  JOIN curriculumChapters cc ON cc.curriculumSetId = cs.id
  WHERE cs.board = 'FBISE' AND cs.grade = '10' AND cs.subject = 'computer_science' AND cs.status = 'active'
`);
await connection.end();
const textbookBySequence = new Map(units.map((unit) => [String(unit.sequence).padStart(2, "0"), normalize(unit.contentText)]));
const mapFiles = (await readdir(outputDir)).filter((name) => /^unit-\d+\.json$/.test(name)).sort();
const results = [];

for (const fileName of mapFiles) {
  const map = JSON.parse(await readFile(`${outputDir}/${fileName}`, "utf8"));
  const unitSequence = fileName.match(/unit-(\d+)\.json/)?.[1];
  const textbookText = textbookBySequence.get(unitSequence) ?? "";
  for (const mapping of map.mappings) {
    const quote = mapping.paperEvidenceQuote?.trim() ?? "";
    const textbookQuote = mapping.textbookEvidenceQuote?.trim() ?? "";
    const normalizedPaperQuote = normalize(quote);
    const matchingPapers = quote.toLowerCase() !== "none" && !quote.toLowerCase().includes("no direct")
      ? papers
        .filter((paper) => normalize(paper.extractedText).includes(normalizedPaperQuote))
        .map((paper) => ({ id: paper.id, academicYear: paper.academicYear, originalFileName: paper.originalFileName }))
      : [];
    const paperVerified = matchingPapers.length > 0;
    const textbookVerified = textbookQuote.toLowerCase() !== "none" && textbookText.includes(normalize(textbookQuote));
    results.push({
      fileName,
      unitTitle: map.unitTitle,
      textbookConcept: mapping.textbookConcept,
      textbookEvidenceQuote: textbookQuote,
      textbookVerified,
      paperEvidenceQuote: quote,
      paperVerified,
      matchingPapers,
      verified: paperVerified && textbookVerified,
    });
  }
}

const verification = {
  total: results.length,
  verified: results.filter((result) => result.verified).length,
  rejected: results.filter((result) => !result.verified),
  results,
};
await writeFile(`${outputDir}/verification.json`, JSON.stringify(verification, null, 2));
console.log(JSON.stringify({ total: verification.total, verified: verification.verified, rejected: verification.rejected.length }, null, 2));

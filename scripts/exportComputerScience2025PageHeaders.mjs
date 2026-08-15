import { writeFile } from "node:fs/promises";
import mysql from "mysql2/promise";

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const [rows] = await connection.query("SELECT originalFileName, extractedText FROM assessmentPatternSources WHERE id = 2");
await connection.end();
const source = rows[0];
if (!source) throw new Error("The retained 2025 Computer Science source was not found.");
const pages = String(source.extractedText ?? "").split(/(?=--- SOURCE PDF PAGE \d+ ---)/g).filter(Boolean);
const output = [
  "# Retained 2025 Computer Science Paper: Page-Header Inventory",
  "",
  `Source file: ${source.originalFileName}`,
  "",
  "This inventory preserves only the first extracted lines from each physical PDF page. It does not label a page as annual, supply, or improvement unless that label is literally present.",
  "",
];
for (const [index, page] of pages.entries()) {
  const lines = page.split("\n").map((line) => line.trim()).filter(Boolean).slice(0, 24);
  output.push(`## Extracted Page ${index + 1}`, "", "```text", lines.join("\n"), "```", "");
}
await writeFile("/home/ubuntu/ai-quiz-platform/analysis-output-2027-preparation/COMPUTER_SCIENCE_2025_PAGE_HEADERS.md", output.join("\n"));
console.log(JSON.stringify({ source: source.originalFileName, pages: pages.length }, null, 2));

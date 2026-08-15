import { readFile } from "node:fs/promises";
import mysql from "mysql2/promise";

const source = {
  storageKey: "paper-patterns/fbise/10/computer_science/4c5adcec-6f39-4c0c-9a8d-4e7a4a10445b.md",
  storageUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663538757281/g2y5mutEzwdHvruUz8MtKx/paper-patterns/fbise/10/computer_science/4c5adcec-6f39-4c0c-9a8d-4e7a4a10445b.md",
  contentHash: "059b969031254172315c420464f1804e0a0de18f328336acda126e263fe35069",
  fileName: "class10_computer_science_2026.md",
};
const extractedText = await readFile("/home/ubuntu/upload/class10_computer_science_2026.md", "utf8");
const connection = await mysql.createConnection(process.env.DATABASE_URL);
const [existing] = await connection.execute(
  "SELECT id FROM assessmentPatternSources WHERE board = ? AND grade = ? AND subject = ? AND contentHash = ? LIMIT 1",
  ["FBISE", "10", "computer_science", source.contentHash],
);

if (existing.length) {
  console.log(JSON.stringify({ sourceId: existing[0].id, created: false }, null, 2));
} else {
  const [result] = await connection.execute(
    `INSERT INTO assessmentPatternSources (
      board, grade, subject, sourceKind, academicYear, storageKey, storageUrl, originalFileName,
      mimeType, contentHash, extractedText, extractionStatus, status, uploadedBy
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      "FBISE", "10", "computer_science", "past_paper", "2026", source.storageKey, source.storageUrl, source.fileName,
      "text/markdown", source.contentHash, extractedText, "extracted", "draft", 1,
    ],
  );
  console.log(JSON.stringify({ sourceId: result.insertId, created: true }, null, 2));
}

await connection.end();

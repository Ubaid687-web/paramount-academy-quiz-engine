import { readFile } from "node:fs/promises";
import mysql from "mysql2/promise";

const source = {
  storageKey: "paper-patterns/fbise/10/chemistry/a0ef9cbb-d73e-4b8e-a424-63a8eb97bb29.md",
  storageUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663538757281/g2y5mutEzwdHvruUz8MtKx/paper-patterns/fbise/10/chemistry/a0ef9cbb-d73e-4b8e-a424-63a8eb97bb29.md",
  contentHash: "c2ddb79f9fd6d1d6d7c79900ed159d4409bcd3d68f97e14d138484ff07e81d6a",
  fileName: "complete_chemistry_exam.md",
};
const extractedText = await readFile("/home/ubuntu/upload/complete_chemistry_exam.md", "utf8");
const connection = await mysql.createConnection(process.env.DATABASE_URL);
const [existing] = await connection.execute(
  "SELECT id FROM assessmentPatternSources WHERE board = ? AND grade = ? AND subject = ? AND contentHash = ? LIMIT 1",
  ["FBISE", "10", "chemistry", source.contentHash],
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
      "FBISE", "10", "chemistry", "past_paper", "2026", source.storageKey, source.storageUrl, source.fileName,
      "text/markdown", source.contentHash, extractedText, "extracted", "draft", 1,
    ],
  );
  console.log(JSON.stringify({ sourceId: result.insertId, created: true }, null, 2));
}

await connection.end();

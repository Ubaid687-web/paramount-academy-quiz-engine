import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import mysql from "mysql2/promise";
import { storagePut } from "../server/storage.ts";

const reconstructedPath = "/home/ubuntu/ai-quiz-platform/sources/class10_computer_science_2026_morning_reconstructed.md";
const sectionBCPath = "/home/ubuntu/upload/computer_science_morning_sections_b_c_2026.pdf";
const [reconstructedBuffer, sectionBCBuffer] = await Promise.all([
  readFile(reconstructedPath),
  readFile(sectionBCPath),
]);
const contentHash = createHash("sha256")
  .update(reconstructedBuffer)
  .update(sectionBCBuffer)
  .digest("hex");

const [reconstructedStored, sectionBCStored] = await Promise.all([
  storagePut(
    `paper-patterns/fbise/10/computer_science/${randomUUID()}-morning-reconstruction.md`,
    reconstructedBuffer,
    "text/markdown",
  ),
  storagePut(
    `paper-patterns/fbise/10/computer_science/${randomUUID()}-morning-sections-bc.pdf`,
    sectionBCBuffer,
    "application/pdf",
  ),
]);

const extractedText = reconstructedBuffer.toString("utf8");
const connection = await mysql.createConnection(process.env.DATABASE_URL);
const [existing] = await connection.execute(
  "SELECT id FROM assessmentPatternSources WHERE board = ? AND grade = ? AND subject = ? AND contentHash = ? LIMIT 1",
  ["FBISE", "10", "computer_science", contentHash],
);

let sourceId;
if (existing.length) {
  sourceId = existing[0].id;
} else {
  const [result] = await connection.execute(
    `INSERT INTO assessmentPatternSources (
      board, grade, subject, sourceKind, academicYear, storageKey, storageUrl, originalFileName,
      mimeType, contentHash, extractedText, extractionStatus, status, uploadedBy
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      "FBISE", "10", "computer_science", "past_paper", "2026",
      reconstructedStored.key, reconstructedStored.url, "class10_computer_science_2026_morning_reconstructed.md",
      "text/markdown", contentHash, extractedText, "extracted", "draft", 1,
    ],
  );
  sourceId = result.insertId;
}

await connection.execute(
  `INSERT INTO assessmentPatternProfiles (
    patternSourceId, sectionAInstruction, sectionBInstruction, sectionCInstruction,
    mcqCount, mcqMarksEach, shortOrPairCount, shortMarksEach, longOrPairCount, longMarksEach,
    totalMarks, durationMinutes, orRule, profileEvidenceNotes, reviewStatus, reviewedBy, reviewedAt
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  ON DUPLICATE KEY UPDATE
    sectionAInstruction = VALUES(sectionAInstruction),
    sectionBInstruction = VALUES(sectionBInstruction),
    sectionCInstruction = VALUES(sectionCInstruction),
    mcqCount = VALUES(mcqCount),
    mcqMarksEach = VALUES(mcqMarksEach),
    shortOrPairCount = VALUES(shortOrPairCount),
    shortMarksEach = VALUES(shortMarksEach),
    longOrPairCount = VALUES(longOrPairCount),
    longMarksEach = VALUES(longMarksEach),
    totalMarks = VALUES(totalMarks),
    durationMinutes = VALUES(durationMinutes),
    orRule = VALUES(orRule),
    profileEvidenceNotes = VALUES(profileEvidenceNotes),
    reviewStatus = VALUES(reviewStatus),
    reviewedBy = VALUES(reviewedBy),
    reviewedAt = CURRENT_TIMESTAMP`,
  [
    sourceId,
    "Fill the relevant bubble against each question according to curriculum.",
    "Section B is visibly structured as 11 brief two-mark parts, each with an OR alternative (11 × 2 = 22).",
    "Section C is visibly structured as four five-mark long questions, each with an OR alternative (4 × 5 = 20).",
    13, 1, 11, 2, 4, 5, 55, 160,
    "Visible OR alternatives in both Section B and Section C.",
    `Morning-shift 1st Annual Examination 2026. Section A is user-supplied in computer_science_section_a.md. Sections B/C are isolated from page 7 of the user-supplied CamScanner PDF; the PBA and non-Computer-Science pages were excluded. The B/C source is stored separately at ${sectionBCStored.url}. This reviewed profile is pattern guidance only and cannot supply factual answer content.`,
    "reviewed", 1,
  ],
);

await connection.end();
console.log(JSON.stringify({
  sourceId,
  contentHash,
  reconstruction: { storageKey: reconstructedStored.key, storageUrl: reconstructedStored.url },
  sectionBC: { storageKey: sectionBCStored.key, storageUrl: sectionBCStored.url },
}, null, 2));

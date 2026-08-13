import { readFile } from "node:fs/promises";
import { and, eq } from "drizzle-orm";
import { assessmentPatternSources } from "../drizzle/schema.ts";
import { getDb } from "../server/db.ts";

const adminUserId = 1;
const papers = [
  {
    academicYear: "2024",
    storageKey: "assessment-patterns/grade-10/computer-science/2024/class-10-computer-science-past-paper-2024.pdf",
    storageUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663538757281/g2y5mutEzwdHvruUz8MtKx/assessment-patterns/grade-10/computer-science/2024/class-10-computer-science-past-paper-2024.pdf",
    originalFileName: "class-10-computer-science-past-paper-2024.pdf",
    transcriptPath: "/home/ubuntu/webdev-static-assets/paramount-assessment-pattern-sources/fbise-grade10-computer-science-2024-past-paper-ocr-transcript.txt",
  },
  {
    academicYear: "2025",
    storageKey: "assessment-patterns/grade-10/computer-science/2025/class10computersciencefbisepastpaper2025.pdf",
    storageUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663538757281/g2y5mutEzwdHvruUz8MtKx/assessment-patterns/grade-10/computer-science/2025/class10computersciencefbisepastpaper2025.pdf",
    originalFileName: "class10computersciencefbisepastpaper2025.pdf",
    transcriptPath: "/home/ubuntu/webdev-static-assets/paramount-assessment-pattern-sources/fbise-grade10-computer-science-2025-past-paper-ocr-transcript.txt",
  },
];

const db = await getDb();
if (!db) throw new Error("Database not available");

const registered = [];
for (const paper of papers) {
  const existing = await db.select().from(assessmentPatternSources).where(and(
    eq(assessmentPatternSources.subject, "computer_science"),
    eq(assessmentPatternSources.originalFileName, paper.originalFileName),
  )).limit(1);
  if (existing[0]) {
    throw new Error(`A paper-pattern source for ${paper.originalFileName} already exists as record ${existing[0].id}.`);
  }

  const extractedText = await readFile(paper.transcriptPath, "utf8");
  const result = await db.insert(assessmentPatternSources).values({
    grade: "10",
    subject: "computer_science",
    sourceKind: "past_paper",
    academicYear: paper.academicYear,
    storageKey: paper.storageKey,
    storageUrl: paper.storageUrl,
    originalFileName: paper.originalFileName,
    mimeType: "application/pdf",
    extractedText,
    extractionStatus: "extracted",
    status: "active",
    uploadedBy: adminUserId,
    activatedAt: new Date(),
  });
  const insertedId = result[0].insertId;
  registered.push({ id: insertedId, academicYear: paper.academicYear, originalFileName: paper.originalFileName });
}

console.log(JSON.stringify(registered, null, 2));

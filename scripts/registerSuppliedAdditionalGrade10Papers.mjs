import { readFile } from "node:fs/promises";
import { and, eq } from "drizzle-orm";
import { assessmentPatternSources } from "../drizzle/schema.ts";
import { getDb } from "../server/db.ts";

const adminUserId = 1;
const cdnBase = "https://d2xsxph8kpxj0f.cloudfront.net/310519663538757281/g2y5mutEzwdHvruUz8MtKx";
const papers = [
  {
    subject: "chemistry",
    sourceKind: "model_paper",
    academicYear: "2022-2023",
    storageKey: "assessment-patterns/grade-10/chemistry/model/class10chemistrymodelquestionpapernewsyllabus.pdf",
    originalFileName: "class10chemistrymodelquestionpapernewsyllabus.pdf",
    transcriptPath: "/home/ubuntu/webdev-static-assets/paramount-assessment-pattern-sources/fbise-grade10-chemistry-model-paper-ocr-transcript.txt",
  },
  {
    subject: "physics",
    sourceKind: "model_paper",
    academicYear: "2022-2023",
    storageKey: "assessment-patterns/grade-10/physics/model/class10physicsmodelquestionpapernewsyllabus.pdf",
    originalFileName: "class10physicsmodelquestionpapernewsyllabus.pdf",
    transcriptPath: "/home/ubuntu/webdev-static-assets/paramount-assessment-pattern-sources/fbise-grade10-physics-model-paper-ocr-transcript.txt",
  },
  {
    subject: "computer_science",
    sourceKind: "model_paper",
    academicYear: "2022-2023",
    storageKey: "assessment-patterns/grade-10/computer-science/model/class10computersciencemodelquestionpapernewsyllabus.pdf",
    originalFileName: "class10computersciencemodelquestionpapernewsyllabus.pdf",
    transcriptPath: "/home/ubuntu/webdev-static-assets/paramount-assessment-pattern-sources/fbise-grade10-computer-science-model-paper-ocr-transcript.txt",
  },
  {
    subject: "chemistry",
    sourceKind: "past_paper",
    academicYear: "2025",
    storageKey: "assessment-patterns/grade-10/chemistry/2025/class10chemistryfbisepastpaper2025.pdf",
    originalFileName: "class10chemistryfbisepastpaper2025(1).pdf",
    transcriptPath: "/home/ubuntu/webdev-static-assets/paramount-assessment-pattern-sources/fbise-grade10-chemistry-2025-past-paper-ocr-transcript.txt",
  },
  {
    subject: "chemistry",
    sourceKind: "past_paper",
    academicYear: "2024",
    storageKey: "assessment-patterns/grade-10/chemistry/2024/class-10-chemistry-fbise-past-paper-2024.pdf",
    originalFileName: "class-10-chemistry-fbise-past-paper-2024(1).pdf",
    transcriptPath: "/home/ubuntu/webdev-static-assets/paramount-assessment-pattern-sources/fbise-grade10-chemistry-2024-past-paper-ocr-transcript.txt",
  },
];

const db = await getDb();
if (!db) throw new Error("Database not available");

const registered = [];
for (const paper of papers) {
  const existing = await db.select().from(assessmentPatternSources).where(and(
    eq(assessmentPatternSources.subject, paper.subject),
    eq(assessmentPatternSources.originalFileName, paper.originalFileName),
  )).limit(1);
  if (existing[0]) {
    throw new Error(`A paper-pattern source for ${paper.originalFileName} already exists as record ${existing[0].id}.`);
  }

  const extractedText = await readFile(paper.transcriptPath, "utf8");
  const result = await db.insert(assessmentPatternSources).values({
    grade: "10",
    subject: paper.subject,
    sourceKind: paper.sourceKind,
    academicYear: paper.academicYear,
    storageKey: paper.storageKey,
    storageUrl: `${cdnBase}/${paper.storageKey}`,
    originalFileName: paper.originalFileName,
    mimeType: "application/pdf",
    extractedText,
    extractionStatus: "extracted",
    status: "active",
    uploadedBy: adminUserId,
    activatedAt: new Date(),
  });
  registered.push({ id: result[0].insertId, subject: paper.subject, sourceKind: paper.sourceKind, academicYear: paper.academicYear, originalFileName: paper.originalFileName });
}

console.log(JSON.stringify(registered, null, 2));

import { writeFile } from "node:fs/promises";
import { listAssessmentPatternSources } from "../server/db.ts";

const subjects = ["chemistry", "physics", "computer_science"];
const sources = [];
for (const subject of subjects) {
  const rows = await listAssessmentPatternSources({ board: "FBISE", grade: "10", subject });
  sources.push(...rows.filter((row) => row.extractionStatus === "extracted"));
}

const output = sources.map((source) => [
  `===== SOURCE ${source.id} | ${source.subject} | ${source.sourceKind} | ${source.academicYear ?? "unknown year"} | ${source.originalFileName} =====`,
  source.extractedText ?? "",
  `===== END SOURCE ${source.id} =====`,
].join("\n")).join("\n\n");
await writeFile("sources/paper_geometry_corpus.txt", output, "utf8");
console.log(JSON.stringify({ sourceCount: sources.length, sourceIds: sources.map((source) => source.id), outputPath: "sources/paper_geometry_corpus.txt", characters: output.length }, null, 2));
for (const source of sources) {
  console.log(`${source.id}\t${source.subject}\t${source.sourceKind}\t${source.academicYear ?? "unknown"}\t${source.originalFileName}`);
}

process.exit(0);

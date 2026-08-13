import { readFile } from "node:fs/promises";
import { storagePut } from "../server/storage.ts";

const paperId = process.argv[2];
const papers = {
  "chemistry-model": {
    transcriptName: "fbise-grade10-chemistry-model-paper-ocr-transcript.txt",
    storageKey: "assessment-patterns/grade-10/chemistry/model/fbise-grade10-chemistry-model-paper-ocr-transcript.txt",
  },
  "physics-model": {
    transcriptName: "fbise-grade10-physics-model-paper-ocr-transcript.txt",
    storageKey: "assessment-patterns/grade-10/physics/model/fbise-grade10-physics-model-paper-ocr-transcript.txt",
  },
  "computer-science-model": {
    transcriptName: "fbise-grade10-computer-science-model-paper-ocr-transcript.txt",
    storageKey: "assessment-patterns/grade-10/computer-science/model/fbise-grade10-computer-science-model-paper-ocr-transcript.txt",
  },
  "chemistry-2025": {
    transcriptName: "fbise-grade10-chemistry-2025-past-paper-ocr-transcript.txt",
    storageKey: "assessment-patterns/grade-10/chemistry/2025/fbise-grade10-chemistry-2025-past-paper-ocr-transcript.txt",
  },
  "chemistry-2024": {
    transcriptName: "fbise-grade10-chemistry-2024-past-paper-ocr-transcript.txt",
    storageKey: "assessment-patterns/grade-10/chemistry/2024/fbise-grade10-chemistry-2024-past-paper-ocr-transcript.txt",
  },
};
const paper = papers[paperId];
if (!paper) throw new Error(`Unsupported paper ID: ${paperId}`);

const transcriptPath = `/home/ubuntu/webdev-static-assets/paramount-assessment-pattern-sources/${paper.transcriptName}`;
const sourceText = await readFile(transcriptPath);
const result = await storagePut(paper.storageKey, sourceText, "text/plain; charset=utf-8");
console.log(JSON.stringify({ paperId, storageKey: paper.storageKey, ...result }, null, 2));

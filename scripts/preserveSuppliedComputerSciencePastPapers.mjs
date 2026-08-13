import { readFile } from "node:fs/promises";
import { storagePut } from "../server/storage.ts";

const papers = [
  {
    year: "2024",
    sourcePath: "/home/ubuntu/upload/class-10-computer-science-past-paper-2024.pdf",
    storageKey: "assessment-patterns/grade-10/computer-science/2024/class-10-computer-science-past-paper-2024.pdf",
  },
  {
    year: "2025",
    sourcePath: "/home/ubuntu/upload/class10computersciencefbisepastpaper2025.pdf",
    storageKey: "assessment-patterns/grade-10/computer-science/2025/class10computersciencefbisepastpaper2025.pdf",
  },
];

const preserved = [];
for (const paper of papers) {
  const data = await readFile(paper.sourcePath);
  const result = await storagePut(paper.storageKey, data, "application/pdf");
  preserved.push({ year: paper.year, sourcePath: paper.sourcePath, ...result });
}

console.log(JSON.stringify(preserved, null, 2));

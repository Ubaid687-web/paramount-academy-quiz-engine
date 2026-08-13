import { readFile } from "node:fs/promises";
import { storagePut } from "../server/storage.ts";

const papers = [
  {
    label: "Chemistry model paper",
    sourcePath: "/home/ubuntu/upload/class10chemistrymodelquestionpapernewsyllabus.pdf",
    storageKey: "assessment-patterns/grade-10/chemistry/model/class10chemistrymodelquestionpapernewsyllabus.pdf",
  },
  {
    label: "Physics model paper",
    sourcePath: "/home/ubuntu/upload/class10physicsmodelquestionpapernewsyllabus.pdf",
    storageKey: "assessment-patterns/grade-10/physics/model/class10physicsmodelquestionpapernewsyllabus.pdf",
  },
  {
    label: "Computer Science model paper",
    sourcePath: "/home/ubuntu/upload/class10computersciencemodelquestionpapernewsyllabus.pdf",
    storageKey: "assessment-patterns/grade-10/computer-science/model/class10computersciencemodelquestionpapernewsyllabus.pdf",
  },
  {
    label: "Chemistry 2025 past paper",
    sourcePath: "/home/ubuntu/upload/class10chemistryfbisepastpaper2025(1).pdf",
    storageKey: "assessment-patterns/grade-10/chemistry/2025/class10chemistryfbisepastpaper2025.pdf",
  },
  {
    label: "Chemistry 2024 past paper",
    sourcePath: "/home/ubuntu/upload/class-10-chemistry-fbise-past-paper-2024(1).pdf",
    storageKey: "assessment-patterns/grade-10/chemistry/2024/class-10-chemistry-fbise-past-paper-2024.pdf",
  },
];

const preserved = [];
for (const paper of papers) {
  const data = await readFile(paper.sourcePath);
  const result = await storagePut(paper.storageKey, data, "application/pdf");
  preserved.push({ label: paper.label, ...result });
}

console.log(JSON.stringify(preserved, null, 2));

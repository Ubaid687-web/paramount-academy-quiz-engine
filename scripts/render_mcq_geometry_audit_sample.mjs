import { writeFile } from "node:fs/promises";
import { renderMcqPaperPdf } from "../server/printablePaperExport.ts";

const samples = [
  {
    question: "A student places dry ice in a sealed container and observes expansion; what is the best explanation?",
    options: {
      A: "It melted into liquid and increased volume.",
      B: "It reacted with oxygen to form compounds.",
      C: "It sublimed and increased pressure.",
      D: "It absorbed heat and burst.",
    },
    answer: "C",
    explanation: "Sublimation produces gas and raises pressure.",
    difficulty: "medium",
    sourceReference: "States of matter",
    learningObjective: "Explain sublimation.",
  },
  {
    question: "Force on a current-carrying conductor is maximum when the angle between the conductor and magnetic field is:",
    options: { A: "90°", B: "45°", C: "0°", D: "180°" },
    answer: "A",
    explanation: "The force is maximum at 90 degrees.",
    difficulty: "easy",
    sourceReference: "Electromagnetism",
    learningObjective: "Relate force to angle.",
  },
  {
    question: "Which technology is used in both robotics and AI personal assistants?",
    options: { A: "Blockchain", B: "Natural Language Processing", C: "3D Printing", D: "Virtual Reality" },
    answer: "B",
    explanation: "Natural language processing supports interaction with assistants.",
    difficulty: "medium",
    sourceReference: "Artificial intelligence",
    learningObjective: "Identify a shared AI technology.",
  },
  ...Array.from({ length: 10 }, (_, index) => ({
    question: `Which textbook term describes process ${index + 1}?`,
    options: { A: "Term A", B: "Term B", C: "Term C", D: "Term D" },
    answer: "A",
    explanation: "The selected term matches the approved source.",
    difficulty: "easy",
    sourceReference: "Approved textbook heading",
    learningObjective: "Identify a source-supported term.",
  })),
];

const pdf = await renderMcqPaperPdf("Grade 10 FBISE MCQ Geometry Audit", samples);
await writeFile("/tmp/mcq-geometry-audit-sample.pdf", pdf);
console.log(JSON.stringify({ questions: samples.length, bytes: pdf.length, path: "/tmp/mcq-geometry-audit-sample.pdf" }));

import { writeFile } from "node:fs/promises";
import { renderPrintablePaperPdf } from "../server/printablePaperExport.ts";

const items = Array.from({ length: 11 }, (_, index) => {
  const part = index + 1;
  return [
    {
      kind: "short",
      question: `Explain the verified concept for practice part ${part} in clear textbook-based wording.`,
      expectedAnswer: "Preview answer.",
      markingGuide: ["Preview marking point."],
      difficulty: "medium",
      sourceReference: `Preview source ${part}`,
      learningObjective: `Preview objective ${part}`,
      cognitiveLevel: "U",
      orGroup: part,
      marks: 2,
    },
    {
      kind: "short",
      question: `State a distinct alternative that assesses the same verified objective for part ${part}.`,
      expectedAnswer: "Preview answer.",
      markingGuide: ["Preview marking point."],
      difficulty: "medium",
      sourceReference: `Preview source ${part}`,
      learningObjective: `Preview objective ${part}`,
      cognitiveLevel: "U",
      orGroup: part,
      marks: 2,
    },
  ];
}).flat();

const pdf = await renderPrintablePaperPdf({
  mode: "short",
  title: "Grade 10 Computer Science · Layout Preview",
  estimatedDurationMinutes: null,
  items,
});

await writeFile("/home/ubuntu/tmp/computer-science-or-row-preview.pdf", pdf);

import { describe, expect, it } from "vitest";
import { PDFParse } from "pdf-parse";
import { classifySolutionKeyPoint, renderMcqPaperPdf, renderPrintablePaperPdf, renderPrintableSolutionPdf } from "./printablePaperExport";

const shortPaper = {
  mode: "short" as const,
  title: "Grade 10 Physics · Motion",
  estimatedDurationMinutes: 30,
  items: [
    {
      kind: "short" as const,
      question: "State the relationship between speed, distance, and time.",
      expectedAnswer: "Speed is distance travelled divided by time taken.",
      markingGuide: ["States speed = distance ÷ time.", "Uses the relationship correctly."],
      solutionPoints: ["Speed is distance travelled divided by time taken.", "Use distance, time, and speed in the correct relationship."],
      sourceExcerpt: "Speed is distance travelled divided by time taken.",
      diagramSpec: { kind: "labelled_flow" as const, title: "Speed relationship", labels: ["Distance", "Time", "Speed"] },
      difficulty: "easy" as const,
      sourceReference: "Motion: speed relationship",
      learningObjective: "Relate speed to distance and time.",
      cognitiveLevel: "K" as const,
      orGroup: 1,
      marks: 3,
    },
    {
      kind: "short" as const,
      question: "A student travels 20 m in 4 s. Calculate the speed.",
      expectedAnswer: "Speed = 20 ÷ 4 = 5 m/s.",
      markingGuide: ["Substitutes distance and time.", "Gives 5 m/s with unit."],
      solutionPoints: ["Speed = distance ÷ time.", "Speed = 20 ÷ 4 = 5 m/s."],
      sourceExcerpt: "Speed is distance travelled divided by time taken.",
      difficulty: "medium" as const,
      sourceReference: "Motion: speed calculation",
      learningObjective: "Calculate speed from distance and time.",
      cognitiveLevel: "A" as const,
      orGroup: 1,
      marks: 3,
    },
  ],
};

describe("printable paper PDF export", () => {
  it("recognises textbook-supported paired comparisons and labelled-sketch prompts without inventing content", () => {
    expect(classifySolutionKeyPoint("Purpose — RAM: stores working data; ROM: stores startup instructions")).toMatchObject({ kind: "comparison", aspect: "Purpose", leftLabel: "RAM", rightLabel: "ROM" });
    expect(classifySolutionKeyPoint("Labelled sketch: block diagram of a computer system")).toEqual({ kind: "diagram", label: "block diagram of a computer system" });
    expect(classifySolutionKeyPoint("States the textbook definition accurately.")).toEqual({ kind: "bullet", text: "States the textbook definition accurately." });
  });

  it("renders a printable paper with an OR alternative as a PDF", async () => {
    const pdf = await renderPrintablePaperPdf(shortPaper);
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(800);
  });

  it("renders a separate PDF solution key", async () => {
    const pdf = await renderPrintableSolutionPdf(shortPaper);
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(800);
  });

  it("removes teacher-marking language while presenting answer points and a source-bound labelled diagram", async () => {
    const pdf = await renderPrintableSolutionPdf(shortPaper);
    const parser = new PDFParse({ data: pdf });
    try {
      const result = await parser.getText();
      expect(result.text).toContain("SOLUTION KEY");
      expect(result.text).toContain("Labelled diagram: Speed relationship");
      expect(result.text).toContain("Key points");
      expect(result.text).not.toContain("MARKING AND LEARNING GUIDE");
      expect(result.text).not.toContain("Marking points");
      expect(result.text).not.toContain("Marking rubric");
      expect(result.text).not.toContain("Cognitive level:");
    } finally {
      await parser.destroy();
    }
  });

  it("keeps every OR pair in one two-column row across a multipage paper", async () => {
    const items = Array.from({ length: 14 }, (_, index) => [
      { ...shortPaper.items[0], question: `Describe textbook concept ${index + 1} and its supported process.`, orGroup: index + 1 },
      { ...shortPaper.items[1], question: `Explain the alternate textbook concept ${index + 1} and its supported application.`, orGroup: index + 1 },
    ]).flat();
    const pdf = await renderPrintablePaperPdf({ ...shortPaper, items });
    const parser = new PDFParse({ data: pdf });
    try {
      const result = await parser.getText();
      expect(result.total).toBeGreaterThan(1);
      expect(result.text).toContain("Q1 · OR");
      expect(result.text).toContain("Q14 · OR");
    } finally {
      await parser.destroy();
    }
  });

  it("renders wrapped stems and answer-shaped options in a fixed Section A table", async () => {
    const pdf = await renderMcqPaperPdf("Grade 10 Chemistry · Section A", [
      {
        question: "A student places dry ice in a sealed container and observes expansion; what is the best explanation?",
        options: {
          A: "It melted into liquid and increased volume.",
          B: "It reacted with oxygen to form compounds.",
          C: "It sublimed and increased pressure.",
          D: "It absorbed heat and burst.",
        },
        answer: "C",
        explanation: "Sublimation produces gas and raises pressure in the sealed container.",
        difficulty: "medium",
        sourceReference: "States of matter: sublimation",
        learningObjective: "Explain sublimation in a sealed container.",
      },
      ...Array.from({ length: 12 }, (_, index) => ({
        question: `Which textbook term describes process ${index + 1}?`,
        options: { A: "Term A", B: "Term B", C: "Term C", D: "Term D" },
        answer: "A" as const,
        explanation: "The selected term matches the approved source.",
        difficulty: "easy" as const,
        sourceReference: "Approved textbook heading",
        learningObjective: "Identify a source-supported term.",
      })),
    ]);
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(1200);
  });
});

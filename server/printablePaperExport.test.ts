import { describe, expect, it } from "vitest";
import { classifySolutionKeyPoint, printableSectionInstruction, printableTotalMarks, renderPrintablePaperPdf, renderPrintableSolutionPdf } from "./printablePaperExport";

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

  it("counts one attemptable alternative per OR pair and uses the verified 11 × 2 Section B instruction only for that exact structure", () => {
    expect(printableTotalMarks(shortPaper)).toBe(3);
    const elevenPairs = Array.from({ length: 11 }, (_, index) => [{ ...shortPaper.items[0], orGroup: index + 1, marks: 2 }]);
    expect(printableSectionInstruction("short", elevenPairs)).toContain("Q.2 Answer any ELEVEN parts briefly. (11 × 2 = 22)");
    expect(printableSectionInstruction("short", [[shortPaper.items[0], shortPaper.items[1]]])).toMatch(/Practice-set draft/);
  });

  it("renders a separate PDF solution key with source-traceable marking guidance", async () => {
    const pdf = await renderPrintableSolutionPdf(shortPaper);
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(800);
  });
});

import { describe, expect, it } from "vitest";
import { renderExport } from "./pdfExportRoute";

const shortPayload = {
  mode: "short" as const,
  title: "Motion revision paper",
  estimatedDurationMinutes: 30,
  items: [
    { kind: "short" as const, question: "State the speed relationship.", expectedAnswer: "Speed is distance divided by time.", markingGuide: ["States the relationship."], difficulty: "easy" as const, sourceReference: "Motion", learningObjective: "Relate speed, distance and time.", cognitiveLevel: "K" as const, orGroup: 1, marks: 3 },
  ],
};

describe("direct PDF export rendering", () => {
  it("prepares a printable paper as an attachment-ready buffer", async () => {
    const rendered = await renderExport({ kind: "paper", payload: shortPayload });
    expect(rendered.fileName).toContain("motion-revision-paper-paper.pdf");
    expect(rendered.pdf.subarray(0, 5).toString()).toBe("%PDF-");
  });

  it("prepares an MCQ solution key as an attachment-ready buffer", async () => {
    const rendered = await renderExport({ kind: "mcq-solution", title: "Physics quiz", mcqs: [{ question: "Which option is correct?", options: { A: "Correct", B: "Other", C: "Third", D: "Fourth" }, answer: "A", explanation: "The source supports A.", sourceReference: "Verified chapter", learningObjective: "Apply the verified concept." }] });
    expect(rendered.fileName).toContain("physics-quiz-mcq-solution-key.pdf");
    expect(rendered.pdf.subarray(0, 5).toString()).toBe("%PDF-");
  });
});

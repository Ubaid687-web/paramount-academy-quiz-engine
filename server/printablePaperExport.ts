import PDFDocument from "pdfkit";
import type { AssessmentDraftItem } from "@shared/assessmentDraftContract";

type PrintableItem = Exclude<AssessmentDraftItem, { kind: "mcq" }>;
type PrintablePayload = {
  mode: "short" | "long";
  title: string;
  estimatedDurationMinutes: number | null;
  items: PrintableItem[];
};

export type SolutionKeyPointPresentation =
  | { kind: "comparison"; aspect: string; leftLabel: string; leftValue: string; rightLabel: string; rightValue: string }
  | { kind: "diagram"; label: string }
  | { kind: "bullet"; text: string };

export function classifySolutionKeyPoint(point: string): SolutionKeyPointPresentation {
  const diagram = point.match(/^(?:diagram|labelled sketch|labeled sketch)\s*:\s*(.+)$/i);
  if (diagram) return { kind: "diagram", label: diagram[1].trim() };
  const comparison = point.match(/^(.+?)\s+—\s+([^:;]+):\s*(.+?);\s*([^:;]+):\s*(.+)$/);
  if (comparison) return { kind: "comparison", aspect: comparison[1].trim(), leftLabel: comparison[2].trim(), leftValue: comparison[3].trim(), rightLabel: comparison[4].trim(), rightValue: comparison[5].trim() };
  return { kind: "bullet", text: point };
}

function printableTotalMarks(payload: PrintablePayload) {
  return payload.items.reduce((total, item) => total + item.marks, 0);
}

function pdfBuffer(build: (doc: PDFKit.PDFDocument) => void) {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 48, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    build(doc);
    doc.end();
  });
}

function pageHeader(doc: PDFKit.PDFDocument, title: string, subtitle: string) {
  doc.fillColor("#123B5D").font("Helvetica-Bold").fontSize(16).text("PARAMOUNT ACADEMY", { align: "center" });
  doc.fillColor("#1F2937").fontSize(13).text(title, { align: "center" });
  doc.font("Helvetica").fontSize(8.5).fillColor("#516174").text(subtitle, { align: "center" });
  doc.moveDown(1);
  const y = doc.y;
  doc.fillColor("#F3F7FA").rect(48, y, 499, 46).fill();
  doc.fillColor("#1F2937").fontSize(8).font("Helvetica-Bold");
  doc.text("Name: ______________________________", 58, y + 12);
  doc.text("Roll No.: __________________", 318, y + 12);
  doc.text("Date: __________________", 58, y + 28);
  doc.text("Teacher signature: ________________", 318, y + 28);
  doc.y = y + 58;
}

function ensureSpace(doc: PDFKit.PDFDocument, required: number) {
  if (doc.y + required > doc.page.height - 60) doc.addPage();
}

function renderSolutionKeyPoint(doc: PDFKit.PDFDocument, index: number, point: string) {
  const presentation = classifySolutionKeyPoint(point);
  if (presentation.kind === "bullet") {
    doc.fillColor("#1F2937").font("Helvetica").text(`${index + 1}. ${presentation.text}`);
    return;
  }
  if (presentation.kind === "diagram") {
    ensureSpace(doc, 52);
    const y = doc.y;
    doc.fillColor("#173F62").font("Helvetica-Bold").fontSize(8.5).text(`Labelled sketch: ${presentation.label}`);
    doc.strokeColor("#9EB6C8").dash(3, { space: 2 }).rect(56, doc.y + 4, 470, 30).stroke().undash();
    doc.fillColor("#607284").font("Helvetica-Oblique").fontSize(7.5).text("Draw and label only the textbook-supported features named above.", 64, doc.y + 15, { width: 450, align: "center" });
    doc.y = Math.max(doc.y, y + 44);
    return;
  }
  ensureSpace(doc, 54);
  const y = doc.y;
  const widths = [104, 183, 183];
  const cells = [presentation.aspect, `${presentation.leftLabel}: ${presentation.leftValue}`, `${presentation.rightLabel}: ${presentation.rightValue}`];
  let x = 56;
  doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#EAF1F6").rect(x, y, 470, 16).fill();
  doc.fillColor("#173F62").text("Comparison", x + 5, y + 4, { width: widths[0] - 10 });
  doc.text(presentation.leftLabel, x + widths[0] + 5, y + 4, { width: widths[1] - 10 });
  doc.text(presentation.rightLabel, x + widths[0] + widths[1] + 5, y + 4, { width: widths[2] - 10 });
  x = 56;
  doc.font("Helvetica").fontSize(7.5).fillColor("#1F2937");
  cells.forEach((cell, cellIndex) => {
    const width = widths[cellIndex];
    doc.strokeColor("#C7D5E0").rect(x, y + 16, width, 28).stroke();
    doc.text(cell, x + 5, y + 21, { width: width - 10, height: 18 });
    x += width;
  });
  doc.y = y + 50;
}

function pairItems(items: PrintableItem[]) {
  const paired = new Map<number, PrintableItem[]>();
  const standalone: PrintableItem[] = [];
  for (const item of items) {
    if (item.orGroup) paired.set(item.orGroup, [...(paired.get(item.orGroup) || []), item]);
    else standalone.push(item);
  }
  return [...Array.from(paired.entries()).sort(([a], [b]) => a - b).map(([, group]) => group), ...standalone.map((item) => [item])];
}

function questionText(doc: PDFKit.PDFDocument, index: number, group: PrintableItem[]) {
  const marks = group[0]?.marks || 0;
  ensureSpace(doc, 74);
  doc.fillColor("#173F62").font("Helvetica-Bold").fontSize(10).text(`Q${index}.`, 52, doc.y, { continued: true });
  doc.fillColor("#111827").font("Helvetica").text(` ${group[0].question}`, 76, doc.y - 11, { width: 415 });
  doc.fillColor("#173F62").font("Helvetica-Bold").fontSize(9).text(`[${marks} marks]`, 485, doc.y - 10, { width: 56, align: "right" });
  if (group[1]) {
    doc.moveDown(0.5);
    doc.fillColor("#8C551A").font("Helvetica-Bold").fontSize(8.5).text("OR", { align: "center" });
    doc.fillColor("#111827").font("Helvetica").fontSize(10).text(group[1].question, 76, doc.y + 2, { width: 415 });
    doc.fillColor("#173F62").font("Helvetica-Bold").fontSize(9).text(`[${marks} marks]`, 485, doc.y - 10, { width: 56, align: "right" });
  }
  doc.moveDown(1.2);
  doc.strokeColor("#D6DFE7").moveTo(52, doc.y).lineTo(543, doc.y).stroke();
  doc.moveDown(0.6);
}

function footer(doc: PDFKit.PDFDocument) {
  const range = doc.bufferedPageRange();
  for (let index = 0; index < range.count; index += 1) {
    doc.switchToPage(index);
    doc.fillColor("#607284").font("Helvetica").fontSize(7.5).text(`Paramount Academy · Draft for Portal Admin review · Page ${index + 1} of ${range.count}`, 48, doc.page.height - 60, { width: 499, align: "center", lineBreak: false });
  }
}

export async function renderPrintablePaperPdf(payload: PrintablePayload) {
  return pdfBuffer((doc) => {
    const paperName = payload.mode === "short" ? "Short Question Paper" : "Long Question Paper";
    pageHeader(doc, payload.title, `${paperName} · Total marks: ${printableTotalMarks(payload)} · Suggested time: ${payload.estimatedDurationMinutes || "—"} minutes`);
    doc.fillColor("#173F62").font("Helvetica-Bold").fontSize(11).text(payload.mode === "short" ? "SECTION B — SHORT QUESTIONS" : "SECTION C — LONG QUESTIONS");
    doc.fillColor("#374151").font("Helvetica").fontSize(9).text("Attempt one alternative from each numbered pair. Write clear, relevant answers. Use a labelled sketch where it improves your explanation.");
    doc.moveDown(1);
    pairItems(payload.items).forEach((group, index) => questionText(doc, index + 1, group));
    footer(doc);
  });
}

export async function renderPrintableSolutionPdf(payload: PrintablePayload) {
  return pdfBuffer((doc) => {
    const paperName = payload.mode === "short" ? "Short Question Solution Key" : "Long Question Solution Key";
    pageHeader(doc, payload.title, `${paperName} · Internal review copy · Total marks: ${printableTotalMarks(payload)}`);
    doc.fillColor("#173F62").font("Helvetica-Bold").fontSize(11).text("MARKING AND LEARNING GUIDE");
    doc.fillColor("#374151").font("Helvetica").fontSize(9).text("Use this source-traceable key for teacher review. Check wording, formulas, and diagrams against the approved source before publication.");
    doc.moveDown(1);
    pairItems(payload.items).forEach((group, index) => {
      group.forEach((item: PrintableItem, alternativeIndex: number) => {
        ensureSpace(doc, 130);
        doc.fillColor("#173F62").font("Helvetica-Bold").fontSize(10).text(`Q${index}${alternativeIndex ? " (OR)" : ""} · ${item.marks} marks`);
        doc.fillColor("#111827").font("Helvetica").fontSize(9.5).text(item.question);
        doc.fillColor("#516174").fontSize(8).text(`Source: ${item.sourceReference} · Objective: ${item.learningObjective} · Cognitive level: ${item.cognitiveLevel}`);
        doc.moveDown(0.35);
        if (item.kind === "short") {
          doc.fillColor("#173F62").font("Helvetica-Bold").fontSize(9).text("Expected answer");
          doc.fillColor("#1F2937").font("Helvetica").text(item.expectedAnswer);
          doc.fillColor("#173F62").font("Helvetica-Bold").text("Marking points");
          item.markingGuide.forEach((point: string, pointIndex: number) => renderSolutionKeyPoint(doc, pointIndex, point));
        } else {
          doc.fillColor("#173F62").font("Helvetica-Bold").fontSize(9).text("Expected key points");
          item.expectedKeyPoints.forEach((point: string, pointIndex: number) => renderSolutionKeyPoint(doc, pointIndex, point));
          doc.fillColor("#173F62").font("Helvetica-Bold").text("Marking rubric");
          item.markingRubric.forEach((criterion: { criterion: string; marks: number }) => doc.fillColor("#1F2937").font("Helvetica").text(`• ${criterion.criterion} — ${criterion.marks} mark${criterion.marks === 1 ? "" : "s"}`));
        }
        doc.moveDown(0.6);
        doc.strokeColor("#D6DFE7").moveTo(52, doc.y).lineTo(543, doc.y).stroke();
        doc.moveDown(0.7);
      });
    });
    footer(doc);
  });
}

type McqExportItem = {
  question: string;
  options: { A: string; B: string; C: string; D: string };
  answer: "A" | "B" | "C" | "D";
  explanation: string;
  sourceReference: string;
  learningObjective: string;
};

const MCQ_TABLE = {
  x: 52,
  numberWidth: 24,
  questionWidth: 140,
  optionWidth: 65,
  bubblesWidth: 67,
};

function mcqWrappedHeight(doc: PDFKit.PDFDocument, text: string, width: number, fontSize: number) {
  doc.font("Helvetica").fontSize(fontSize);
  return doc.heightOfString(text || " ", { width: Math.max(12, width - 8), lineGap: 0 });
}

function mcqRowHeight(doc: PDFKit.PDFDocument, mcq: McqExportItem) {
  const questionHeight = mcqWrappedHeight(doc, mcq.question, MCQ_TABLE.questionWidth, 7.5);
  const optionHeight = (["A", "B", "C", "D"] as const).reduce(
    (height, letter) => Math.max(height, mcqWrappedHeight(doc, mcq.options[letter], MCQ_TABLE.optionWidth, 7.2)),
    0,
  );
  return Math.max(28, Math.ceil(Math.max(questionHeight, optionHeight) + 10));
}

function drawMcqTableHeader(doc: PDFKit.PDFDocument) {
  const y = doc.y;
  const labels = ["Sr.", "Question", "A", "B", "C", "D", "Answer"];
  const widths = [MCQ_TABLE.numberWidth, MCQ_TABLE.questionWidth, MCQ_TABLE.optionWidth, MCQ_TABLE.optionWidth, MCQ_TABLE.optionWidth, MCQ_TABLE.optionWidth, MCQ_TABLE.bubblesWidth];
  let x = MCQ_TABLE.x;
  doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#EAF1F6");
  labels.forEach((label, index) => {
    doc.rect(x, y, widths[index], 22).fillAndStroke("#EAF1F6", "#AFC1CE");
    doc.fillColor("#173F62").text(label, x + 3, y + 7, { width: widths[index] - 6, align: "center" });
    x += widths[index];
  });
  doc.y = y + 22;
}

function drawMcqBubbles(doc: PDFKit.PDFDocument, x: number, y: number, rowHeight: number) {
  const gap = MCQ_TABLE.bubblesWidth / 5;
  doc.strokeColor("#374151").lineWidth(0.8);
  ([0, 1, 2, 3] as const).forEach((index) => doc.circle(x + gap * (index + 1), y + rowHeight / 2, 3.2).stroke());
}

export async function renderMcqPaperPdf(title: string, mcqs: McqExportItem[]) {
  return pdfBuffer((doc) => {
    const subtitle = `MCQ Practice Paper · ${mcqs.length} marks · Draft for Portal Admin review`;
    pageHeader(doc, title, subtitle);
    doc.fillColor("#173F62").font("Helvetica-Bold").fontSize(11).text("SECTION A — MULTIPLE-CHOICE QUESTIONS");
    doc.fillColor("#374151").font("Helvetica").fontSize(8.5).text("Fill one bubble for each question. Choose the best answer.");
    doc.moveDown(0.8);
    drawMcqTableHeader(doc);

    mcqs.forEach((mcq, index) => {
      const rowHeight = mcqRowHeight(doc, mcq);
      if (doc.y + rowHeight > doc.page.height - 58) {
        doc.addPage();
        pageHeader(doc, title, subtitle);
        doc.fillColor("#173F62").font("Helvetica-Bold").fontSize(11).text("SECTION A — MULTIPLE-CHOICE QUESTIONS (CONTINUED)");
        doc.moveDown(0.8);
        drawMcqTableHeader(doc);
      }

      const y = doc.y;
      const widths = [MCQ_TABLE.numberWidth, MCQ_TABLE.questionWidth, MCQ_TABLE.optionWidth, MCQ_TABLE.optionWidth, MCQ_TABLE.optionWidth, MCQ_TABLE.optionWidth, MCQ_TABLE.bubblesWidth];
      let x = MCQ_TABLE.x;
      widths.forEach((width) => {
        doc.rect(x, y, width, rowHeight).fillAndStroke("#FFFFFF", "#AFC1CE");
        x += width;
      });
      doc.fillColor("#173F62").font("Helvetica-Bold").fontSize(7.5).text(`${index + 1}.`, MCQ_TABLE.x + 2, y + 6, { width: MCQ_TABLE.numberWidth - 4, align: "center" });
      doc.fillColor("#111827").font("Helvetica").fontSize(7.5).text(mcq.question, MCQ_TABLE.x + MCQ_TABLE.numberWidth + 4, y + 5, { width: MCQ_TABLE.questionWidth - 8, height: rowHeight - 8, lineGap: 0 });
      (["A", "B", "C", "D"] as const).forEach((letter, optionIndex) => {
        const optionX = MCQ_TABLE.x + MCQ_TABLE.numberWidth + MCQ_TABLE.questionWidth + (optionIndex * MCQ_TABLE.optionWidth);
        doc.fillColor("#374151").font("Helvetica").fontSize(7.2).text(mcq.options[letter], optionX + 4, y + 5, { width: MCQ_TABLE.optionWidth - 8, height: rowHeight - 8, lineGap: 0, align: "center" });
      });
      drawMcqBubbles(doc, MCQ_TABLE.x + MCQ_TABLE.numberWidth + MCQ_TABLE.questionWidth + (MCQ_TABLE.optionWidth * 4), y, rowHeight);
      doc.y = y + rowHeight;
    });
    footer(doc);
  });
}

export async function renderMcqSolutionPdf(title: string, mcqs: McqExportItem[]) {
  return pdfBuffer((doc) => {
    pageHeader(doc, title, `MCQ Solution Key · ${mcqs.length} answers · Internal review copy`);
    doc.fillColor("#173F62").font("Helvetica-Bold").fontSize(11).text("ANSWER KEY AND LEARNING EXPLANATIONS");
    doc.fillColor("#374151").font("Helvetica").fontSize(9).text("Check all answers and explanations against the selected approved source before publication.");
    doc.moveDown(1);
    mcqs.forEach((mcq, index) => {
      ensureSpace(doc, 92);
      doc.fillColor("#173F62").font("Helvetica-Bold").fontSize(10).text(`${index + 1}. Answer: ${mcq.answer}`);
      doc.fillColor("#111827").font("Helvetica").fontSize(9.5).text(mcq.question);
      doc.fillColor("#374151").fontSize(9).text(`Explanation: ${mcq.explanation}`);
      doc.fillColor("#516174").fontSize(8).text(`Source: ${mcq.sourceReference} · Objective: ${mcq.learningObjective}`);
      doc.moveDown(0.6);
      doc.strokeColor("#D6DFE7").moveTo(52, doc.y).lineTo(543, doc.y).stroke();
      doc.moveDown(0.7);
    });
    footer(doc);
  });
}

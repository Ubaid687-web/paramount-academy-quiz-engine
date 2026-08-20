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

type DiagramSpec = {
  kind: "labelled_flow" | "labelled_graph" | "labelled_block";
  title: string;
  labels: string[];
};

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

function cleanLegacyMarkingPoint(point: string) {
  return point
    .replace(/^\s*\d+\s*marks?\s*:\s*/i, "")
    .replace(/^\s*states?\s+(that\s+)?/i, "")
    .trim();
}

function renderDiagramSpec(doc: PDFKit.PDFDocument, spec: DiagramSpec) {
  ensureSpace(doc, 128);
  const labels = spec.labels.slice(0, 6);
  const x = 66;
  const y = doc.y;
  const width = 460;
  const height = 98;
  doc.fillColor("#173F62").font("Helvetica-Bold").fontSize(8.5).text(`Labelled diagram: ${spec.title}`, x, y, { width });
  const diagramY = y + 16;
  doc.strokeColor("#9EB6C8").lineWidth(0.7).rect(x, diagramY, width, height).stroke();

  if (spec.kind === "labelled_graph") {
    const originX = x + 48;
    const originY = diagramY + height - 20;
    doc.strokeColor("#173F62").lineWidth(1).moveTo(originX, diagramY + 12).lineTo(originX, originY).lineTo(x + width - 18, originY).stroke();
    const usableWidth = width - 90;
    const step = labels.length > 1 ? usableWidth / (labels.length - 1) : usableWidth;
    labels.forEach((label, index) => {
      const pointX = originX + step * index;
      const pointY = diagramY + 34 + (index % 2 ? 14 : 0);
      if (index) doc.strokeColor("#2B6C8E").lineWidth(1.2).moveTo(originX + step * (index - 1), diagramY + 34 + ((index - 1) % 2 ? 14 : 0)).lineTo(pointX, pointY).stroke();
      doc.fillColor("#173F62").circle(pointX, pointY, 2).fill();
      doc.fillColor("#374151").font("Helvetica").fontSize(6.8).text(label, pointX - 28, originY + 4, { width: 56, align: "center" });
    });
  } else {
    const columns = Math.min(labels.length, spec.kind === "labelled_flow" ? 4 : 3);
    const rows = Math.ceil(labels.length / columns);
    const cellWidth = (width - 28) / columns;
    const cellHeight = Math.min(30, (height - 22) / rows);
    labels.forEach((label, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const boxX = x + 14 + column * cellWidth;
      const boxY = diagramY + 13 + row * cellHeight;
      doc.fillColor("#F5F9FC").strokeColor("#7FA7BE").rect(boxX, boxY, cellWidth - 12, cellHeight - 7).fillAndStroke();
      doc.fillColor("#173F62").font("Helvetica").fontSize(7).text(label, boxX + 4, boxY + 5, { width: cellWidth - 20, height: cellHeight - 12, align: "center" });
      if (spec.kind === "labelled_flow" && column < columns - 1 && index + 1 < labels.length) {
        const arrowY = boxY + (cellHeight - 7) / 2;
        doc.strokeColor("#2B6C8E").lineWidth(0.8).moveTo(boxX + cellWidth - 11, arrowY).lineTo(boxX + cellWidth - 3, arrowY).stroke();
      }
    });
  }
  doc.y = diagramY + height + 10;
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

const QUESTION_PAIR_LAYOUT = {
  x: 52,
  width: 491,
  gap: 10,
  padding: 8,
  labelHeight: 15,
};

function questionCellHeight(doc: PDFKit.PDFDocument, item: PrintableItem | undefined, width: number) {
  if (!item) return 0;
  doc.font("Helvetica").fontSize(9.25);
  const textHeight = doc.heightOfString(item.question || " ", {
    width: Math.max(24, width - QUESTION_PAIR_LAYOUT.padding * 2),
    lineGap: 1,
  });
  return QUESTION_PAIR_LAYOUT.padding + QUESTION_PAIR_LAYOUT.labelHeight + textHeight + QUESTION_PAIR_LAYOUT.padding;
}

function renderQuestionCell(
  doc: PDFKit.PDFDocument,
  item: PrintableItem | undefined,
  number: number,
  x: number,
  y: number,
  width: number,
  alternative: boolean,
  rowHeight: number,
) {
  doc.strokeColor("#C7D5E0").lineWidth(0.7).rect(x, y, width, rowHeight).stroke();
  if (!item) return;

  const label = alternative ? `Q${number} · OR` : `Q${number}`;
  const labelColor = alternative ? "#8C551A" : "#173F62";
  doc.fillColor(labelColor).font("Helvetica-Bold").fontSize(8.5).text(label, x + QUESTION_PAIR_LAYOUT.padding, y + QUESTION_PAIR_LAYOUT.padding, {
    width: width - QUESTION_PAIR_LAYOUT.padding * 2 - 52,
    lineBreak: false,
  });
  doc.fillColor("#173F62").font("Helvetica-Bold").fontSize(8.25).text(`[${item.marks} marks]`, x + width - 52 - QUESTION_PAIR_LAYOUT.padding, y + QUESTION_PAIR_LAYOUT.padding, {
    width: 52,
    align: "right",
    lineBreak: false,
  });
  doc.fillColor("#111827").font("Helvetica").fontSize(9.25).text(item.question, x + QUESTION_PAIR_LAYOUT.padding, y + QUESTION_PAIR_LAYOUT.padding + QUESTION_PAIR_LAYOUT.labelHeight, {
    width: width - QUESTION_PAIR_LAYOUT.padding * 2,
    lineGap: 1,
  });
}

function questionText(doc: PDFKit.PDFDocument, index: number, group: PrintableItem[]) {
  const left = group[0];
  const right = group[1];
  const columnWidth = (QUESTION_PAIR_LAYOUT.width - QUESTION_PAIR_LAYOUT.gap) / 2;
  const rightX = QUESTION_PAIR_LAYOUT.x + columnWidth + QUESTION_PAIR_LAYOUT.gap;
  const rowHeight = Math.max(
    34,
    questionCellHeight(doc, left, columnWidth),
    questionCellHeight(doc, right, columnWidth),
  );

  ensureSpace(doc, rowHeight + 12);
  const y = doc.y;
  renderQuestionCell(doc, left, index, QUESTION_PAIR_LAYOUT.x, y, columnWidth, false, rowHeight);
  renderQuestionCell(doc, right, index, rightX, y, columnWidth, true, rowHeight);
  doc.strokeColor("#9EB6C8").lineWidth(0.8).moveTo(QUESTION_PAIR_LAYOUT.x + columnWidth + QUESTION_PAIR_LAYOUT.gap / 2, y).lineTo(QUESTION_PAIR_LAYOUT.x + columnWidth + QUESTION_PAIR_LAYOUT.gap / 2, y + rowHeight).stroke();
  doc.y = y + rowHeight + 10;
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
    pageHeader(doc, payload.title, `${paperName} · Textbook-grounded answer set`);
    doc.fillColor("#173F62").font("Helvetica-Bold").fontSize(11).text("SOLUTION KEY");
    doc.fillColor("#374151").font("Helvetica").fontSize(9).text("Use these concise answers to revise the selected textbook concepts. Diagrams and comparison tables appear only where they support the answer.");
    doc.moveDown(1);
    pairItems(payload.items).forEach((group, index) => {
      group.forEach((item: PrintableItem, alternativeIndex: number) => {
        ensureSpace(doc, 130);
        doc.fillColor("#173F62").font("Helvetica-Bold").fontSize(10).text(`Q${index}${alternativeIndex ? " (OR)" : ""}`);
        doc.fillColor("#111827").font("Helvetica").fontSize(9.5).text(item.question);
        doc.moveDown(0.35);
        if (item.kind === "short") {
          const textbookAnswer = /\b(definition|law|statement)\b/i.test(item.facetKey ?? "") && item.sourceExcerpt
            ? item.sourceExcerpt
            : item.expectedAnswer;
          doc.fillColor("#173F62").font("Helvetica-Bold").fontSize(9).text("Answer");
          doc.fillColor("#1F2937").font("Helvetica").text(textbookAnswer);
          const solutionPoints = item.solutionPoints?.length ? item.solutionPoints : item.markingGuide.map(cleanLegacyMarkingPoint);
          doc.fillColor("#173F62").font("Helvetica-Bold").text("Key points");
          solutionPoints.forEach((point: string, pointIndex: number) => renderSolutionKeyPoint(doc, pointIndex, point));
        } else {
          doc.fillColor("#173F62").font("Helvetica-Bold").fontSize(9).text("Answer outline");
          const solutionPoints = item.solutionPoints?.length ? item.solutionPoints : item.expectedKeyPoints;
          solutionPoints.forEach((point: string, pointIndex: number) => renderSolutionKeyPoint(doc, pointIndex, point));
        }
        if (item.diagramSpec) renderDiagramSpec(doc, item.diagramSpec);
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

import PDFDocument from "pdfkit";
import type { AssessmentDraftItem } from "@shared/assessmentDraftContract";

type PrintableItem = Exclude<AssessmentDraftItem, { kind: "mcq" }>;
type PrintablePayload = {
  mode: "short" | "long";
  title: string;
  estimatedDurationMinutes: number | null;
  items: PrintableItem[];
};

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
    doc.fillColor("#607284").font("Helvetica").fontSize(7.5).text(`Paramount Academy · Draft for Portal Admin review · Page ${index + 1} of ${range.count}`, 48, doc.page.height - 34, { width: 499, align: "center" });
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
          item.markingGuide.forEach((point: string, pointIndex: number) => doc.fillColor("#1F2937").font("Helvetica").text(`${pointIndex + 1}. ${point}`));
        } else {
          doc.fillColor("#173F62").font("Helvetica-Bold").fontSize(9).text("Expected key points");
          item.expectedKeyPoints.forEach((point: string, pointIndex: number) => doc.fillColor("#1F2937").font("Helvetica").text(`${pointIndex + 1}. ${point}`));
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

export async function renderMcqPaperPdf(title: string, mcqs: McqExportItem[]) {
  return pdfBuffer((doc) => {
    pageHeader(doc, title, `MCQ Practice Paper · ${mcqs.length} marks · Draft for Portal Admin review`);
    doc.fillColor("#173F62").font("Helvetica-Bold").fontSize(11).text("SECTION A — MULTIPLE-CHOICE QUESTIONS");
    doc.fillColor("#374151").font("Helvetica").fontSize(9).text("Choose the best answer for each question. Mark only one option: A, B, C, or D.");
    doc.moveDown(1);
    mcqs.forEach((mcq, index) => {
      ensureSpace(doc, 112);
      doc.fillColor("#173F62").font("Helvetica-Bold").fontSize(10).text(`${index + 1}.`, 52, doc.y, { continued: true });
      doc.fillColor("#111827").font("Helvetica").text(` ${mcq.question}`, 76, doc.y - 11, { width: 458 });
      doc.moveDown(0.35);
      (["A", "B", "C", "D"] as const).forEach((letter) => doc.fillColor("#374151").fontSize(9).text(`○ ${letter}. ${mcq.options[letter]}`, 78));
      doc.moveDown(0.45);
      doc.strokeColor("#D6DFE7").moveTo(52, doc.y).lineTo(543, doc.y).stroke();
      doc.moveDown(0.55);
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

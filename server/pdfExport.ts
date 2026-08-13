import PDFDocument from "pdfkit";

export interface QuizExportItem {
  questionNumber: number;
  questionText: string;
  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
  correctAnswer?: string;
  sourceReference?: string;
  learningObjective?: string;
  explanation?: string;
  comparisonTable?: { headers: string[]; rows: string[][] };
  sketchDescription?: string;
}

export interface QuizExportData {
  title: string;
  subject: string;
  grade: string;
  instructions?: string;
  totalQuestions: number;
  items: QuizExportItem[];
}

export function generateQuizPdfBuffer(data: QuizExportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 40 });
      const buffers: Buffer[] = [];

      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));

      // Header
      doc.fontSize(18).fillColor("#1e3a8a").text("PARAMOUNT ACADEMY", { align: "center" });
      doc.fontSize(11).fillColor("#475569").text(`Grade ${data.grade} · ${data.subject.toUpperCase()} · FBISE FEDERAL BOARD ASSESSMENT`, { align: "center" });
      doc.moveDown(0.5);

      doc.fontSize(14).fillColor("#0f172a").text(data.title, { align: "center" });
      doc.fontSize(10).fillColor("#64748b").text(`Total Questions: ${data.totalQuestions}   |   Time Allowed: As per Board Pattern`, { align: "center" });
      doc.moveTo(40, doc.y + 10).lineTo(555, doc.y + 10).strokeColor("#cbd5e1").lineWidth(1).stroke();
      doc.moveDown(1);

      if (data.instructions) {
        doc.fontSize(10).fillColor("#334155").text(`Instructions: ${data.instructions}`, { align: "left" });
        doc.moveDown(0.8);
      }

      // Questions
      data.items.forEach((item, index) => {
        if (doc.y > 700) {
          doc.addPage();
        }

        doc.fontSize(11).fillColor("#0f172a").text(`Q${index + 1}. ${item.questionText}`, { continued: false });
        doc.moveDown(0.3);

        if (item.optionA && item.optionB && item.optionC && item.optionD) {
          doc.fontSize(10).fillColor("#334155");
          doc.text(`   A)  ${item.optionA}`);
          doc.text(`   B)  ${item.optionB}`);
          doc.text(`   C)  ${item.optionC}`);
          doc.text(`   D)  ${item.optionD}`);
          doc.moveDown(0.4);
        }

        if (item.sourceReference) {
          doc.fontSize(8).fillColor("#64748b").text(`[Source: ${item.sourceReference}]`, { indent: 15 });
        }
        doc.moveDown(0.8);
      });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

export function generateSolutionPdfBuffer(data: QuizExportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 40 });
      const buffers: Buffer[] = [];

      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));

      // Header
      doc.fontSize(18).fillColor("#047857").text("PARAMOUNT ACADEMY", { align: "center" });
      doc.fontSize(11).fillColor("#475569").text(`Grade ${data.grade} · ${data.subject.toUpperCase()} · OFFICIAL ANSWER KEY & SOLUTIONS`, { align: "center" });
      doc.moveDown(0.5);

      doc.fontSize(14).fillColor("#0f172a").text(`${data.title} — Solution Set`, { align: "center" });
      doc.fontSize(10).fillColor("#64748b").text("Source-Grounded Explanations, Conceptual Context & Structured Solutions", { align: "center" });
      doc.moveTo(40, doc.y + 10).lineTo(555, doc.y + 10).strokeColor("#cbd5e1").lineWidth(1).stroke();
      doc.moveDown(1);

      // Solutions
      data.items.forEach((item, index) => {
        if (doc.y > 680) {
          doc.addPage();
        }

        doc.fontSize(11).fillColor("#0f172a").font("Helvetica-Bold").text(`Q${index + 1}. ${item.questionText}`);
        doc.font("Helvetica").fontSize(10).fillColor("#047857").text(`Correct Answer: ${item.correctAnswer || "A"}`);
        doc.moveDown(0.2);

        const explanation = item.explanation || `Derived from verified FBISE textbook and curriculum context for Grade ${data.grade} ${data.subject}. Designed with easy-to-learn wording adhering to Federal Board exam standards.`;
        doc.fontSize(10).fillColor("#334155").text(`Solution & Context: ${explanation}`);
        doc.moveDown(0.2);

        if (item.sketchDescription) {
          doc.fontSize(9).fillColor("#7c2d12").text(`Diagram / Sketch Guidance: ${item.sketchDescription}`, { indent: 10 });
          doc.moveDown(0.2);
        }

        if (item.comparisonTable && item.comparisonTable.headers.length > 0) {
          doc.fontSize(9).fillColor("#1e293b").text("Comparison / Structured Table:", { indent: 10 });
          const headersStr = item.comparisonTable.headers.join("  |  ");
          doc.text(`   [ ${headersStr} ]`, { indent: 15 });
          item.comparisonTable.rows.forEach((row) => {
            doc.text(`   [ ${row.join("  |  ")} ]`, { indent: 15 });
          });
          doc.moveDown(0.2);
        }

        if (item.sourceReference || item.learningObjective) {
          doc.fontSize(8).fillColor("#64748b").text(`Source: ${item.sourceReference || "FBISE Curriculum"} | Objective: ${item.learningObjective || "Conceptual understanding"}`, { indent: 10 });
        }
        doc.moveDown(0.8);
      });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

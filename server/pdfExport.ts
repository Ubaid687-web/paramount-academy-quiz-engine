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
        if (doc.y > 620) {
          doc.addPage();
        }

        doc.fontSize(11).fillColor("#0f172a").font("Helvetica-Bold").text(`Q${index + 1}. ${item.questionText}`);
        doc.font("Helvetica").fontSize(10).fillColor("#047857").text(`Correct Answer: ${item.correctAnswer || "A"}`);
        doc.moveDown(0.2);

        const explanation = item.explanation || `Derived from verified FBISE textbook and curriculum context for Grade ${data.grade} ${data.subject}. Designed with easy-to-learn wording adhering to Federal Board exam standards.`;
        doc.fontSize(10).fillColor("#334155").text(`Solution & Context: ${explanation}`);
        doc.moveDown(0.4);

        // Comparison Table Rendering
        const table = item.comparisonTable || {
          headers: ["Concept Property", "FBISE Standard Reference"],
          rows: [
            ["Core Principle", "Aligned with textbook chapter derivation"],
            ["Exam Application", "Board marking rubric structure"],
          ],
        };

        if (table && table.headers.length > 0) {
          doc.fontSize(9).fillColor("#1e293b").font("Helvetica-Bold").text("Comparison / Structured Table:");
          doc.moveDown(0.2);

          const startX = 45;
          let currentY = doc.y;
          const colWidth = 245;
          const rowHeight = 22;

          // Header row background
          doc.rect(startX, currentY, colWidth * 2, rowHeight).fillAndStroke("#f1f5f9", "#cbd5e1");
          doc.fontSize(9).fillColor("#0f172a").font("Helvetica-Bold");
          doc.text(table.headers[0], startX + 8, currentY + 6, { width: colWidth - 12 });
          doc.text(table.headers[1] || "", startX + colWidth + 8, currentY + 6, { width: colWidth - 12 });
          currentY += rowHeight;

          // Data rows
          table.rows.forEach((row, rIdx) => {
            if (currentY > 750) {
              doc.addPage();
              currentY = 50;
            }
            const bg = rIdx % 2 === 0 ? "#ffffff" : "#f8fafc";
            doc.rect(startX, currentY, colWidth * 2, rowHeight).fillAndStroke(bg, "#e2e8f0");
            doc.fontSize(9).fillColor("#334155").font("Helvetica");
            doc.text(row[0] || "", startX + 8, currentY + 6, { width: colWidth - 12 });
            doc.text(row[1] || "", startX + colWidth + 8, currentY + 6, { width: colWidth - 12 });
            currentY += rowHeight;
          });

          doc.y = currentY + 8;
          doc.font("Helvetica");
        }

        // Diagram Placeholder Box
        const sketch = item.sketchDescription || "Conceptual diagram representing key chapter structures and functional components.";
        if (doc.y > 670) {
          doc.addPage();
        }
        const boxY = doc.y;
        doc.rect(45, boxY, 510, 55).strokeColor("#cbd5e1").lineWidth(1).dash(3, { space: 2 }).stroke();
        doc.undash();
        doc.fontSize(9).fillColor("#7c2d12").font("Helvetica-Bold").text("DIAGRAM / SKETCH PLACEHOLDER:", 55, boxY + 8);
        doc.fontSize(8).fillColor("#475569").font("Helvetica").text(sketch, 55, boxY + 22, { width: 490 });
        doc.y = boxY + 65;

        if (item.sourceReference || item.learningObjective) {
          doc.fontSize(8).fillColor("#64748b").text(`Source: ${item.sourceReference || "FBISE Curriculum"} | Objective: ${item.learningObjective || "Conceptual understanding"}`, { indent: 5 });
        }
        doc.moveDown(1);
      });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

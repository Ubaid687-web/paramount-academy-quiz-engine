import type { Express, Request, Response } from "express";
import { z } from "zod";
import { sdk } from "./_core/sdk";
import { validateAssessmentDraftPayload } from "@shared/assessmentDraftContract";
import { renderMcqPaperPdf, renderMcqSolutionPdf, renderPrintablePaperPdf, renderPrintableSolutionPdf } from "./printablePaperExport";

const exportRequestSchema = z.object({
  kind: z.enum(["paper", "solution", "mcq-paper", "mcq-solution"]),
  jobId: z.number().int().positive(),
});

type StoredMcq = {
  question: string;
  options: { A: string; B: string; C: string; D: string };
  answer: "A" | "B" | "C" | "D";
  explanation: string;
  sourceReference: string;
  learningObjective: string;
};

function safeFileName(value: string, suffix: string) {
  const clean = value.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "assessment";
  return `${clean}-${suffix}.pdf`;
}

export function getPdfContentDisposition(fileName: string, isInAppPreview: boolean) {
  return `${isInAppPreview ? "inline" : "attachment"}; filename="${fileName}"`;
}

function parseNativeFormExport(body: unknown) {
  const raw = body && typeof body === "object" ? (body as Record<string, unknown>).exportRequest : null;
  if (typeof raw !== "string") throw new Error("The PDF download request was missing its completed generation reference.");
  return exportRequestSchema.parse(JSON.parse(raw));
}

function parseStoredMcqs(raw: string | null): StoredMcq[] {
  if (!raw) throw new Error("The completed MCQ generation result is unavailable. Generate the source-bound draft again before downloading.");
  const parsed = JSON.parse(raw) as { mcqs?: StoredMcq[] };
  if (!Array.isArray(parsed.mcqs) || !parsed.mcqs.length) throw new Error("The completed MCQ generation result is invalid. Generate the source-bound draft again before downloading.");
  return parsed.mcqs;
}

function parseStoredPrintable(raw: string | null) {
  if (!raw) throw new Error("The completed printable generation result is unavailable. Generate the source-bound draft again before downloading.");
  const state = JSON.parse(raw) as { final?: { payload?: unknown } };
  const validation = validateAssessmentDraftPayload(state.final?.payload);
  if (!validation.valid || (validation.payload.mode !== "short" && validation.payload.mode !== "long")) {
    throw new Error("The completed printable generation result is invalid. Generate the source-bound draft again before downloading.");
  }
  return validation.payload;
}

export async function renderStoredGenerationExport(userId: number, input: z.infer<typeof exportRequestSchema>) {
  const { getGenerationJob } = await import("./db");
  const job = await getGenerationJob(input.jobId);
  if (!job || job.userId !== userId || job.status !== "completed") {
    throw new Error("The completed generation result was not found or is not available to this account.");
  }

  if (input.kind === "mcq-paper" || input.kind === "mcq-solution") {
    if (job.generationMode !== "mcq") throw new Error("This completed generation is not an MCQ draft.");
    const mcqs = parseStoredMcqs(job.resultPayload);
    const title = "AI-generated MCQ draft";
    return input.kind === "mcq-paper"
      ? { fileName: safeFileName(title, "mcq-paper"), pdf: await renderMcqPaperPdf(title, mcqs) }
      : { fileName: safeFileName(title, "mcq-solution-key"), pdf: await renderMcqSolutionPdf(title, mcqs) };
  }

  if (job.generationMode !== "short" && job.generationMode !== "long") {
    throw new Error("This completed generation is not a printable paper draft.");
  }
  const payload = parseStoredPrintable(job.printableState);
  return input.kind === "paper"
    ? { fileName: safeFileName(payload.title, "paper"), pdf: await renderPrintablePaperPdf(payload) }
    : { fileName: safeFileName(payload.title, "solution-key"), pdf: await renderPrintableSolutionPdf(payload) };
}

async function requireTeacherOrAdmin(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (user.role !== "teacher" && user.role !== "admin") {
      res.status(403).json({ message: "Teacher or Portal Admin access is required for assessment exports." });
      return null;
    }
    return user;
  } catch {
    res.status(403).json({ message: "Teacher or Portal Admin access is required for assessment exports." });
    return null;
  }
}

export function registerPdfExportRoutes(app: Express) {
  app.post("/api/pdf-export/download", async (req, res) => {
    const user = await requireTeacherOrAdmin(req, res);
    if (!user) return;
    try {
      const request = parseNativeFormExport(req.body);
      const rendered = await renderStoredGenerationExport(user.id, request);
      const isInAppPreview = req.get("sec-fetch-dest") === "iframe" && Boolean(req.get("origin")?.includes(".manus.computer"));
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", getPdfContentDisposition(rendered.fileName, isInAppPreview));
      res.setHeader("Content-Length", String(rendered.pdf.length));
      res.setHeader("Cache-Control", "private, no-store, max-age=0");
      res.status(200).send(rendered.pdf);
    } catch (error) {
      console.warn(`[pdf-export] direct request failed reason=${error instanceof Error ? error.message : "unknown"}`);
      res.status(400).json({ message: error instanceof Error ? error.message : "The PDF could not be prepared." });
    }
  });
}

import { randomUUID } from "node:crypto";
import type { Express, Request, Response } from "express";
import { z } from "zod";
import { sdk } from "./_core/sdk";
import { validateAssessmentDraftPayload } from "@shared/assessmentDraftContract";
import { renderMcqPaperPdf, renderMcqSolutionPdf, renderPrintablePaperPdf, renderPrintableSolutionPdf } from "./printablePaperExport";

type PreparedExport = { ownerId: number; fileName: string; pdf: Buffer; expiresAt: number };
const preparedExports = new Map<string, PreparedExport>();
const EXPORT_TTL_MS = 5 * 60 * 1000;

const mcqSchema = z.object({
  question: z.string().min(1),
  options: z.object({ A: z.string().min(1), B: z.string().min(1), C: z.string().min(1), D: z.string().min(1) }),
  answer: z.enum(["A", "B", "C", "D"]),
  explanation: z.string().min(1),
  sourceReference: z.string().min(1),
  learningObjective: z.string().min(1),
});

const exportRequestSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("paper"), payload: z.unknown() }),
  z.object({ kind: z.literal("solution"), payload: z.unknown() }),
  z.object({ kind: z.literal("mcq-paper"), title: z.string().min(1), mcqs: z.array(mcqSchema).min(1) }),
  z.object({ kind: z.literal("mcq-solution"), title: z.string().min(1), mcqs: z.array(mcqSchema).min(1) }),
]);

function safeFileName(value: string, suffix: string) {
  const clean = value.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "assessment";
  return `${clean}-${suffix}.pdf`;
}

export function getPdfContentDisposition(fileName: string, isInAppPreview: boolean) {
  return `${isInAppPreview ? "inline" : "attachment"}; filename="${fileName}"`;
}

export async function renderExport(input: z.infer<typeof exportRequestSchema>) {
  if (input.kind === "mcq-paper") return { fileName: safeFileName(input.title, "mcq-paper"), pdf: await renderMcqPaperPdf(input.title, input.mcqs) };
  if (input.kind === "mcq-solution") return { fileName: safeFileName(input.title, "mcq-solution-key"), pdf: await renderMcqSolutionPdf(input.title, input.mcqs) };
  const validation = validateAssessmentDraftPayload(input.payload);
  if (!validation.valid || (validation.payload.mode !== "short" && validation.payload.mode !== "long")) {
    throw new Error("This printable draft is no longer valid. Generate it again before downloading.");
  }
  return input.kind === "paper"
    ? { fileName: safeFileName(validation.payload.title, "paper"), pdf: await renderPrintablePaperPdf(validation.payload) }
    : { fileName: safeFileName(validation.payload.title, "solution-key"), pdf: await renderPrintableSolutionPdf(validation.payload) };
}

function parseNativeFormExport(body: unknown) {
  const raw = body && typeof body === "object" ? (body as Record<string, unknown>).exportRequest : null;
  if (typeof raw !== "string") throw new Error("The PDF download request was missing its assessment data.");
  return exportRequestSchema.parse(JSON.parse(raw));
}

async function requireAdmin(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user || user.role !== "admin") {
      res.status(403).json({ message: "Portal Admin access is required for assessment exports." });
      return null;
    }
    return user;
  } catch {
    res.status(403).json({ message: "Portal Admin access is required for assessment exports." });
    return null;
  }
}

export function registerPdfExportRoutes(app: Express) {
  app.post("/api/pdf-export/download", async (req, res) => {
    const user = await requireAdmin(req, res);
    if (!user) return;
    console.info(`[pdf-export] native request received user=${user.id} destination=${req.get("sec-fetch-dest") || "unknown"} origin=${req.get("origin") || "none"}`);
    try {
      const rendered = await renderExport(parseNativeFormExport(req.body));
      const isInAppPreview = req.get("sec-fetch-dest") === "iframe" && Boolean(req.get("origin")?.includes(".manus.computer"));
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", getPdfContentDisposition(rendered.fileName, isInAppPreview));
      res.setHeader("Content-Length", String(rendered.pdf.length));
      res.setHeader("Cache-Control", "private, no-store, max-age=0");
      console.info(`[pdf-export] native response sent file=${rendered.fileName} bytes=${rendered.pdf.length} disposition=${isInAppPreview ? "inline" : "attachment"}`);
      res.status(200).send(rendered.pdf);
    } catch (error) {
      console.warn(`[pdf-export] native request failed reason=${error instanceof Error ? error.message : "unknown"}`);
      res.status(400).json({ message: error instanceof Error ? error.message : "The PDF could not be prepared." });
    }
  });

  app.post("/api/pdf-export", async (req, res) => {
    const user = await requireAdmin(req, res);
    if (!user) return;
    try {
      const input = exportRequestSchema.parse(req.body);
      const rendered = await renderExport(input);
      const exportId = randomUUID();
      preparedExports.set(exportId, { ownerId: user.id, fileName: rendered.fileName, pdf: rendered.pdf, expiresAt: Date.now() + EXPORT_TTL_MS });
      res.status(201).json({ downloadUrl: `/api/pdf-export/${exportId}`, fileName: rendered.fileName });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "The PDF could not be prepared." });
    }
  });

  app.get("/api/pdf-export/:exportId", async (req, res) => {
    const user = await requireAdmin(req, res);
    if (!user) return;
    const prepared = preparedExports.get(req.params.exportId);
    if (!prepared || prepared.expiresAt < Date.now() || prepared.ownerId !== user.id) {
      preparedExports.delete(req.params.exportId);
      res.status(404).json({ message: "This PDF download has expired. Generate it again." });
      return;
    }
    preparedExports.delete(req.params.exportId);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${prepared.fileName}"`);
    res.setHeader("Content-Length", String(prepared.pdf.length));
    res.setHeader("Cache-Control", "private, no-store, max-age=0");
    res.status(200).send(prepared.pdf);
  });
}

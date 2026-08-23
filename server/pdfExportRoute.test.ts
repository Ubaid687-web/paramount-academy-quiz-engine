import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getGenerationJob: vi.fn() }));

vi.mock("./db", () => ({ getGenerationJob: mocks.getGenerationJob }));

import { getPdfContentDisposition, registerPdfExportRoutes, renderStoredGenerationExport } from "./pdfExportRoute";

const shortPayload = {
  mode: "short" as const,
  title: "Motion revision paper",
  estimatedDurationMinutes: 30,
  items: [
    { kind: "short" as const, question: "State the speed relationship.", expectedAnswer: "Speed is distance divided by time.", markingGuide: ["States the relationship."], difficulty: "easy" as const, sourceReference: "Motion", learningObjective: "Relate speed, distance and time.", cognitiveLevel: "K" as const, orGroup: 1, marks: 3 },
  ],
};

describe("server-held PDF export rendering", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders a printable PDF only from an owned completed printable job", async () => {
    mocks.getGenerationJob.mockResolvedValue({ id: 44, userId: 7, status: "completed", generationMode: "short", printableState: JSON.stringify({ final: { payload: shortPayload } }) });

    const rendered = await renderStoredGenerationExport(7, { kind: "paper", jobId: 44 });

    expect(rendered.fileName).toContain("motion-revision-paper-paper.pdf");
    expect(rendered.pdf.subarray(0, 5).toString()).toBe("%PDF-");
  });

  it("refuses a generation job owned by another account", async () => {
    mocks.getGenerationJob.mockResolvedValue({ id: 44, userId: 99, status: "completed", generationMode: "mcq", resultPayload: JSON.stringify({ mcqs: [] }) });

    await expect(renderStoredGenerationExport(7, { kind: "mcq-paper", jobId: 44 })).rejects.toThrow("not found or is not available");
  });

  it("registers only the direct stateless download endpoint", () => {
    const posts: string[] = [];
    const gets: string[] = [];
    registerPdfExportRoutes({ post: (path: string) => { posts.push(path); }, get: (path: string) => { gets.push(path); } } as any);
    expect(posts).toEqual(["/api/pdf-export/download"]);
    expect(gets).toEqual([]);
  });

  it("shows the PDF inline only inside the in-app preview while keeping normal downloads as attachments", () => {
    expect(getPdfContentDisposition("paper.pdf", true)).toBe('inline; filename="paper.pdf"');
    expect(getPdfContentDisposition("paper.pdf", false)).toBe('attachment; filename="paper.pdf"');
  });
});

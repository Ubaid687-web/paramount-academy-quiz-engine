import { describe, expect, it, vi, afterEach } from "vitest";

const mocks = vi.hoisted(() => ({ ingestPortalAdminCurriculumSource: vi.fn() }));

vi.mock("./_core/env", () => ({ ENV: { cookieSecret: "phase117-test-secret" } }));
vi.mock("./curriculumSourceIntake", () => ({
  MAX_PORTAL_ADMIN_SOURCE_BYTES: 150 * 1024 * 1024,
  ingestPortalAdminCurriculumSource: mocks.ingestPortalAdminCurriculumSource,
}));

import {
  appendCurriculumPdfChunk,
  completeCurriculumPdfChunkUpload,
  prepareCurriculumPdfChunkUpload,
} from "./curriculumChunkUpload";

describe("chunked curriculum PDF intake", () => {
  afterEach(() => vi.clearAllMocks());

  it("accepts small ordered chunks, assembles their exact bytes, and completes through the existing safeguarded source intake", async () => {
    mocks.ingestPortalAdminCurriculumSource.mockResolvedValue({ id: 77, extractionStatus: "pending" });
    const prepared = await prepareCurriculumPdfChunkUpload({ userId: 8, curriculumSetId: 41, fileName: "grade-9-chemistry.pdf", fileSize: 9 });

    await expect(appendCurriculumPdfChunk({ userId: 8, uploadToken: prepared.uploadToken, chunkIndex: 0, fileBuffer: Buffer.from("%PDF-") })).resolves.toMatchObject({ receivedBytes: 5, complete: false });
    await expect(appendCurriculumPdfChunk({ userId: 8, uploadToken: prepared.uploadToken, chunkIndex: 1, fileBuffer: Buffer.from("book") })).resolves.toMatchObject({ receivedBytes: 9, complete: true });

    await expect(completeCurriculumPdfChunkUpload({ userId: 8, uploadToken: prepared.uploadToken, sessionCookie: "session=secure" })).resolves.toMatchObject({ id: 77 });
    expect(mocks.ingestPortalAdminCurriculumSource).toHaveBeenCalledWith(expect.objectContaining({
      curriculumSetId: 41,
      fileName: "grade-9-chemistry.pdf",
      mimeType: "application/pdf",
      fileBuffer: Buffer.from("%PDF-book"),
      uploadedBy: 8,
      sessionCookie: "session=secure",
    }));
  });

  it("rejects an out-of-order chunk and a session token used by another Portal Admin account", async () => {
    const prepared = await prepareCurriculumPdfChunkUpload({ userId: 8, curriculumSetId: 41, fileName: "grade-9-physics.pdf", fileSize: 4 });

    await expect(appendCurriculumPdfChunk({ userId: 8, uploadToken: prepared.uploadToken, chunkIndex: 1, fileBuffer: Buffer.from("test") })).rejects.toThrow("out of order");
    await expect(appendCurriculumPdfChunk({ userId: 9, uploadToken: prepared.uploadToken, chunkIndex: 0, fileBuffer: Buffer.from("test") })).rejects.toThrow("another account");
  });

  it("treats an identical retried chunk as idempotent when the response was lost after persistence", async () => {
    const prepared = await prepareCurriculumPdfChunkUpload({ userId: 8, curriculumSetId: 41, fileName: "grade-9-computer.pdf", fileSize: 4 });
    await appendCurriculumPdfChunk({ userId: 8, uploadToken: prepared.uploadToken, chunkIndex: 0, fileBuffer: Buffer.from("test") });

    await expect(appendCurriculumPdfChunk({ userId: 8, uploadToken: prepared.uploadToken, chunkIndex: 0, fileBuffer: Buffer.from("test") })).resolves.toMatchObject({
      receivedBytes: 4,
      complete: true,
      retried: true,
    });
    await expect(appendCurriculumPdfChunk({ userId: 8, uploadToken: prepared.uploadToken, chunkIndex: 0, fileBuffer: Buffer.from("fail") })).rejects.toThrow("out of order");
  });
});

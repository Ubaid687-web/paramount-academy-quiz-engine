import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({ ingestPortalAdminCurriculumSource: vi.fn(), storagePut: vi.fn(), storageGet: vi.fn(), stored: new Map<string, Buffer>() }));

vi.mock("./_core/env", () => ({ ENV: { cookieSecret: "phase117-test-secret" } }));
vi.mock("./curriculumSourceIntake", () => ({
  MAX_PORTAL_ADMIN_SOURCE_BYTES: 150 * 1024 * 1024,
  ingestPortalAdminCurriculumSource: mocks.ingestPortalAdminCurriculumSource,
}));
vi.mock("./storage", () => ({ storagePut: mocks.storagePut, storageGet: mocks.storageGet }));

import {
  appendCurriculumPdfChunk,
  completeCurriculumPdfChunkUpload,
  getCurriculumPdfChunkUploadStatus,
  prepareCurriculumPdfChunkUpload,
} from "./curriculumChunkUpload";

describe("chunked curriculum PDF intake", () => {
  beforeEach(() => {
    mocks.stored.clear();
    mocks.storagePut.mockImplementation(async (key: string, data: Buffer | Uint8Array | string) => {
      mocks.stored.set(key, Buffer.from(data));
      return { key, url: `memory://${key}` };
    });
    mocks.storageGet.mockImplementation(async (key: string) => ({ key, url: `memory://${key}` }));
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      const bytes = mocks.stored.get(url.replace("memory://", ""));
      return new Response(bytes, { status: bytes ? 200 : 404 });
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

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

  it("preserves authoritative durable progress after rejecting a mismatched retry so a client can rebase safely", async () => {
    const prepared = await prepareCurriculumPdfChunkUpload({ userId: 8, curriculumSetId: 41, fileName: "grade-9-chemistry.pdf", fileSize: 8 });
    await appendCurriculumPdfChunk({ userId: 8, uploadToken: prepared.uploadToken, chunkIndex: 0, fileBuffer: Buffer.from("%PDF") });

    await expect(appendCurriculumPdfChunk({ userId: 8, uploadToken: prepared.uploadToken, chunkIndex: 0, fileBuffer: Buffer.from("DIFF") })).rejects.toThrow("out of order");
    await expect(getCurriculumPdfChunkUploadStatus({ userId: 8, uploadToken: prepared.uploadToken })).resolves.toMatchObject({
      receivedBytes: 4,
      fileSize: 8,
      nextChunkIndex: 1,
      complete: false,
    });
  });

  it("retains an acknowledged upload status in durable storage for a later foreground resume", async () => {
    const prepared = await prepareCurriculumPdfChunkUpload({ userId: 8, curriculumSetId: 41, fileName: "grade-9-chemistry.pdf", fileSize: 8 });
    await appendCurriculumPdfChunk({ userId: 8, uploadToken: prepared.uploadToken, chunkIndex: 0, fileBuffer: Buffer.from("%PDF") });

    await expect(getCurriculumPdfChunkUploadStatus({ userId: 8, uploadToken: prepared.uploadToken })).resolves.toMatchObject({
      receivedBytes: 4,
      fileSize: 8,
      nextChunkIndex: 1,
      complete: false,
    });
  });

  it("returns the original stored source when a mobile client retries final completion after the first success", async () => {
    mocks.ingestPortalAdminCurriculumSource.mockResolvedValue({ id: 88, curriculumSetId: 41, extractionStatus: "pending" });
    const prepared = await prepareCurriculumPdfChunkUpload({ userId: 8, curriculumSetId: 41, fileName: "grade-9-chemistry.pdf", fileSize: 9 });
    await appendCurriculumPdfChunk({ userId: 8, uploadToken: prepared.uploadToken, chunkIndex: 0, fileBuffer: Buffer.from("%PDF-") });
    await appendCurriculumPdfChunk({ userId: 8, uploadToken: prepared.uploadToken, chunkIndex: 1, fileBuffer: Buffer.from("book") });

    await expect(completeCurriculumPdfChunkUpload({ userId: 8, uploadToken: prepared.uploadToken })).resolves.toMatchObject({ id: 88 });
    await expect(completeCurriculumPdfChunkUpload({ userId: 8, uploadToken: prepared.uploadToken })).resolves.toMatchObject({ id: 88 });
    expect(mocks.ingestPortalAdminCurriculumSource).toHaveBeenCalledTimes(1);
  });
});

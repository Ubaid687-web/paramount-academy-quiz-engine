import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Session = {
  uploadId: string; userId: number; curriculumSetId: number; fileName: string; fileSize: number;
  receivedBytes: number; nextChunkIndex: number; revision: number; expiresAt: Date; status: "active" | "completed"; sourceId: number | null;
};
type Receipt = { uploadId: string; chunkIndex: number; sha256: string; byteLength: number; storageKey: string; status: "pending" | "committed"; leaseExpiresAt: Date };

const mocks = vi.hoisted(() => ({
  ingestChunkedPdfManifestSource: vi.fn(), storagePut: vi.fn(), storageGet: vi.fn(),
  createCurriculumUploadClaim: vi.fn(), claimCurriculumUploadCompletion: vi.fn(), completeCurriculumUploadClaim: vi.fn(), releaseCurriculumUploadClaim: vi.fn(),
  createCurriculumUploadSession: vi.fn(), getCurriculumUploadSessionStatus: vi.fn(), claimCurriculumUploadChunk: vi.fn(), commitCurriculumUploadChunk: vi.fn(), listCommittedCurriculumUploadChunks: vi.fn(), markCurriculumUploadSessionCompleted: vi.fn(), getCurriculumSource: vi.fn(),
  sessions: new Map<string, Session>(), receipts: new Map<string, Receipt>(), stored: new Map<string, Buffer>(),
}));

vi.mock("./_core/env", () => ({ ENV: { cookieSecret: "durable-upload-test-secret" } }));
vi.mock("./curriculumSourceIntake", () => ({ MAX_PORTAL_ADMIN_SOURCE_BYTES: 150 * 1024 * 1024, ingestChunkedPdfManifestSource: mocks.ingestChunkedPdfManifestSource }));
vi.mock("./storage", () => ({ storagePut: mocks.storagePut, storageGet: mocks.storageGet }));
vi.mock("./db", () => ({
  createCurriculumUploadClaim: mocks.createCurriculumUploadClaim,
  claimCurriculumUploadCompletion: mocks.claimCurriculumUploadCompletion,
  completeCurriculumUploadClaim: mocks.completeCurriculumUploadClaim,
  releaseCurriculumUploadClaim: mocks.releaseCurriculumUploadClaim,
  createCurriculumUploadSession: mocks.createCurriculumUploadSession,
  getCurriculumUploadSessionStatus: mocks.getCurriculumUploadSessionStatus,
  claimCurriculumUploadChunk: mocks.claimCurriculumUploadChunk,
  commitCurriculumUploadChunk: mocks.commitCurriculumUploadChunk,
  listCommittedCurriculumUploadChunks: mocks.listCommittedCurriculumUploadChunks,
  markCurriculumUploadSessionCompleted: mocks.markCurriculumUploadSessionCompleted,
  getCurriculumSource: mocks.getCurriculumSource,
}));

import { appendCurriculumPdfChunk, completeCurriculumPdfChunkUpload, getCurriculumPdfChunkUploadStatus, prepareCurriculumPdfChunkUpload } from "./curriculumChunkUpload";

function key(uploadId: string, chunkIndex: number) { return `${uploadId}:${chunkIndex}`; }
function status(session: Session) { return { ...session, complete: session.receivedBytes === session.fileSize }; }

describe("durable chunk receipt curriculum intake", () => {
  beforeEach(() => {
    mocks.sessions.clear(); mocks.receipts.clear(); mocks.stored.clear();
    mocks.storagePut.mockImplementation(async (storageKey: string, bytes: Buffer) => { mocks.stored.set(storageKey, Buffer.from(bytes)); return { key: storageKey, url: `memory://${storageKey}` }; });
    mocks.storageGet.mockImplementation(async (storageKey: string) => ({ key: storageKey, url: `memory://${storageKey}` }));
    vi.stubGlobal("fetch", vi.fn(async (url: string) => new Response(mocks.stored.get(url.replace("memory://", "")), { status: mocks.stored.has(url.replace("memory://", "")) ? 200 : 404 })));
    mocks.createCurriculumUploadSession.mockImplementation(async (input: Omit<Session, "receivedBytes" | "nextChunkIndex" | "revision" | "status" | "sourceId">) => {
      mocks.sessions.set(input.uploadId, { ...input, receivedBytes: 0, nextChunkIndex: 0, revision: 0, status: "active", sourceId: null });
    });
    mocks.getCurriculumUploadSessionStatus.mockImplementation(async (input: { uploadId: string }) => {
      const session = mocks.sessions.get(input.uploadId); return session ? status(session) : null;
    });
    mocks.claimCurriculumUploadChunk.mockImplementation(async (input: { uploadId: string; chunkIndex: number; expectedRevision: number; sha256: string; byteLength: number; storageKey: string }) => {
      const session = mocks.sessions.get(input.uploadId)!; const receiptKey = key(input.uploadId, input.chunkIndex); const existing = mocks.receipts.get(receiptKey);
      if (existing) {
        if (existing.sha256 !== input.sha256 || existing.byteLength !== input.byteLength) return { kind: "rejected", reason: "file_conflict" };
        return existing.status === "committed" ? { kind: "already_committed", status: status(session) } : { kind: "pending", status: status(session), retryAfterMs: 250 };
      }
      if (session.nextChunkIndex !== input.chunkIndex || session.revision !== input.expectedRevision) return { kind: "reconcile", status: status(session) };
      mocks.receipts.set(receiptKey, { ...input, status: "pending", leaseExpiresAt: new Date(Date.now() + 20_000) });
      return { kind: "claimed", status: status(session) };
    });
    mocks.commitCurriculumUploadChunk.mockImplementation(async (input: { uploadId: string; chunkIndex: number; expectedRevision: number }) => {
      const session = mocks.sessions.get(input.uploadId)!; const receipt = mocks.receipts.get(key(input.uploadId, input.chunkIndex))!;
      if (receipt.status === "committed") return { kind: "already_committed", status: status(session) };
      if (session.nextChunkIndex !== input.chunkIndex || session.revision !== input.expectedRevision) return { kind: "reconcile", status: status(session) };
      receipt.status = "committed"; session.receivedBytes += receipt.byteLength; session.nextChunkIndex += 1; session.revision += 1;
      return { kind: "committed", status: status(session) };
    });
    mocks.listCommittedCurriculumUploadChunks.mockImplementation(async (input: { uploadId: string }) => [...mocks.receipts.values()].filter((receipt) => receipt.uploadId === input.uploadId && receipt.status === "committed").sort((a, b) => a.chunkIndex - b.chunkIndex));
    mocks.markCurriculumUploadSessionCompleted.mockImplementation(async (input: { uploadId: string; sourceId: number }) => { const session = mocks.sessions.get(input.uploadId)!; session.status = "completed"; session.sourceId = input.sourceId; });
    mocks.claimCurriculumUploadCompletion.mockResolvedValue({ state: "claimed" });
    mocks.getCurriculumSource.mockResolvedValue({ id: 77, curriculumSetId: 41, extractionStatus: "pending" });
    mocks.ingestChunkedPdfManifestSource.mockResolvedValue({ id: 77, curriculumSetId: 41, extractionStatus: "pending" });
  });

  afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });

  it("commits ordered chunks, retries a lost acknowledgement idempotently, and finalizes a manifest-backed source", async () => {
    const prepared = await prepareCurriculumPdfChunkUpload({ userId: 8, curriculumSetId: 41, fileName: "grade-9-chemistry.pdf", fileSize: 9 });
    const first = await appendCurriculumPdfChunk({ userId: 8, uploadToken: prepared.uploadToken, chunkIndex: 0, expectedRevision: 0, fileBuffer: Buffer.from("%PDF-") });
    expect(first).toMatchObject({ acknowledgement: "committed", receivedBytes: 5, revision: 1 });
    await expect(appendCurriculumPdfChunk({ userId: 8, uploadToken: prepared.uploadToken, chunkIndex: 0, expectedRevision: 0, fileBuffer: Buffer.from("%PDF-") })).resolves.toMatchObject({ acknowledgement: "already_committed", receivedBytes: 5 });
    await expect(appendCurriculumPdfChunk({ userId: 8, uploadToken: prepared.uploadToken, chunkIndex: 1, expectedRevision: 1, fileBuffer: Buffer.from("book") })).resolves.toMatchObject({ acknowledgement: "committed", complete: true, revision: 2 });
    await expect(completeCurriculumPdfChunkUpload({ userId: 8, uploadToken: prepared.uploadToken, sessionCookie: "session=secure" })).resolves.toMatchObject({ id: 77 });
    expect(mocks.ingestChunkedPdfManifestSource).toHaveBeenCalledWith(expect.objectContaining({ chunks: [{ key: expect.stringContaining("/chunks/0-"), byteLength: 5 }, { key: expect.stringContaining("/chunks/1-"), byteLength: 4 }] }));
  });

  it("returns a typed reconcile outcome for a stale cursor instead of throwing an ambiguous order error", async () => {
    const prepared = await prepareCurriculumPdfChunkUpload({ userId: 8, curriculumSetId: 41, fileName: "grade-9-computer.pdf", fileSize: 8 });
    await appendCurriculumPdfChunk({ userId: 8, uploadToken: prepared.uploadToken, chunkIndex: 0, expectedRevision: 0, fileBuffer: Buffer.from("%PDF") });
    await expect(appendCurriculumPdfChunk({ userId: 8, uploadToken: prepared.uploadToken, chunkIndex: 1, expectedRevision: 0, fileBuffer: Buffer.from("book") })).resolves.toMatchObject({ acknowledgement: "reconcile", receivedBytes: 4, nextChunkIndex: 1, revision: 1 });
  });

  it("does not permit different bytes at a committed chunk index and retains authoritative progress", async () => {
    const prepared = await prepareCurriculumPdfChunkUpload({ userId: 8, curriculumSetId: 41, fileName: "grade-9-physics.pdf", fileSize: 8 });
    await appendCurriculumPdfChunk({ userId: 8, uploadToken: prepared.uploadToken, chunkIndex: 0, expectedRevision: 0, fileBuffer: Buffer.from("%PDF") });
    await expect(appendCurriculumPdfChunk({ userId: 8, uploadToken: prepared.uploadToken, chunkIndex: 0, expectedRevision: 1, fileBuffer: Buffer.from("DIFF") })).rejects.toThrow("no longer matches");
    await expect(getCurriculumPdfChunkUploadStatus({ userId: 8, uploadToken: prepared.uploadToken })).resolves.toMatchObject({ receivedBytes: 4, nextChunkIndex: 1, revision: 1 });
  });

  it("keeps a pending receipt non-destructive while another attempt may still be writing the same chunk", async () => {
    const prepared = await prepareCurriculumPdfChunkUpload({ userId: 8, curriculumSetId: 41, fileName: "grade-9-chemistry.pdf", fileSize: 4 });
    mocks.claimCurriculumUploadChunk.mockResolvedValueOnce({ kind: "pending", status: { ...status(mocks.sessions.get(JSON.parse(Buffer.from(prepared.uploadToken.split(".")[0], "base64url").toString("utf8")).uploadId)!), complete: false }, retryAfterMs: 250 });
    await expect(appendCurriculumPdfChunk({ userId: 8, uploadToken: prepared.uploadToken, chunkIndex: 0, expectedRevision: 0, fileBuffer: Buffer.from("test") })).resolves.toMatchObject({ acknowledgement: "pending", receivedBytes: 0 });
    expect(mocks.storagePut).not.toHaveBeenCalled();
  });
});

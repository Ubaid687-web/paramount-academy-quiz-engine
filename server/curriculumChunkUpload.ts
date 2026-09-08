import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type { CurriculumSource } from "../drizzle/schema";
import { ENV } from "./_core/env";
import { ingestChunkedPdfManifestSource, MAX_PORTAL_ADMIN_SOURCE_BYTES } from "./curriculumSourceIntake";
import { storageGet, storagePut } from "./storage";
import {
  claimCurriculumUploadChunk,
  claimCurriculumUploadCompletion,
  commitCurriculumUploadChunk,
  completeCurriculumUploadClaim,
  createCurriculumUploadClaim,
  createCurriculumUploadSession,
  getCurriculumSource,
  getCurriculumUploadSessionStatus,
  listCommittedCurriculumUploadChunks,
  markCurriculumUploadSessionCompleted,
  releaseCurriculumUploadClaim,
} from "./db";

export const CURRICULUM_UPLOAD_CHUNK_BYTES = 512 * 1024;
const UPLOAD_TOKEN_TTL_MS = 12 * 60 * 60 * 1000;
const CHUNK_LEASE_MS = 20_000;

type UploadTicket = {
  uploadId: string;
  userId: number;
  curriculumSetId: number;
  fileName: string;
  fileSize: number;
  expiresAt: number;
};

function encodeBase64Url(value: string) {
  return Buffer.from(value).toString("base64url");
}

function sign(encodedPayload: string) {
  if (!ENV.cookieSecret) throw new Error("Secure upload signing is unavailable. Please contact Portal Admin.");
  return createHmac("sha256", ENV.cookieSecret).update(encodedPayload).digest("base64url");
}

function uploadPrefix(uploadId: string) {
  return `curriculum-uploads/${uploadId}`;
}

function chunkKey(uploadId: string, chunkIndex: number, sha256: string) {
  return `${uploadPrefix(uploadId)}/chunks/${chunkIndex}-${sha256}`;
}

function assertValidTicket(ticket: UploadTicket) {
  if (!/^[a-f0-9-]{36}$/i.test(ticket.uploadId) || !Number.isSafeInteger(ticket.userId) || !Number.isSafeInteger(ticket.curriculumSetId)) {
    throw new Error("The upload session is invalid. Start the textbook upload again.");
  }
  if (!Number.isSafeInteger(ticket.fileSize) || ticket.fileSize < 1 || ticket.fileSize > MAX_PORTAL_ADMIN_SOURCE_BYTES || ticket.expiresAt < Date.now()) {
    throw new Error("The upload session expired or its file size is invalid. Start the textbook upload again.");
  }
  if (!ticket.fileName || ticket.fileName.length > 255 || /[\u0000-\u001F]/.test(ticket.fileName)) {
    throw new Error("The textbook filename is invalid. Start the upload again.");
  }
}

function parseTicket(token: string, userId: number): UploadTicket {
  const [encodedPayload, providedSignature] = token.split(".");
  if (!encodedPayload || !providedSignature) throw new Error("The upload session is invalid. Start the textbook upload again.");
  const expectedSignature = sign(encodedPayload);
  const expectedBytes = Buffer.from(expectedSignature);
  const providedBytes = Buffer.from(providedSignature);
  if (expectedBytes.length !== providedBytes.length || !timingSafeEqual(expectedBytes, providedBytes)) {
    throw new Error("The upload session is invalid. Start the textbook upload again.");
  }
  let ticket: UploadTicket;
  try {
    ticket = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as UploadTicket;
  } catch {
    throw new Error("The upload session is invalid. Start the textbook upload again.");
  }
  assertValidTicket(ticket);
  if (ticket.userId !== userId) throw new Error("This upload session belongs to another account. Start the upload again.");
  return ticket;
}

async function readStoredBytes(key: string) {
  const { url } = await storageGet(key);
  const response = await fetch(url);
  if (!response.ok) throw new Error("The upload session is unavailable. Start the textbook upload again.");
  return Buffer.from(await response.arrayBuffer());
}

function toResponseStatus(status: NonNullable<Awaited<ReturnType<typeof getCurriculumUploadSessionStatus>>>) {
  return {
    receivedBytes: status.receivedBytes,
    fileSize: status.fileSize,
    nextChunkIndex: status.nextChunkIndex,
    revision: status.revision,
    complete: status.complete,
    expiresAt: status.expiresAt.getTime(),
    sourceId: status.sourceId,
  };
}

async function getDurableStatus(ticket: UploadTicket) {
  const status = await getCurriculumUploadSessionStatus(ticket);
  if (!status) throw new Error("This protected transfer used an older recovery format. Start one fresh protected transfer for this same existing draft; no subject or source will be changed.");
  return status;
}

function rejectedClaimMessage(reason: "session_unavailable" | "session_expired" | "file_conflict") {
  if (reason === "file_conflict") return "The selected file no longer matches this protected transfer. Start a fresh protected transfer for this same draft.";
  if (reason === "session_expired") return "The protected transfer expired. Start a fresh protected transfer for this same draft.";
  return "The protected transfer is unavailable. Start a fresh protected transfer for this same draft.";
}

export async function prepareCurriculumPdfChunkUpload(input: { userId: number; curriculumSetId: number; fileName: string; fileSize: number }) {
  const ticket: UploadTicket = {
    uploadId: randomUUID(),
    userId: input.userId,
    curriculumSetId: input.curriculumSetId,
    fileName: input.fileName.trim(),
    fileSize: input.fileSize,
    expiresAt: Date.now() + UPLOAD_TOKEN_TTL_MS,
  };
  assertValidTicket(ticket);
  await createCurriculumUploadSession({ ...ticket, expiresAt: new Date(ticket.expiresAt) });
  await createCurriculumUploadClaim({ uploadId: ticket.uploadId, userId: ticket.userId, curriculumSetId: ticket.curriculumSetId, expiresAt: new Date(ticket.expiresAt) });
  const encodedPayload = encodeBase64Url(JSON.stringify(ticket));
  return { uploadToken: `${encodedPayload}.${sign(encodedPayload)}`, chunkBytes: CURRICULUM_UPLOAD_CHUNK_BYTES, expiresAt: ticket.expiresAt };
}

export async function getCurriculumPdfChunkUploadStatus(input: { userId: number; uploadToken: string }) {
  const ticket = parseTicket(input.uploadToken, input.userId);
  return toResponseStatus(await getDurableStatus(ticket));
}

async function appendCurriculumPdfChunkInternal(input: { userId: number; uploadToken: string; chunkIndex: number; expectedRevision: number; fileBuffer: Buffer }) {
  const ticket = parseTicket(input.uploadToken, input.userId);
  if (!Number.isSafeInteger(input.chunkIndex) || !Number.isSafeInteger(input.expectedRevision)) throw new Error("The protected upload cursor is invalid. Resume this same file once so the server can reconcile it.");
  const status = await getDurableStatus(ticket);
  if (!input.fileBuffer.length || input.fileBuffer.length > CURRICULUM_UPLOAD_CHUNK_BYTES) {
    throw new Error("A textbook upload chunk has an invalid size. Resume this same file once so the server can reconcile it.");
  }
  const sha256 = createHash("sha256").update(input.fileBuffer).digest("hex");
  const storageKey = chunkKey(ticket.uploadId, input.chunkIndex, sha256);
  const claim = await claimCurriculumUploadChunk({
    ...ticket,
    chunkIndex: input.chunkIndex,
    expectedRevision: input.expectedRevision,
    sha256,
    byteLength: input.fileBuffer.length,
    storageKey,
    leaseMs: CHUNK_LEASE_MS,
  });
  if (claim.kind === "rejected") throw new Error(rejectedClaimMessage(claim.reason));
  if (claim.kind === "reconcile") return { ...toResponseStatus(claim.status), acknowledgement: "reconcile" as const };
  if (claim.kind === "pending") return { ...toResponseStatus(claim.status), acknowledgement: "pending" as const, retryAfterMs: claim.retryAfterMs };
  if (claim.kind === "already_committed") return { ...toResponseStatus(claim.status), acknowledgement: "already_committed" as const };
  const remainingBytes = ticket.fileSize - claim.status.receivedBytes;
  if (input.fileBuffer.length > remainingBytes) throw new Error("A textbook upload chunk has an invalid size. Resume this same file once so the server can reconcile it.");

  await storagePut(storageKey, input.fileBuffer, "application/octet-stream");
  const committed = await commitCurriculumUploadChunk({
    ...ticket,
    chunkIndex: input.chunkIndex,
    expectedRevision: input.expectedRevision,
    sha256,
    byteLength: input.fileBuffer.length,
  });
  if (committed.kind === "rejected") throw new Error(rejectedClaimMessage(committed.reason));
  return { ...toResponseStatus(committed.status), acknowledgement: committed.kind };
}

function safeUploadError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/\s+/g, " ").slice(0, 240);
}

export async function appendCurriculumPdfChunk(input: { userId: number; uploadToken: string; chunkIndex: number; expectedRevision: number; fileBuffer: Buffer }) {
  try {
    return await appendCurriculumPdfChunkInternal(input);
  } catch (error) {
    const uploadIdFingerprint = createHash("sha256").update(input.uploadToken).digest("hex").slice(0, 12);
    console.error("[CurriculumUpload] protected chunk append failed", {
      uploadIdFingerprint,
      chunkIndex: input.chunkIndex,
      expectedRevision: input.expectedRevision,
      byteLength: input.fileBuffer.length,
      error: safeUploadError(error),
    });
    throw error;
  }
}

export async function completeCurriculumPdfChunkUpload(input: { userId: number; uploadToken: string; sessionCookie?: string }) {
  const ticket = parseTicket(input.uploadToken, input.userId);
  const durableStatus = await getDurableStatus(ticket);
  if (durableStatus.status === "completed" && durableStatus.sourceId) {
    const source = await getCurriculumSource(durableStatus.sourceId);
    if (!source || source.curriculumSetId !== ticket.curriculumSetId) throw new Error("The completed textbook receipt is unavailable. Contact Portal Admin before retrying this upload.");
    return source;
  }
  if (!durableStatus.complete) throw new Error(`Upload is incomplete: received ${durableStatus.receivedBytes} of ${durableStatus.fileSize} bytes.`);
  const claim = await claimCurriculumUploadCompletion({ uploadId: ticket.uploadId, userId: input.userId, curriculumSetId: ticket.curriculumSetId });
  if (claim.state === "completed" && claim.sourceId) {
    const source = await getCurriculumSource(claim.sourceId);
    if (!source || source.curriculumSetId !== ticket.curriculumSetId) throw new Error("The completed textbook receipt is unavailable. Contact Portal Admin before retrying this upload.");
    await markCurriculumUploadSessionCompleted({ ...ticket, sourceId: source.id });
    return source;
  }
  if (claim.state === "processing") throw new Error("This textbook is already being finalised. Wait for the current completion request to finish, then refresh the intake status.");

  try {
    const contentHash = createHash("sha256");
    const chunks = await listCommittedCurriculumUploadChunks(ticket);
    if (chunks.length !== durableStatus.nextChunkIndex) throw new Error("The protected upload is missing a committed chunk. Resume this same file so the server can reconcile it.");
    const manifest: Array<{ key: string; byteLength: number }> = [];
    let firstChunk: Buffer | null = null;
    let totalBytes = 0;
    for (let index = 0; index < chunks.length; index += 1) {
      const receipt = chunks[index];
      if (!receipt || receipt.chunkIndex !== index) throw new Error("The protected upload chunk order is incomplete. Resume this same file so the server can reconcile it.");
      const bytes = await readStoredBytes(receipt.storageKey);
      if (!bytes.length || bytes.length > CURRICULUM_UPLOAD_CHUNK_BYTES || bytes.length !== receipt.byteLength) throw new Error("The assembled textbook has an invalid protected chunk.");
      if (createHash("sha256").update(bytes).digest("hex") !== receipt.sha256) throw new Error("The assembled textbook chunk integrity check failed.");
      if (index === 0) firstChunk = bytes;
      contentHash.update(bytes);
      totalBytes += bytes.length;
      manifest.push({ key: receipt.storageKey, byteLength: receipt.byteLength });
    }
    if (!firstChunk || totalBytes !== ticket.fileSize) throw new Error("The assembled textbook file is incomplete. Resume this same file so the server can reconcile it.");
    const source = await ingestChunkedPdfManifestSource({
      curriculumSetId: ticket.curriculumSetId,
      fileName: ticket.fileName,
      fileSize: ticket.fileSize,
      contentHash: contentHash.digest("hex"),
      firstChunk,
      chunks: manifest,
      uploadedBy: input.userId,
      sessionCookie: input.sessionCookie,
    });
    await completeCurriculumUploadClaim({ uploadId: ticket.uploadId, userId: input.userId, curriculumSetId: ticket.curriculumSetId, sourceId: source.id });
    await markCurriculumUploadSessionCompleted({ ...ticket, sourceId: source.id });
    return source;
  } catch (error) {
    await releaseCurriculumUploadClaim({ uploadId: ticket.uploadId, userId: input.userId, curriculumSetId: ticket.curriculumSetId });
    throw error;
  }
}

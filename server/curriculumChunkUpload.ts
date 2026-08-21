import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { ENV } from "./_core/env";
import { ingestPortalAdminCurriculumSource, MAX_PORTAL_ADMIN_SOURCE_BYTES } from "./curriculumSourceIntake";
import { storageGet, storagePut } from "./storage";

export const CURRICULUM_UPLOAD_CHUNK_BYTES = 512 * 1024;
const UPLOAD_TOKEN_TTL_MS = 12 * 60 * 60 * 1000;

type UploadTicket = {
  uploadId: string;
  userId: number;
  curriculumSetId: number;
  fileName: string;
  fileSize: number;
  expiresAt: number;
};

type UploadState = UploadTicket & {
  nextChunkIndex: number;
  receivedBytes: number;
  lastChunk?: { index: number; sha256: string; byteLength: number };
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

function stateKey(uploadId: string) {
  return `${uploadPrefix(uploadId)}/state.json`;
}

function chunkKey(uploadId: string, chunkIndex: number) {
  return `${uploadPrefix(uploadId)}/chunks/${chunkIndex}`;
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

async function readState(ticket: UploadTicket): Promise<UploadState> {
  try {
    const state = JSON.parse((await readStoredBytes(stateKey(ticket.uploadId))).toString("utf8")) as UploadState;
    assertValidTicket(state);
    if (state.userId !== ticket.userId || state.curriculumSetId !== ticket.curriculumSetId || state.fileSize !== ticket.fileSize || state.fileName !== ticket.fileName) {
      throw new Error("The upload session is invalid. Start the textbook upload again.");
    }
    return state;
  } catch (error) {
    if (error instanceof Error && error.message.includes("upload session")) throw error;
    throw new Error("The upload session is unavailable. Start the textbook upload again.");
  }
}

async function saveState(state: UploadState) {
  await storagePut(stateKey(state.uploadId), JSON.stringify(state), "application/json");
}

function sessionStatus(state: UploadState) {
  return {
    receivedBytes: state.receivedBytes,
    fileSize: state.fileSize,
    nextChunkIndex: state.nextChunkIndex,
    complete: state.receivedBytes === state.fileSize,
    expiresAt: state.expiresAt,
  };
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
  await saveState({ ...ticket, nextChunkIndex: 0, receivedBytes: 0 });
  const encodedPayload = encodeBase64Url(JSON.stringify(ticket));
  return { uploadToken: `${encodedPayload}.${sign(encodedPayload)}`, chunkBytes: CURRICULUM_UPLOAD_CHUNK_BYTES, expiresAt: ticket.expiresAt };
}

export async function getCurriculumPdfChunkUploadStatus(input: { userId: number; uploadToken: string }) {
  const ticket = parseTicket(input.uploadToken, input.userId);
  return sessionStatus(await readState(ticket));
}

export async function appendCurriculumPdfChunk(input: { userId: number; uploadToken: string; chunkIndex: number; fileBuffer: Buffer }) {
  const ticket = parseTicket(input.uploadToken, input.userId);
  const state = await readState(ticket);
  const chunkHash = createHmac("sha256", ENV.cookieSecret).update(input.fileBuffer).digest("hex");
  if (input.chunkIndex === state.lastChunk?.index && state.lastChunk.sha256 === chunkHash && state.lastChunk.byteLength === input.fileBuffer.length) {
    return { ...sessionStatus(state), retried: true };
  }
  if (!Number.isSafeInteger(input.chunkIndex) || input.chunkIndex !== state.nextChunkIndex) {
    throw new Error("This textbook chunk arrived out of order. Restart the upload so no pages are lost.");
  }
  const remainingBytes = ticket.fileSize - state.receivedBytes;
  if (!input.fileBuffer.length || input.fileBuffer.length > CURRICULUM_UPLOAD_CHUNK_BYTES || input.fileBuffer.length > remainingBytes) {
    throw new Error("A textbook upload chunk has an invalid size. Restart the upload.");
  }
  await storagePut(chunkKey(ticket.uploadId, input.chunkIndex), input.fileBuffer, "application/octet-stream");
  const nextState: UploadState = {
    ...state,
    nextChunkIndex: state.nextChunkIndex + 1,
    receivedBytes: state.receivedBytes + input.fileBuffer.length,
    lastChunk: { index: input.chunkIndex, sha256: chunkHash, byteLength: input.fileBuffer.length },
  };
  await saveState(nextState);
  return sessionStatus(nextState);
}

export async function completeCurriculumPdfChunkUpload(input: { userId: number; uploadToken: string; sessionCookie?: string }) {
  const ticket = parseTicket(input.uploadToken, input.userId);
  const state = await readState(ticket);
  if (state.receivedBytes !== ticket.fileSize) {
    throw new Error(`Upload is incomplete: received ${state.receivedBytes} of ${ticket.fileSize} bytes.`);
  }
  const chunks = await Promise.all(Array.from({ length: state.nextChunkIndex }, (_, index) => readStoredBytes(chunkKey(ticket.uploadId, index))));
  const fileBuffer = Buffer.concat(chunks);
  if (fileBuffer.length !== ticket.fileSize) throw new Error("The assembled textbook file is incomplete. Restart the upload.");
  return ingestPortalAdminCurriculumSource({
    curriculumSetId: ticket.curriculumSetId,
    fileName: ticket.fileName,
    mimeType: "application/pdf",
    fileBuffer,
    uploadedBy: input.userId,
    sessionCookie: input.sessionCookie,
  });
}

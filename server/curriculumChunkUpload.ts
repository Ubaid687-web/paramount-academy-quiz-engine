import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, rm, stat, writeFile, appendFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ENV } from "./_core/env";
import { ingestPortalAdminCurriculumSource, MAX_PORTAL_ADMIN_SOURCE_BYTES } from "./curriculumSourceIntake";

const CHUNK_UPLOAD_DIRECTORY = join(tmpdir(), "paramount-curriculum-chunks");
export const CURRICULUM_UPLOAD_CHUNK_BYTES = 512 * 1024;
const UPLOAD_TOKEN_TTL_MS = 30 * 60 * 1000;

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

function statePath(uploadId: string) {
  return join(CHUNK_UPLOAD_DIRECTORY, `${uploadId}.json`);
}

function bytesPath(uploadId: string) {
  return join(CHUNK_UPLOAD_DIRECTORY, `${uploadId}.pdf`);
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

async function readState(ticket: UploadTicket): Promise<UploadState> {
  try {
    const state = JSON.parse(await readFile(statePath(ticket.uploadId), "utf8")) as UploadState;
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
  await writeFile(statePath(state.uploadId), JSON.stringify(state), "utf8");
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
  await mkdir(CHUNK_UPLOAD_DIRECTORY, { recursive: true });
  await saveState({ ...ticket, nextChunkIndex: 0, receivedBytes: 0 });
  const encodedPayload = encodeBase64Url(JSON.stringify(ticket));
  return { uploadToken: `${encodedPayload}.${sign(encodedPayload)}`, chunkBytes: CURRICULUM_UPLOAD_CHUNK_BYTES };
}

export async function appendCurriculumPdfChunk(input: { userId: number; uploadToken: string; chunkIndex: number; fileBuffer: Buffer }) {
  const ticket = parseTicket(input.uploadToken, input.userId);
  const state = await readState(ticket);
  const chunkHash = createHmac("sha256", ENV.cookieSecret).update(input.fileBuffer).digest("hex");
  if (input.chunkIndex === state.lastChunk?.index && state.lastChunk.sha256 === chunkHash && state.lastChunk.byteLength === input.fileBuffer.length) {
    // A response may be lost after the server saved a chunk. Accept an identical retry so the
    // browser can safely recover without duplicating bytes or corrupting the textbook.
    return { receivedBytes: state.receivedBytes, fileSize: ticket.fileSize, complete: state.receivedBytes === ticket.fileSize, retried: true };
  }
  if (!Number.isSafeInteger(input.chunkIndex) || input.chunkIndex !== state.nextChunkIndex) {
    throw new Error("This textbook chunk arrived out of order. Restart the upload so no pages are lost.");
  }
  const remainingBytes = ticket.fileSize - state.receivedBytes;
  if (!input.fileBuffer.length || input.fileBuffer.length > CURRICULUM_UPLOAD_CHUNK_BYTES || input.fileBuffer.length > remainingBytes) {
    throw new Error("A textbook upload chunk has an invalid size. Restart the upload.");
  }
  await appendFile(bytesPath(ticket.uploadId), input.fileBuffer);
  const nextState = {
    ...state,
    nextChunkIndex: state.nextChunkIndex + 1,
    receivedBytes: state.receivedBytes + input.fileBuffer.length,
    lastChunk: { index: input.chunkIndex, sha256: chunkHash, byteLength: input.fileBuffer.length },
  };
  await saveState(nextState);
  return { receivedBytes: nextState.receivedBytes, fileSize: ticket.fileSize, complete: nextState.receivedBytes === ticket.fileSize };
}

export async function completeCurriculumPdfChunkUpload(input: { userId: number; uploadToken: string; sessionCookie?: string }) {
  const ticket = parseTicket(input.uploadToken, input.userId);
  const state = await readState(ticket);
  if (state.receivedBytes !== ticket.fileSize) {
    throw new Error(`Upload is incomplete: received ${state.receivedBytes} of ${ticket.fileSize} bytes.`);
  }
  const byteFile = bytesPath(ticket.uploadId);
  const fileInfo = await stat(byteFile).catch(() => null);
  if (!fileInfo || fileInfo.size !== ticket.fileSize) throw new Error("The assembled textbook file is incomplete. Restart the upload.");

  const fileBuffer = await readFile(byteFile);
  const source = await ingestPortalAdminCurriculumSource({
    curriculumSetId: ticket.curriculumSetId,
    fileName: ticket.fileName,
    mimeType: "application/pdf",
    fileBuffer,
    uploadedBy: input.userId,
    sessionCookie: input.sessionCookie,
  });
  await Promise.allSettled([rm(byteFile, { force: true }), rm(statePath(ticket.uploadId), { force: true })]);
  return source;
}

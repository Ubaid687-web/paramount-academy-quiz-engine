import { createWriteStream } from "node:fs";
import { open } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { storageRead, storagePut } from "./storage";

const MANIFEST_KIND = "paramount_chunked_pdf_v1";
const MAX_MANIFEST_BYTES = 1_000_000;

export type ChunkedPdfManifest = {
  kind: typeof MANIFEST_KIND;
  fileName: string;
  byteLength: number;
  contentHash: string;
  chunks: Array<{ key: string; byteLength: number }>;
};

async function fetchStoredBytes(key: string, maximumBytes: number) {
  const bytes = (await storageRead(key)).bytes;
  if (bytes.length > maximumBytes) throw new Error("A protected textbook object exceeded its safe size limit.");
  return bytes;
}

export async function storeChunkedPdfManifest(input: Omit<ChunkedPdfManifest, "kind">) {
  const manifest: ChunkedPdfManifest = { kind: MANIFEST_KIND, ...input };
  const encoded = JSON.stringify(manifest);
  if (Buffer.byteLength(encoded, "utf8") > MAX_MANIFEST_BYTES) throw new Error("The protected textbook manifest is unexpectedly large.");
  return storagePut(`curricula/manifests/${randomUUID()}.json`, encoded, "application/json");
}

export async function readChunkedPdfManifest(storageKey: string): Promise<ChunkedPdfManifest | null> {
  let bytes: Buffer;
  try {
    bytes = await fetchStoredBytes(storageKey, MAX_MANIFEST_BYTES);
  } catch {
    return null;
  }
  try {
    const parsed = JSON.parse(bytes.toString("utf8")) as ChunkedPdfManifest;
    if (parsed.kind !== MANIFEST_KIND || !Array.isArray(parsed.chunks) || !parsed.chunks.length || !Number.isSafeInteger(parsed.byteLength) || parsed.byteLength < 1) return null;
    if (!parsed.chunks.every((chunk) => typeof chunk.key === "string" && chunk.key.startsWith("curriculum-uploads/") && Number.isSafeInteger(chunk.byteLength) && chunk.byteLength > 0)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function writeStoredPdfToPath(storageKey: string, destinationPath: string) {
  const manifest = await readChunkedPdfManifest(storageKey);
  if (!manifest) {
    const bytes = await fetchStoredBytes(storageKey, 30 * 1024 * 1024);
    const output = await open(destinationPath, "w");
    try {
      await output.writeFile(bytes);
    } finally {
      await output.close();
    }
    return { byteLength: bytes.length, manifest: null };
  }

  const output = createWriteStream(destinationPath, { flags: "w" });
  let total = 0;
  try {
    for (const chunk of manifest.chunks) {
      const bytes = await fetchStoredBytes(chunk.key, chunk.byteLength);
      if (bytes.length !== chunk.byteLength) throw new Error("A protected textbook chunk is incomplete.");
      total += bytes.length;
      if (!output.write(bytes)) await once(output, "drain");
    }
    output.end();
    await once(output, "finish");
  } catch (error) {
    output.destroy();
    throw error;
  }
  if (total !== manifest.byteLength) throw new Error("The protected textbook manifest does not match its chunks.");
  return { byteLength: total, manifest };
}

export async function streamStoredPdfToResponse(storageKey: string, write: (chunk: Buffer) => Promise<void>) {
  const manifest = await readChunkedPdfManifest(storageKey);
  if (!manifest) {
    await write(await fetchStoredBytes(storageKey, 30 * 1024 * 1024));
    return null;
  }
  let total = 0;
  for (const chunk of manifest.chunks) {
    const bytes = await fetchStoredBytes(chunk.key, chunk.byteLength);
    if (bytes.length !== chunk.byteLength) throw new Error("A protected textbook chunk is incomplete.");
    total += bytes.length;
    await write(bytes);
  }
  if (total !== manifest.byteLength) throw new Error("The protected textbook manifest does not match its chunks.");
  return manifest;
}

import { get, put, del } from "@vercel/blob";

export type StoredObject = { key: string; url: string };

function normalizeKey(relKey: string) {
  const key = relKey.replace(/^\/+/, "");
  if (!key || key.includes("..") || /[\u0000-\u001f]/.test(key)) {
    throw new Error("Invalid storage key.");
  }
  return key;
}

function storageRouteUrl(key: string) {
  return `/api/storage?key=${encodeURIComponent(key)}`;
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<StoredObject> {
  const key = normalizeKey(relKey);
  const body = typeof data === "string" || Buffer.isBuffer(data) ? data : Buffer.from(data);
  const blob = await put(key, body, {
    access: "private",
    contentType,
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  return { key, url: storageRouteUrl(blob.pathname) };
}

export async function storageRead(relKey: string): Promise<{ key: string; contentType: string; bytes: Buffer }> {
  const key = normalizeKey(relKey);
  const result = await get(key, { access: "private" });
  if (!result || result.statusCode !== 200) throw new Error("Stored object is unavailable.");
  return {
    key,
    contentType: result.blob.contentType || "application/octet-stream",
    bytes: Buffer.from(await new Response(result.stream).arrayBuffer()),
  };
}

export async function storageGet(relKey: string): Promise<StoredObject> {
  const key = normalizeKey(relKey);
  return { key, url: storageRouteUrl(key) };
}

export async function storageDelete(relKey: string) {
  await del(normalizeKey(relKey));
}

export function storageKeyFromRequest(value: string | undefined) {
  return value ? normalizeKey(value) : null;
}

export async function storageStream(relKey: string, ifNoneMatch?: string | null) {
  const key = normalizeKey(relKey);
  return get(key, { access: "private", ifNoneMatch: ifNoneMatch ?? undefined });
}

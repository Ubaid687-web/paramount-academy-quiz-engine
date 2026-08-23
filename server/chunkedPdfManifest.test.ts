import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const mocks = vi.hoisted(() => ({ storageGet: vi.fn(), storagePut: vi.fn(), objects: new Map<string, Buffer>() }));

vi.mock("./storage", () => ({ storageGet: mocks.storageGet, storagePut: mocks.storagePut }));

import { readChunkedPdfManifest, storeChunkedPdfManifest, writeStoredPdfToPath } from "./chunkedPdfManifest";

describe("chunked PDF manifest storage", () => {
  beforeEach(() => {
    mocks.objects.clear();
    mocks.storageGet.mockImplementation(async (key: string) => ({ key, url: `memory://${key}` }));
    mocks.storagePut.mockResolvedValue({ key: "curricula/manifests/test.json", url: "memory://curricula/manifests/test.json" });
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      const bytes = mocks.objects.get(url.replace("memory://", ""));
      return new Response(bytes, {
        status: bytes ? 200 : 404,
        headers: bytes ? { "content-length": String(bytes.length) } : undefined,
      });
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("rejects malformed manifest chunk references rather than treating arbitrary stored JSON as a textbook", async () => {
    mocks.objects.set("curricula/manifests/invalid.json", Buffer.from(JSON.stringify({
      kind: "paramount_chunked_pdf_v1",
      fileName: "book.pdf",
      byteLength: 5,
      contentHash: "a".repeat(64),
      chunks: [{ key: "untrusted/object", byteLength: 5 }],
    })));

    await expect(readChunkedPdfManifest("curricula/manifests/invalid.json")).resolves.toBeNull();
  });

  it("writes stored chunks in order without assembling the entire PDF in application memory", async () => {
    const manifestKey = "curricula/manifests/source.json";
    mocks.objects.set(manifestKey, Buffer.from(JSON.stringify({
      kind: "paramount_chunked_pdf_v1",
      fileName: "grade-9-chemistry.pdf",
      byteLength: 9,
      contentHash: "a".repeat(64),
      chunks: [
        { key: "curriculum-uploads/upload/chunks/0", byteLength: 5 },
        { key: "curriculum-uploads/upload/chunks/1", byteLength: 4 },
      ],
    })));
    mocks.objects.set("curriculum-uploads/upload/chunks/0", Buffer.from("%PDF-"));
    mocks.objects.set("curriculum-uploads/upload/chunks/1", Buffer.from("book"));
    const directory = await mkdtemp(path.join(os.tmpdir(), "paramount-manifest-test-"));
    const outputPath = path.join(directory, "source.pdf");

    try {
      await expect(writeStoredPdfToPath(manifestKey, outputPath)).resolves.toMatchObject({ byteLength: 9 });
      await expect(readFile(outputPath)).resolves.toEqual(Buffer.from("%PDF-book"));
      expect(mocks.storageGet.mock.calls.map(([key]) => key)).toEqual([
        manifestKey,
        "curriculum-uploads/upload/chunks/0",
        "curriculum-uploads/upload/chunks/1",
      ]);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("enforces the existing 30 MB non-manifest fallback cap before reading an object body", async () => {
    mocks.storageGet.mockResolvedValue({ key: "legacy/too-large.pdf", url: "memory://legacy/too-large.pdf" });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, {
      status: 200,
      headers: { "content-length": String((30 * 1024 * 1024) + 1) },
    })));
    const directory = await mkdtemp(path.join(os.tmpdir(), "paramount-manifest-test-"));

    try {
      await expect(writeStoredPdfToPath("legacy/too-large.pdf", path.join(directory, "source.pdf"))).rejects.toThrow("safe size limit");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("stores a bounded JSON manifest separately from the PDF chunks", async () => {
    await storeChunkedPdfManifest({
      fileName: "grade-9-chemistry.pdf",
      byteLength: 5,
      contentHash: "a".repeat(64),
      chunks: [{ key: "curriculum-uploads/upload/chunks/0", byteLength: 5 }],
    });

    expect(mocks.storagePut).toHaveBeenCalledWith(expect.stringMatching(/^curricula\/manifests\/.+\.json$/), expect.any(String), "application/json");
  });
});

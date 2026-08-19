import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ storageGet: vi.fn() }));
vi.mock("./storage", () => ({ storageGet: mocks.storageGet }));

import { renderOcrReviewPage } from "./ocrReviewRoute";

describe("OCR review page renderer", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns the original photographed page only for its single valid page number", async () => {
    mocks.storageGet.mockResolvedValue({ url: "https://storage.example/source.jpg" });
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => Promise.resolve(new Response(new Uint8Array([1, 2, 3]), { status: 200 }))));

    await expect(renderOcrReviewPage({ storageKey: "private/source.jpg", mimeType: "image/jpeg", pageNumber: 1 })).resolves.toMatchObject({ contentType: "image/jpeg", bytes: expect.any(Buffer) });
    await expect(renderOcrReviewPage({ storageKey: "private/source.jpg", mimeType: "image/jpeg", pageNumber: 2 })).rejects.toThrow("one reviewable page only");
  });
});

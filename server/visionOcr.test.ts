import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const generateTextMock = vi.fn();

vi.mock("ai", () => ({
  generateText: (...args: unknown[]) => generateTextMock(...args),
}));

import { isVisionOcrConfigured, runVisionOcr, visionOcrModel, DEFAULT_VISION_OCR_MODEL } from "./visionOcr";

const originalEnv = { ...process.env };

beforeEach(() => {
  generateTextMock.mockReset();
  process.env = { ...originalEnv };
});

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("visionOcrModel", () => {
  it("defaults to the bundled model and honours an override", () => {
    delete process.env.VISION_OCR_MODEL;
    expect(visionOcrModel()).toBe(DEFAULT_VISION_OCR_MODEL);
    process.env.VISION_OCR_MODEL = "google/gemini-3.8-flash";
    expect(visionOcrModel()).toBe("google/gemini-3.8-flash");
  });
});

describe("isVisionOcrConfigured", () => {
  it("is false without gateway credentials", () => {
    delete process.env.AI_GATEWAY_API_KEY;
    delete process.env.VERCEL_OIDC_TOKEN;
    expect(isVisionOcrConfigured()).toBe(false);
  });

  it("is true with either an explicit key or an injected OIDC token", () => {
    delete process.env.VERCEL_OIDC_TOKEN;
    process.env.AI_GATEWAY_API_KEY = "test-key";
    expect(isVisionOcrConfigured()).toBe(true);

    delete process.env.AI_GATEWAY_API_KEY;
    process.env.VERCEL_OIDC_TOKEN = "test-oidc";
    expect(isVisionOcrConfigured()).toBe(true);
  });
});

describe("runVisionOcr", () => {
  it("returns cleaned transcript text", async () => {
    generateTextMock.mockResolvedValue({ text: "Question 1\nWhat is photosynthesis?\u0000" });
    const text = await runVisionOcr({ data: new Uint8Array([1, 2, 3]), mediaType: "application/pdf" });
    expect(text).toBe("Question 1\nWhat is photosynthesis?");
  });

  it("maps the no-text sentinel to an empty string", async () => {
    generateTextMock.mockResolvedValue({ text: "[NO_TEXT]" });
    const text = await runVisionOcr({ data: new Uint8Array([1]), mediaType: "application/pdf" });
    expect(text).toBe("");
  });

  it("sends the document as a file part alongside the instruction", async () => {
    generateTextMock.mockResolvedValue({ text: "ok" });
    const data = new Uint8Array([9, 9, 9]);
    await runVisionOcr({ data, mediaType: "image/png" });

    const call = generateTextMock.mock.calls[0][0];
    expect(call.temperature).toBe(0);
    const filePart = call.messages[0].content.find((part: { type: string }) => part.type === "file");
    expect(filePart).toMatchObject({ type: "file", data, mediaType: "image/png" });
  });
});

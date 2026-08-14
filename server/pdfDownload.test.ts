// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { downloadPdfFile } from "../client/src/lib/pdfDownload";

describe("PDF download delivery", () => {
  afterEach(() => {
    vi.useRealTimers();
    document.body.replaceChildren();
    vi.restoreAllMocks();
  });

  it("attaches a PDF download anchor and delays Blob URL cleanup for mobile browsers", () => {
    vi.useFakeTimers();
    const createObjectUrl = vi.fn(() => "blob:quiz-paper");
    const revokeObjectUrl = vi.fn();
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createObjectUrl });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: revokeObjectUrl });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

    const fileName = downloadPdfFile("JVBERi0xLjQ=", "physics-paper.pdf");

    expect(fileName).toBe("physics-paper.pdf");
    expect(createObjectUrl).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    expect(document.querySelector('a[download="physics-paper.pdf"]')).not.toBeNull();
    expect(revokeObjectUrl).not.toHaveBeenCalled();

    vi.advanceTimersByTime(60_000);
    expect(document.querySelector('a[download="physics-paper.pdf"]')).toBeNull();
    expect(revokeObjectUrl).toHaveBeenCalledWith("blob:quiz-paper");
  });
});

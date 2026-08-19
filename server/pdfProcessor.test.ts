import { describe, expect, it } from "vitest";
import { validateExtractedPdfText } from "./pdfProcessor";

describe("PDF extraction quality validation", () => {
  it("accepts a text-rich PDF extraction suitable for grounded quiz generation", () => {
    const extractedText = "Kinematics studies displacement, velocity, and acceleration. ".repeat(80);
    expect(() => validateExtractedPdfText(extractedText, 12, "physics.pdf")).not.toThrow();
  });

  it("rejects image-based or watermark-only extractions before they reach the generator", () => {
    const watermarkOnlyText = "www.example.com ".repeat(100);
    expect(() => validateExtractedPdfText(watermarkOnlyText, 120, "scanned-book.pdf")).toThrow(/scanned or image-based/i);
  });

  it("accepts a text-rich Urdu PDF extraction as readable source material", () => {
    const urduText = "حرکت، فاصلہ، وقت اور رفتار طبیعیات کے بنیادی تصورات ہیں۔ ".repeat(90);
    expect(() => validateExtractedPdfText(urduText, 12, "urdu-physics.pdf")).not.toThrow();
  });
});

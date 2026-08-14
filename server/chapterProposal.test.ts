import { describe, expect, it } from "vitest";
import { proposeChaptersFromExtractedText } from "./chapterProposal";

const extractedText = `FBISE Physics Textbook
Introduction and published material for Grade 10 learners.

CHAPTER 1: SIMPLE HARMONIC MOTION
Simple harmonic motion is a periodic motion. This supplied chapter section contains source-grounded definitions, equations, examples, and enough retained textbook detail for a reviewed chapter record. Teachers must not treat a proposal as approved until an administrator saves it.

CHAPTER 2: SOUND
Sound is produced by vibrating bodies. This supplied chapter section contains definitions, examples, applications, and enough retained textbook detail for a separate reviewed chapter record. It is bounded by the next explicit textbook heading only.`;

describe("proposeChaptersFromExtractedText", () => {
  it("proposes sequential review records only from explicit textbook chapter headings", () => {
    const proposals = proposeChaptersFromExtractedText(extractedText);

    expect(proposals).toHaveLength(2);
    expect(proposals[0]).toMatchObject({ sequence: 1, code: "Ch. 1", title: "SIMPLE HARMONIC MOTION" });
    expect(proposals[1]).toMatchObject({ sequence: 2, code: "Ch. 2", title: "SOUND" });
    expect(proposals[0].contentText).toContain("CHAPTER 1: SIMPLE HARMONIC MOTION");
    expect(proposals[0].contentText).not.toContain("CHAPTER 2: SOUND");
  });

  it("refuses to invent chapters when extracted textbook text has no explicit headings", () => {
    const headingFreeText = "A".repeat(520) + " This long extracted source includes ordinary explanatory prose but no chapter or unit heading that can justify a reliable boundary.";
    expect(() => proposeChaptersFromExtractedText(headingFreeText)).toThrow("No explicit CHAPTER or UNIT headings");
  });
});

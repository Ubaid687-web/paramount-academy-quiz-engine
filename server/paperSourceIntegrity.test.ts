import { describe, expect, it } from "vitest";
import { findSubstantiallyOverlappingPaperSource } from "./paperSourceIntegrity";

describe("paper source integrity", () => {
  it("flags a section transcript substantially contained in a complete paper transcript for the same year", () => {
    const sectionText = "SECTION B marks 33 answer the following parts briefly alpha particle scatter experiment electric field transverse wave calculate electricity bill state lenz law".repeat(4);

    expect(findSubstantiallyOverlappingPaperSource({
      extractedText: sectionText,
      academicYear: "2026",
      candidates: [{ id: 60001, academicYear: "2026", originalFileName: "physics-2026-evening.txt", extractedText: `Complete paper ${sectionText} Section C marks 20` }],
    })).toMatchObject({ id: 60001 });
  });
});

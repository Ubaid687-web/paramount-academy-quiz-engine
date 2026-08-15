import { describe, expect, it } from "vitest";
import { buildComputerScienceChronologyGuidance } from "./computerScienceChronologyGuidance";

describe("Computer Science chronological preparation guidance", () => {
  it("is isolated to Computer Science and preserves the textbook-only factual boundary", () => {
    expect(buildComputerScienceChronologyGuidance("physics")).toBe("");
    const guidance = buildComputerScienceChronologyGuidance("computer_science");
    expect(guidance).toContain("two neutral 2025 PDF variants");
    expect(guidance).toContain("Before using a second conversion");
    expect(guidance).toContain("only factual authority");
    expect(guidance).toContain("Never copy, lightly paraphrase, rank, or predict");
  });
});

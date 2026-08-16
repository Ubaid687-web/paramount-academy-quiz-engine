import { describe, expect, it } from "vitest";
import { analyzeContent } from "./contentAnalyzer";

describe("content analyzer topic capacity", () => {
  it("exposes a conservative topic count derived from analyzed source structure", () => {
    const source = [
      "# Motion",
      "Velocity is the rate of change of displacement. ".repeat(10),
      "# Energy",
      "Energy is the capacity to do work. ".repeat(10),
    ].join("\n");

    const analysis = analyzeContent(source);

    expect(analysis.topicCount).toBeGreaterThanOrEqual(1);
    expect(analysis.topicCount).toBe(Math.max(1, analysis.keyTopics.length, analysis.sections.length));
  });
});


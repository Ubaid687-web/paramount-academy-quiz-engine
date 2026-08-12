import { describe, expect, it } from "vitest";
import { GENERATION_STEPS, getGenerationStep, getNextSimulatedProgress } from "../client/src/lib/generation-progress";

describe("generation progress feedback", () => {
  it("selects the appropriate visible stage for each generation threshold", () => {
    expect(getGenerationStep(0)).toEqual(GENERATION_STEPS[0]);
    expect(getGenerationStep(16)).toEqual(GENERATION_STEPS[1]);
    expect(getGenerationStep(61)).toEqual(GENERATION_STEPS[2]);
    expect(getGenerationStep(62)).toEqual(GENERATION_STEPS[3]);
    expect(getGenerationStep(100)).toEqual(GENERATION_STEPS[4]);
  });

  it("keeps simulated progress moving without claiming completion before the server returns", () => {
    expect(getNextSimulatedProgress(8)).toBe(14);
    expect(getNextSimulatedProgress(40)).toBe(43);
    expect(getNextSimulatedProgress(80)).toBe(81);
    expect(getNextSimulatedProgress(92)).toBe(92);
    expect(getNextSimulatedProgress(100)).toBe(100);
  });

  it("handles out-of-range values safely when selecting an accessible progress stage", () => {
    expect(getGenerationStep(-10)).toEqual(GENERATION_STEPS[0]);
    expect(getGenerationStep(300)).toEqual(GENERATION_STEPS[4]);
  });
});

import { describe, expect, it } from "vitest";
import { TRANSIENT_GENERATION_RETENTION_MS, transientGenerationRetentionDeadline } from "./db";

describe("transient generation retention", () => {
  it("assigns every transient generation artifact the documented 30-day deadline", () => {
    const startedAt = Date.UTC(2026, 7, 1, 12, 30, 0);
    expect(transientGenerationRetentionDeadline(startedAt).getTime()).toBe(startedAt + TRANSIENT_GENERATION_RETENTION_MS);
    expect(TRANSIENT_GENERATION_RETENTION_MS).toBe(30 * 24 * 60 * 60 * 1000);
  });
});

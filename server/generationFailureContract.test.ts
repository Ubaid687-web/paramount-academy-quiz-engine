import { describe, expect, it } from "vitest";

describe("generation failure contract", () => {
  it("documents the structured failure fields required by the client workflow", () => {
    const failureDraft = {
      status: "error",
      errorType: "validation",
      message: "Generated draft failed validation.",
      safeRetryAdvice: "Check the source text and try again.",
    };

    expect(failureDraft).toEqual({
      status: "error",
      errorType: expect.stringMatching(/validation|source_quality|schema|generation|timeout/),
      message: expect.any(String),
      safeRetryAdvice: expect.any(String),
    });
  });
});

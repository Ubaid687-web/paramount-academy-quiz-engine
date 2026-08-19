import { describe, expect, it } from "vitest";

const runLiveCredentialValidation = process.env.RUN_GEMINI_SECRET_VALIDATION === "1";

describe("Gemini fallback credential", () => {
  it.skipIf(!runLiveCredentialValidation)("authorizes a lightweight server-side models request", async () => {
    const apiKey = process.env.GEMINI_API_KEY;
    expect(apiKey).toBeTruthy();

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models", {
      headers: { "x-goog-api-key": apiKey! },
    });

    expect(response.ok).toBe(true);
    const body = await response.json() as { models?: unknown[] };
    expect(Array.isArray(body.models)).toBe(true);
  }, 20_000);

  it.skipIf(!runLiveCredentialValidation)("accepts the fallback transport's structured-output request shape", async () => {
    const apiKey = process.env.GEMINI_API_KEY;
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": apiKey! },
      body: JSON.stringify({
        model: "gemini-3.6-flash",
        input: "Return the JSON object {\"ok\":true}.",
        store: false,
        response_format: {
          type: "text",
          mime_type: "application/json",
          schema: {
            type: "object",
            properties: { ok: { type: "boolean" } },
            required: ["ok"],
            additionalProperties: false,
          },
        },
      }),
    });

    const responseText = await response.text();
    expect(response.ok, responseText).toBe(true);
    const body = JSON.parse(responseText) as { output_text?: string; steps?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }> };
    const outputText = body.output_text ?? body.steps?.filter((step) => step.type === "model_output").flatMap((step) => step.content ?? []).find((content) => content.type === "text")?.text;
    expect(outputText, responseText).toBeTruthy();
    expect(JSON.parse(outputText ?? "{}")).toEqual({ ok: true });
  }, 40_000);
});

import { generateText } from "ai";

/**
 * Self-owned OCR engine for scanned pages. Sends each page to a Gemini vision
 * model through the Vercel AI Gateway (a plain `provider/model` string is routed
 * by the gateway automatically). This replaces the tesseract + poppler native
 * binaries, which cannot run on serverless hosts, and reads Urdu + English
 * scanned textbook pages far more accurately than tesseract at low DPI.
 */

export const DEFAULT_VISION_OCR_MODEL = "google/gemini-2.5-pro";

export function visionOcrModel() {
  return process.env.VISION_OCR_MODEL?.trim() || DEFAULT_VISION_OCR_MODEL;
}

/**
 * Vision OCR is only used when the AI Gateway can authenticate. On Vercel/v0 the
 * OIDC token is injected automatically; elsewhere an explicit gateway key is
 * required. When neither is present the pipeline falls back to tesseract, so an
 * existing container deployment keeps working unchanged.
 */
export function isVisionOcrConfigured() {
  return Boolean(process.env.AI_GATEWAY_API_KEY?.trim() || process.env.VERCEL_OIDC_TOKEN?.trim());
}

const NO_TEXT_SENTINEL = "[NO_TEXT]";

const OCR_INSTRUCTION = [
  "You are a precise OCR engine for scanned school textbook pages from a Pakistani board curriculum.",
  "A page may contain Urdu (right-to-left) and English text, sometimes mixed on the same line.",
  "Transcribe every readable character exactly as printed, in natural reading order.",
  "Rules:",
  "- Keep Urdu in Urdu script and English in English. Never translate or romanize.",
  "- Preserve headings, question numbers, list markers, and line breaks.",
  "- Render tables row by row with cells separated by ' | '.",
  "- Do not add commentary, explanations, or markdown code fences.",
  `- If the page has no readable text (blank page, or a pure image/figure), output exactly ${NO_TEXT_SENTINEL}.`,
  "Output only the transcribed text.",
].join("\n");

/**
 * Run vision OCR on a single rendered page (a 1-page PDF or an image). Returns
 * the transcript, or an empty string when the model reports no readable text.
 */
export async function runVisionOcr(input: { data: Uint8Array; mediaType: string; signal?: AbortSignal }): Promise<string> {
  const { text } = await generateText({
    model: visionOcrModel(),
    temperature: 0,
    maxRetries: 2,
    abortSignal: input.signal ?? AbortSignal.timeout(90_000),
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: OCR_INSTRUCTION },
          { type: "file", data: input.data, mediaType: input.mediaType },
        ],
      },
    ],
  });

  const cleaned = text.replace(/\u0000/g, "").replace(/\r\n/g, "\n").trim();
  if (!cleaned || cleaned === NO_TEXT_SENTINEL) return "";
  return cleaned;
}

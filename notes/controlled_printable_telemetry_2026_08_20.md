# Controlled Printable Generation Telemetry — 20 August 2026

## Scope and outcome

This record covers the completed user-created printable draft **Paper 01**. It is evidence only; it does not change prompting, source scope, validation, retries, caching, or provider settings.

| Measure | Recorded value |
| --- | --- |
| Generation job | `1320001` |
| Draft | `1` — *Paper 01* |
| Mode | Short-question printable paper |
| Source scope | One approved Grade 10 Chemistry chapter: Unit 02, *Matter* (`90002`) |
| Printed structure | Five numbered 3-mark OR pairs; ten individual prompts; 15 total marks |
| Provider route | Gemini BYOK fallback after managed-provider `quota_exhaustion` |
| Cache result | New generation; no exact-result cache hit |
| Retries | Managed: 0; Gemini: 0; aggregate: 0 |
| Provider-reported input tokens | 4,551 |
| Provider-reported output tokens | 3,222 |
| Provider-reported cached tokens | 0 |
| Provider-reported total tokens | 14,714 |
| Failure evidence | None; job status is completed |

## Timing evidence

The job was created at **08:50:34 UTC** and its saved assessment draft was created at **08:52:02 UTC**, giving an observed upper bound of **88 seconds** from job creation to persisted draft. The legacy job record does not have a `completedAt` timestamp, so this is not claimed as an exact model-call duration.

## Interpretation

The completed run verifies that the fallback route, source-scoped printable path, and token telemetry all record data. It does **not** justify changing output limits: one successful 10-prompt run is not enough evidence to determine a safe limit, particularly because the subsequent quality calibration intentionally adds exact source excerpts and stronger validation. Any output-limit change still requires a separate Portal Admin decision after more successful, post-calibration measurements.

## Computer Science Unit 1 printable paper — measured 20 August 2026

The uploaded `Paper 01` also corresponds to completed generation job `1410001`. It used the approved Grade 10 Computer Science Unit 1 — *Computer Systems* scope (`chapterId 60001`) and produced ten numbered OR pairs. The configured Gemini fallback completed this new request with no retry and no exact-result cache reuse.

| Measure | Recorded value |
| --- | --- |
| Source scope | Full approved Unit 1 — *Computer Systems* (80,714 source characters) |
| Printed structure | Ten numbered 3-mark OR pairs; twenty individual prompts; 30 attempted marks |
| Provider route | Gemini BYOK fallback |
| Retries | Managed: 0; Gemini: 0 |
| Provider-reported input tokens | 15,936 |
| Provider-reported output tokens | 7,811 |
| Provider-reported cached tokens | 0 |
| Provider-reported total tokens | 41,041 |
| Cache result | New generation; no exact-result cache hit |
| Failure evidence | None; job status is completed |

The record has no `completedAt` timestamp, so elapsed duration cannot be stated honestly. This result proves the fallback can complete a substantial source-grounded request after the quality safeguards were introduced. It still does not justify tightening output limits: it is a full-chapter, ten-pair request, rather than a like-for-like small controlled comparison, and provider-reported total token accounting is higher than visible input plus output. Output limits remain deferred pending Portal Admin approval and more completed post-calibration measurements.

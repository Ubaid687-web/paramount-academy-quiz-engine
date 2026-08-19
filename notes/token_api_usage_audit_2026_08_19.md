# Paramount Academy Quiz Engine — Token and API Usage Audit

**Status:** Report only. No generation prompt, provider setting, source-selection rule, output limit, validation rule, cache behavior, or production workflow was changed as part of this audit.

## Executive conclusion

The system already protects quality in several important ways: textbook scope resolution is server-side, exact-result reuse is user-scoped, generation output is schema-validated, and concept, facet, answer-target, citation, and prior-paper checks run after generation. Those controls must remain intact.

Two findings deserve attention, but only one is a candidate for later implementation without prior Portal Admin review. **Token visibility** is an additive, low-risk observability improvement. By contrast, the current large-source representation is **not semantically targeted**; it is deterministic breadth sampling. Reducing it further would be unsafe. An accuracy-first source selector should be designed before considering any additional source-token reduction.

| Priority | Finding | Decision in this audit |
| --- | --- | --- |
| High | Large-source excerpt selection is not semantic-topic selection. | Do not reduce the cap. Plan an accuracy-first source-span selector before any token-cutting change. |
| High | Actual provider token usage is not persisted or visible to Portal Admin. | Recommended as an additive future change; do not implement until approved. |
| Medium | Managed-provider output budget is globally fixed at 32,768 tokens. | Do not tighten yet; instrument first, then establish empirical safe floors by task type. |
| Medium | Gemini Interactions can use implicit caching, but the current stateless path cannot use explicit cache objects. | Retain the current privacy-safe stateless approach; do not migrate API families solely for caching. |
| Low | No accidental duplicate MCQ generation calls were found. | Preserve current retry and printable batching behavior. |

## Guardrails preserved by this audit

The following rules are explicitly **out of scope for token savings**. No recommendation below authorizes weakening or bypassing them: textbook-only factual grounding, strict structured-output validation, source citations, concept/facet/answer-target diversity checks, earlier-paper exclusion, safe retry policy, and exact-result cache correctness.

## 1. Repeated static content and provider caching

The application rebuilds a fixed FBISE system instruction block and a bounded shared style anchor for every request. MCQ calls also carry citation instructions and a prior-paper exclusion block. Printable generation repeats its fixed printable prompt, the style anchor, source title, prior-paper exclusion block, and selected source sections for every bounded batch.

The direct Gemini fallback uses Google’s **Interactions API** with `store: false`. Google documents that this API supports **implicit caching only**; it does not expose explicit, application-managed cache objects. Gemini 3.6 Flash enables implicit caching at 4,096 input tokens and reports cache-hit tokens through response usage when available. Google recommends placing common large material at the prompt beginning and keeping a similar prefix across nearby requests. [1]

The current Gemini request already begins with system text, so it may receive implicit-cache savings when the input is large enough and its prefix remains stable. However, this cannot be guaranteed or controlled from the application. The system instruction plus style anchor may not always reach the 4,096-token threshold before variable request material begins. The app also intentionally uses `store: false`; moving to `previous_interaction_id` would require stored conversations and changes the current stateless privacy boundary. Google states that explicit cache management is unavailable in the Interactions API. [1] [2]

The managed provider has no prompt-caching control exposed through the project’s `invokeLLM` request type. Therefore, there is **no verified, safe explicit-cache implementation to add today**. Migrating Gemini to another API family merely for explicit caching would add provider and data-retention complexity, so it is rejected for now.

### Practical implicit-cache guidance

Implicit caching means repeated content **may** be discounted when the provider identifies a qualifying shared prefix; it is not an application-controlled promise. The practical, safeguard-preserving approach is to keep a stable static prefix before request-specific material, keep the full style anchor intact, and avoid changing its wording or ordering unnecessarily. The current Gemini transport already assembles one stable system-text prefix before the request conversation, so no prompt reordering is justified now. Token telemetry will distinguish actual Gemini cache-hit tokens from requests where the provider did not report a hit. The app will not sacrifice the current stateless `store: false` boundary merely to chase potentially higher cache-hit rates.

## 2. Source excerpt selection

The 24,000-character MCQ cap does **not** rank source passages by semantic relevance. When a source is oversized, the implementation splits it into paragraphs or approximate sections and samples evenly from beginning to end. This improves breadth over a blind prefix truncation, but it can still omit the passage that best supports a particular assessable concept.

Printable generation has a similar limitation. It divides source text into equal word chunks, keeps up to six chunks, and takes the first 1,500 characters of each. This is deterministic coverage sampling, not relevance-aware selection.

> **Decision:** Do not lower the 24,000-character cap or reduce printable source sections. Doing so would increase the chance that a question is generated from an incomplete or less-relevant textbook context.

The correct future project is not “smaller prompts”; it is an **accuracy-first source-span selector**. It should work only from the approved scope snapshot and textbook structure, retain page/chapter provenance, preserve coverage across selected chapters, and be evaluated against a reviewed set of generated questions before it replaces the present breadth sampler. A generic embedding retrieval layer is not recommended yet because it would add infrastructure, ranking uncertainty, and new failure modes without first proving a benefit for the existing structured curriculum data.

## 3. Output length limits

The managed provider currently sends `max_tokens: 32768` and a 128-token thinking budget on every request. Although the shared request type exposes per-call `maxTokens` fields, the transport does not apply them; both MCQ and printable calls therefore use the same global ceiling. The Gemini fallback does not set an output-token ceiling and relies on the provider default plus strict JSON-schema validation.

No historical output-token data is stored, so there is no evidence-based safe value to set for a 10-MCQ paper, a short-question OR-pair batch, or a long-question OR-pair batch. Tightening these ceilings now could produce truncated JSON or incomplete answer material, increasing retries and harming reliability.

> **Decision:** Do not change output limits now. First add actual input/output token telemetry. Then review successful output distributions by mode and establish conservative task-specific ceilings with a safety margin, retaining schema validation and a clear incomplete-output failure path.

## 4. Redundant model calls

No accidental duplicate model call was found in the normal MCQ path. After an exact-result cache check, MCQ generation makes one provider request. Deterministic content analysis, scope resolution, citation hydration, validation, diversity checks, and PDF rendering do not make additional model calls.

Printable papers make one provider request for each bounded OR-pair batch. The current maximum is four pairs per batch, so a 10-pair paper uses three normal model calls rather than five. Additional calls occur only when a provider retry is required or a batch fails its necessary schema/diversity checks. Those are quality and reliability controls and should remain.

> **Decision:** Do not force all printable pairs into one large request. That could increase malformed or incomplete structured output and trigger more retries. Current bounded batching is aligned with reliability and has already reduced normal call count.

## 5. Token-usage visibility

The direct Gemini transport reads provider usage when supplied, and the managed-provider response type can also contain token usage. However, current generation telemetry drops that data. The database stores provider name, fallback use, retry counts, cache hits, full-source characters, and sent-input-character proxies—but no input, output, cached, or total provider tokens. Portal Admin history therefore cannot measure quota consumption; it can only show approximate character volume.

An additive implementation is feasible and does not require changing output quality rules. It should store nullable, provider-reported values per generation job:

| Proposed field | Meaning | Integrity rule |
| --- | --- | --- |
| `providerInputTokens` | Sum of actual input tokens reported by the provider across successful batches. | Show “not reported” when absent; do not estimate it as actual. |
| `providerOutputTokens` | Sum of actual output tokens reported by the provider across successful batches. | Preserve raw provider value only. |
| `providerCachedTokens` | Gemini implicit-cache-hit tokens when reported. | Keep separate from total input; absent does not mean zero. |
| `providerTotalTokens` | Provider-reported total tokens, when available. | Preserve raw provider semantics; do not reconstruct from characters. |
| `generationMode` | MCQ, short, or long. | Needed to compare like-for-like usage in Portal Admin history. |

For printable papers, the job must aggregate usage across all successful batches. A cache-reused request should display zero **new model calls** but retain historical provider usage as unavailable unless it was captured in the original cached payload. Failed calls should remain visibly unreported rather than inventing a token value.

## Evidence snapshot

The last 30 days of `generationJobs` include 39 records. Their stored average input-character proxy is 2,120 for managed-provider records and 2,425 for the one successful Gemini fallback record. These are **not token counts**. The historical sample recorded no exact-cache hits and 17 managed-provider failures, but this does not establish cache quality or provider cost; actual token telemetry is absent.

## Recommended sequence for Portal Admin approval

| Order | Proposed work | Why it preserves the project core |
| --- | --- | --- |
| 1 | Add actual provider-token and cache-hit telemetry to generation jobs and Portal Admin history. | Observation only; it does not alter source material, prompts, validation, or output. |
| 2 | Collect successful-token distributions by mode and pair/question count. | Establishes evidence before changing any output ceiling. |
| 3 | Design and test an approved-scope, provenance-preserving source-span selector. | Fixes source relevance before any further reduction in source prompt size. |
| 4 | Consider task-specific output ceilings only after steps 1–2 show safe margins. | Prevents truncation-driven quality loss. |
| 5 | Revisit provider caching only if a provider exposes a privacy-compatible, verified explicit-cache contract. | Avoids altering the current stateless safety boundary for speculative savings. |

## Rejected or deferred proposals

The following are not recommended now: removing the style anchor, shortening validation prompts, deleting prior-paper exclusions, combining all printable batches into one large call, reducing source text before relevance selection exists, or setting arbitrary output limits. Each would either weaken the project’s safety model or risk poorer assessment quality.

## References

[1] [Google Gemini API — Context caching](https://ai.google.dev/gemini-api/docs/caching)

[2] [Google Gemini API — Interactions API overview](https://ai.google.dev/gemini-api/docs/interactions-overview)

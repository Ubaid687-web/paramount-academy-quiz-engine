# Progressive Printable Paper Workflow — Design Record

## Decision

Large printable-paper requests will not rely on one long-lived HTTP request. Instead, the teacher’s browser will advance a persisted generation job through bounded four-pair batches. Each request handles one batch, records the validated partial result, returns promptly, and allows the next batch to begin only after the previous one has passed the same source, schema, OR-pair, concept-diversity, and prior-paper exclusion checks.

This design is preferred over a single 10-pair structured request because it avoids gateway timeouts while retaining the existing bounded output contract. It is also preferred over background execution because the current autoscaled environment does not guarantee that a process remains alive after an HTTP response has been returned.

## Source Authority and Safety Invariants

| Invariant | Progressive workflow treatment |
|---|---|
| Textbook-only factual authority | The immutable approved-scope source snapshot and resolved source text are stored at job creation and reused for every batch. |
| Paper-pattern role | The shared FBISE style anchor remains format-only and is attached to every batch. |
| Prior-paper exclusion | Each batch receives prior history plus all already accepted partial prompts. |
| Concept diversity | Each batch validates OR alternatives and then validates against all persisted partial prompts before it is saved. |
| Exact-result cache | Cache lookup remains first; a cached full result requires no provider calls. Partial results are never served as a completed paper. |
| Failure safety | No assessment draft exists until every batch has completed and full-paper validation succeeds. |

## Request Lifecycle

| Stage | Request | Teacher feedback | Persisted state |
|---|---|---|---|
| Start | `startPrintableGeneration` | “Preparing approved scope” | Immutable source snapshot, batch plan, request parameters, `0 / total` verified pairs |
| Batch | `advancePrintableGeneration` | “Generating and verifying pairs 1–4 of 10” | Validated partial items, provider telemetry, completed pairs, progress |
| Resume | Same advance request after a temporary failure | “Resume from 4 of 10 verified pairs” | Existing validated partial items remain intact; no completed batch is regenerated |
| Finalise | Last batch completion | “Final validation and paper draft” | Full payload, cache entry, assessment draft, `100%` progress |

## Truthful Timing and Progress

The UI will not simulate 90–92% progress. It will show an exact completed-pairs count, the current bounded batch, and an intentionally broad estimated range based on the number of remaining batches. The wording will state that each batch must pass source and diversity checks before the paper continues. The system will never promise that a particular request will finish within a fixed number of minutes.

## Scope of the Next Implementation

The implementation requires additive job state for partial printable payloads and batch metadata, job-ownership checks on resume, one-batch generation extraction from the current printable generator, and mobile-friendly polling/advance behavior. It must not increase batch size, trim source authority, remove validation, or issue any partial paper to students.

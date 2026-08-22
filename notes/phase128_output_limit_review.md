# Phase 128 — Output-Limit Review

## Measured Evidence

Recent completed printable jobs show one Gemini-fallback long-paper run using approximately **7,277 input tokens** and **5,545 output tokens**, plus two completed short-paper runs averaging approximately **10,244 input tokens** and **5,517 output tokens**. Earlier failed short-paper attempts have no provider output token value, so they cannot establish a safe lower completion ceiling.

The codebase has no separate hard-coded printable `max_tokens` or output-limit override to tune. Current printable limits instead arise from source-selection, batch design, structured validation, and provider response behavior.

## Decision

**Retain all current output limits and safeguards.** There is no evidence that a lower output ceiling would preserve complete, evidence-grounded printable questions and solution keys; a speculative cap could truncate OR pairs, solution steps, citations, or diagrams. There is also no evidence that increasing any limit is necessary before the controlled smallest-scope verification.

The next test therefore uses the smallest approved active Grade 10 scope and measures actual completion, provider routing, and persisted telemetry. No prompt, citation, diversity, cache, or source-grounding policy is relaxed.

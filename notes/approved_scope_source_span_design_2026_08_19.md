# Approved-Scope Source-Span Selector — Design Assessment

**Status:** Design assessed only. No source-budget, prompt, retrieval, citation, validation, cache, or provider behavior changed.

## Decision

The existing 24,000-character MCQ budget and printable source chunking will remain unchanged until real token telemetry exists. Reducing either now would be premature. The current system has a safe foundation: selected textbook content is resolved on the server from active chapters or approved segments, and the resolved source text preserves a `###` heading carrying chapter/segment identity and page range.

| Design option | Alignment with source safety | Decision |
| --- | --- | --- |
| Generic embedding/vector retrieval | Could retrieve semantically similar text but adds infrastructure, ranking opacity, and a new failure mode. | Rejected for the present project stage. |
| LLM-generated source summary before assessment generation | Adds a model call, introduces a second factual transformation, and could omit supporting detail. | Rejected. |
| Current evenly spaced excerpt sampling | Deterministic but not topic-aware; may omit a relevant later passage. | Retain temporarily, but do not reduce its cap. |
| Proposed approved-scope span selector | Uses only server-approved chapter/segment boundaries, preserves identifiers and page provenance, and selects coverage spans inside each selected unit. | Recommended for a future gated implementation. |

## Proposed safe selector contract

The selector should operate only after `resolveCurriculumScope` has returned approved source text. It must never fetch, infer, or merge external text; it must never change the selected scope or citation candidates. It should retain the complete source whenever it fits the budget.

For an oversized approved scope, it should first split on the existing `###` chapter/segment headers. The budget should be allocated across **every selected unit**, not globally sampled. Each retained span must include its original chapter/segment heading and preserve page-range metadata. Within one oversized unit, the selector may prefer complete paragraph boundaries and concept-bearing structural paragraphs, while retaining coverage from the beginning, middle, and end. It must report selected-span count, source characters, and sent characters as metadata only.

| Non-negotiable invariant | Verification approach |
| --- | --- |
| No source outside the approved scope | Unit test with a multi-chapter scope and server-provided chapter IDs only. |
| Every selected chapter/segment remains represented when the budget permits | Test for preserved headings and page ranges. |
| No citation candidate is invented or remapped | Reuse current citation-candidate hydration and regression tests. |
| No reduction in deterministic post-generation checks | Preserve current schema, citation, diversity, prior-paper, and exact-cache tests unchanged. |
| Full source remains used below the existing cap | Unit test exact output equality for small sources. |

## Measurement gate

The first release records actual provider-reported input, output, cached-hit, and total tokens. Before changing source selection, the Portal Admin should collect ordinary successful use across at least these existing paths: an approved-scope MCQ draft, a printable short-paper draft, and a printable long-paper draft. The history view must show actual provider values rather than “not reported” for the sample to be usable.

The follow-up decision should compare **like-for-like** requests: source size, generation mode, count/pair count, provider, cache hits, retries, validation success, and teacher/Portal Admin review outcome. The selector is acceptable only if it lowers sent input while preserving successful grounding, citations, distinct concepts, and staff-approved question quality. Otherwise, the current budget remains the safer choice.

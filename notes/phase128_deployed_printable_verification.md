# Phase 128 — Controlled Deployed Printable Verification

## Test Scope

The verification used the smallest active reviewed source scope available for Grade 10 Computer Science: **Unit 2 — Computational Thinking & Algorithms**, pages **54–65**, with **one numbered OR pair**. It was created through the deployed, signed-in Portal Admin workflow rather than a local mock or a direct database insertion.

## Outcome

The deployed progress panel locked the approved source scope, generated and verified the single batch, and released the review draft only after the complete pair passed. The interface reported **2 prompts across 1 OR pair** and exposed the existing paper and solution-key export controls.

Persisted generation telemetry for job **1470001** records a completed short-paper run at 100% progress. The managed provider’s prior quota-exhaustion signal correctly routed the request to the configured Gemini fallback. Telemetry reported 0 retry attempts, 22,341 selected source characters, 3,983 provider input tokens, 1,015 provider output tokens, and 7,437 total provider tokens.

## Decision

No output-limit, source-governance, validation, diversity, citation, caching, or user-interface control was changed. The one-pair verification completed successfully with the existing progressive batch and source-lock safeguards, so a speculative optimisation would add risk without a measured benefit.

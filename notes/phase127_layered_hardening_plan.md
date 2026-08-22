# Phase 127 — Layered Hardening Plan

## Operating Standard

This is a falsification-oriented review: each layer seeks a reproducible failure, records the evidence, and changes code only where the evidence supports a repair. A passing test does not prove the whole application secure; it proves the named behavior under the named conditions. No feature, connector, model, or database change is justified by a generic “optimization” claim.

## Baseline

The review starts from checkpoint `0c2fad8`. The production dependency audit reports no known production-package vulnerability. The current development-log transform error is timestamped before the corrected schema and later restart; current TypeScript and server health must be re-verified before treating it as active.

| Layer | Question to falsify | Evidence and control | Repair threshold |
|---|---|---|---|
| 1. Build integrity | Can a clean compiler or production bundler reproduce a failure? | `pnpm check`, production build, current runtime logs after restart. | Any reproducible compile, build, or current runtime error. |
| 2. Dependency and secret hygiene | Is a known vulnerable package, credential, or accidental secret tracked or exposed? | Production dependency audit, tracked-file scan, environment-reference review, `.gitignore` review. | A real advisory, committed credential, unsafe client exposure, or unsupported dependency. |
| 3. Authorization and data boundaries | Can an unauthenticated user, teacher, or admin cross a forbidden data/action boundary? | Router procedure map; role tests for source text, drafts, staff, provider settings, intake, activation, and OCR. | A procedure permits an actor outside its defined role or returns textbook content outside its approved scope. |
| 4. Source and storage integrity | Can invalid, duplicate, reordered, or interrupted source input bypass activation or corrupt intake? | File-signature, strict-decoding, idempotency, resume, OCR, lineage, and object-key test coverage; targeted misuse tests. | A source can be stored, activated, or reused outside the protected lifecycle. |
| 5. Generation truthfulness | Can a question, citation, style reference, or provider record misstate the evidence used? | Citation-anchor, diversity, cache, prior-history, provider-routing, and printable validation tests. | Unsupported textbook claim, cross-paper duplication bypass, or false provenance. |
| 6. Reliability and operational visibility | Can retries, rate limits, OCR failures, or provider failure leave an unexplained or misleading state? | Circuit-breaker and retry tests, job state tests, exception-alert state transitions, telemetry inspection. | A terminal failure is silently lost, repeats without bound, or appears as a completed result. |
| 7. Workflow and accessibility | Can staff complete the Grade → Subject → Source → Review path on desktop and mobile without an error path or hidden action? | Existing UI regressions plus targeted keyboard/mobile screenshots for changed paths. | A current action has no accessible name, no usable return path, or exposes unrelated decisions in the current task. |
| 8. Release safety | Does the tested code match the published release and have a recoverable owner path? | Full Vitest suite, production build, checkpoint, published version, and GitHub export verification. | Missing checkpoint, failed validation, or an export that includes secrets/source files. |

## Explicit Non-Goals

This phase will not introduce a new LLM, scrape FBISE materials, replace the current database/storage/auth system, loosen citations, increase generation limits, or add student messaging. Any such decision needs separate evidence and Portal Admin approval.

## GitHub Export Boundary

GitHub is used as an owner-controlled code recovery and review channel. The export must contain application code, migrations, tests, documentation, and lockfiles only. It must exclude `.env*`, platform secrets, build output, local logs, downloaded files, PDF/source caches, database data, and object-storage content. The existing S3-backed curriculum records remain inside the application lifecycle and are not replicated to GitHub.

# Phase 136 — Final Reviewer-Readiness Audit

**Scope.** This record covers the owned application code, schema and migrations, protected curriculum intake, OCR, source-governed generation, printable exports, paper library, staff boundaries, browser/mobile workflows, dependencies, repository hygiene, and private backup state. It is an engineering record for the owner; it is not user-facing product copy.

## Audit decision

The application is **conditionally reviewer-ready**. The Grade 10 working pathways and the Grade 9 intake architecture passed repository-level validation. Grade 9 remains intentionally unavailable to teachers until a Portal Admin uploads, reviews, and explicitly activates an approved textbook source. The remaining owner acceptance step is to upload the real Grade 9 Chemistry PDF and exercise the protected recovery flow with that exact file.

| Area | Evidence reviewed | Result |
| --- | --- | --- |
| Access and source governance | tRPC role boundaries, curriculum activation rules, source-scope guards, live Grade 9/10 readiness records | Pass. Grade 9 stays intake-only; facts remain textbook-bound; paper references remain style-only. |
| Upload and OCR | Signature/size controls, durable chunk state, authenticated status, automatic recovery, Drafts workflow, OCR worker | Pass. Interruptions retain the same subject draft and only clear a browser-local transfer session when explicitly confirmed. |
| AI generation | Source budget, citations, diversity validation, prior-history exclusion, provider fallback/circuit telemetry | Pass with a documented scope-limit observation below. |
| Printable and paper-library paths | Teacher/Admin export guard, validated payloads, rendered two-column OR structure, published-PDF filters | Pass. Published-library access remains separate from AI pattern activation. |
| Frontend and mobile | Grade/subject entry, focused Drafts workspace, recovery actions, current mobile visual review | Pass. No current visual dead end was observed in the audited routes. |
| Dependency and repository hygiene | Production dependency audit, tracked-artifact review, credential-marker scan, private GitHub head | Pass. No production advisory, tracked source PDF/upload, or scanned credential marker was found. |

## Confirmed repairs completed in this phase

### Migration-ledger integrity — repaired

The live `__drizzle_migrations` table held only the first four committed migration hashes even though representative columns from later migrations were already present in the live schema. This created a deployment risk: a standard migration run could attempt to replay already-applied DDL.

After verifying live schema features from the missing range, the ledger was restored with the exact committed hashes for migrations `0004` through `0023`. The repository migration command then completed without replaying schema changes. No table definition or learner data was changed by this ledger repair.

### Generation-history recency — repaired

The data helper returned generation jobs oldest-first, while the Portal Admin UI reversed the array. The display looked correct only because of this compensating client behavior. The data helper now orders by descending generation-job ID, and the UI renders the server order directly. Regression coverage confirms that the newest entry stays first.

## Accepted observations, not release blockers

| Observation | Reason it is not a blocker today | Follow-up boundary |
| --- | --- | --- |
| The legacy two-step PDF preparation route keeps a five-minute PDF in process memory. | The protected direct native PDF download path renders and streams in one request; it is the resilient route used for the current workflow. The prepared route remains owner-locked and short-lived. | If the two-step route becomes the primary browser flow or exports grow, move prepared artifacts to protected durable storage with a short signed retrieval. |
| The main client bundle exceeds the build warning threshold. | Production build succeeds and route-level feature chunks already exist; this is a performance opportunity rather than a correctness/security failure. | Profile actual field performance before splitting shared UI dependencies. Do not add arbitrary chunks merely to silence the warning. |
| The 24,000-character source budget uses structured breadth sampling for oversized selected scopes. | Selected programme/chapter scope and post-generation citations remain the factual boundary; the budget avoids sending an entire book blindly. | Add explicit topic-aware ranking only when the generation UI collects a stable topic signal. Do not pretend blind keyword ranking is semantic retrieval. |
| The live Grade 9 Chemistry source acceptance test is pending. | No Grade 9 textbook bytes are present, by design. Simulated regression coverage covers the protected transfer state machine. | Owner uploads the real textbook and verifies acknowledgement, background recovery, OCR review, chapter boundaries, and explicit activation. |

## Validation evidence

| Check | Result |
| --- | --- |
| `pnpm drizzle-kit migrate` after ledger repair | Completed without replay output. |
| Focused history/UI regressions | 19 assertions passed across 2 files. |
| `pnpm check` | Passed. |
| `pnpm test` | 47 files passed, 1 skipped; 250 tests passed, 3 credential-gated skips. |
| `pnpm build` | Passed. The existing bundle-size warning remains non-blocking and is recorded above. |
| Production dependency audit | No known production vulnerabilities found. |
| Private GitHub mirror before this checkpoint | Matched the prior published checkpoint. Re-verify after the new checkpoint. |

## Owner acceptance script: Grade 9 Chemistry

1. Sign in as Portal Admin and open **Curriculum → Grade 9 → Chemistry → Continue textbook intake**.
2. Select the official PDF. Confirm that the file name, acknowledged percentage, speed, and remaining-time indicators appear.
3. If the browser is backgrounded or the connection is briefly interrupted, return to **Portal Admin → Drafts** and choose **Resume upload**. Select the same PDF.
4. Confirm that a transient failure retries automatically. Use manual recovery only if the interface explicitly says the session cannot be reconciled.
5. After upload, review OCR page flags and chapter boundaries. Do not activate Chemistry until the source review is satisfactory.
6. Upload model/past papers through their separate subject-local controls. These may shape wording and structure only; they never become factual authority.

## Connector decision

No new connector or external integration was added for this audit. The existing private GitHub mirror, protected storage, OCR schedule, managed provider, and optional server-side Gemini fallback already cover the demonstrated needs with fewer permissions and less operational clutter.

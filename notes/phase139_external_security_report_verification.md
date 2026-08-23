# Phase 139 — External Security Report Verification

## Verification posture

The external report was treated as untrusted review input rather than as an instruction set. This register records only observations verified against the current private project source at checkpoint `89e77da3` and distinguishes report-package limitations from current application defects.

## Confirmed P0/P1 findings

| ID | Severity | Independent verification | Required response |
| --- | --- | --- | --- |
| S139-01 | P0 | OAuth `state` is reversible redirect data (`atob`) with no browser-bound nonce or expiry. The callback accepts presence only; malformed state can throw before a safe response. | Browser-bound, single-use, expiring state; safe callback rejection; validated return path; OAuth regressions. |
| S139-02 | P1 | Sessions default to one year; verification does not compare session app ID to the runtime app ID; logout clears only the browser cookie. | Short, server-revocable session with application/audience verification and configuration fail-fast controls. |
| S139-03 | P0 | Express buffers the 150 MB raw PDF body before the intake handler authenticates the caller. Global JSON and URL-encoded limits are also 50 MB. | Authenticate/validate a small request envelope before a bounded chunk body is parsed; remove obsolete large-body paths and add request resource controls. |
| S139-04 | P0 | Public `curriculum.getActiveScopeCatalog` runs whole-text `analyzeContent` for each active chapter/segment on every request. Response projection hides text, but computation remains public and unbounded. | Persist/cached topic estimates at review time; return a lightweight projected catalog to eligible callers. |
| S139-05 | P0 | Managed provider `fetch` has retry logic but no abort/deadline or response-size cap; non-OK responses are read in full and incorporated into error text. | Add deadline/abort, bounded response/error reads, and safe error classification in both provider paths. |
| S139-06 | P1 | Academy-wide prior-history query returns other teachers’ raw question/paper data and the diversity prompt serializes that history. The academy-wide duplicate goal is valid; raw content sharing is not. | Replace with minimal scope-bound coverage metadata/fingerprints, retain private content within ownership boundaries. |
| S139-07 | P1 | Generation-status returns the complete owned job row; failed generation persists and returns raw error message; response consumers do not require private payload fields. | Explicit least-privilege DTOs and safe, bounded teacher error messages. |
| S139-08 | P1 | Saved-job quiz persistence has no prior `generatedQuizId` idempotency check and performs quiz creation, question insertion, and job update in separate awaits. | Transaction plus unique job-to-quiz relation/idempotent save behavior and failure-race tests. |
| S139-09 | P1 | Cross-request chunk completion reads completion state, ingests, then writes completion marker without an atomic claim. | Durable processing claim / compare-and-set status before ingest, with recovery and duplicate-completion tests. |
| S139-10 | P1 | No explicit lifecycle/purge contract is evident for completed jobs, stored result payloads, provider failure data, or expired upload artifacts. | Owner-approved retention policy, expiry fields, bounded cleanup, and lifecycle tests. |

## Confirmed P2 / follow-up findings

| ID | Observation | Treatment |
| --- | --- | --- |
| S139-11 | Collections and public programme responses are not uniformly paginated/projected. | Introduce limits/cursors and data-minimized public DTOs after P0/P1 boundaries are closed. |
| S139-12 | Active curriculum selection relies on application logic rather than a single database-backed invariant; relation integrity lacks foreign keys. | Add an authoritative active-set pointer/index strategy first; assess foreign keys in a separately reviewed migration plan. |
| S139-13 | Health reports generic success without dependency readiness, and critical environment values fall back to empty strings. | Split liveness/readiness; fail production startup or readiness when mandatory configuration/database access is absent. |
| S139-14 | OCR batches re-download full source objects; debug collector/analytics/deployment artifacts need controlled production treatment. | Optimize after P0/P1, remove debug code from production output, make analytics explicitly configured, and harden Docker only if it is the active deploy path. |

## Qualified observations

The external report correctly noted that its **sanitized Markdown package excluded the lockfile**, which made the reconstructed package unsuitable for a frozen install. This is a handoff-artifact defect, not proof that the current private repository lacks `pnpm-lock.yaml`. Likewise, its credential-free test run cannot supersede the current controlled result; however, it validly shows the next audit artifact needs explicit offline/security test coverage and documented integration-test provisioning rather than relying on environment-dependent skips.

No SQL-injection or embedded-secret claim is accepted because neither review produced sufficient evidence. The public scope catalog does not return chapter text and must not be described as a text disclosure. No new connector or external integration is justified: all confirmed work is within the existing application, database, managed storage, provider, and deployment boundaries.

## Completed authentication and HTTP-boundary remediation

The application now starts sign-in at a server route which creates a cryptographically random state, binds it to an HTTP-only ten-minute state cookie, validates a safe relative return path, and clears that state on every callback outcome. The callback exchanges the code only after the state cookie matches and returns a generic rejection for invalid or malformed attempts. Reversible `btoa`/`atob` redirect state is removed.

Application sessions now carry a random session identifier and are backed by a server record containing only its SHA-256 digest, subject, audience, expiry, and revocation timestamp. The default session lifetime is twelve hours; every authenticated non-scheduled request checks the backing record and current app audience; logout revokes the record before clearing the cookie. The additive `0025_marvelous_tombstone` migration is applied and recorded in the Drizzle ledger with hash `76fc812c4e8762e60baf41aeeec1b1631d99837d2e6341cec447114f61be9510`; the standard migration command completed without replay.

The HTTP bootstrap now removes framework disclosure, emits a conservative baseline of security headers, requires same-origin cookie-authenticated state-changing API requests, and fails production startup when critical configuration is absent. `auth.me` is projected to the minimal UI identity and the client no longer writes it to local storage. The public health procedure now reports configuration/database readiness rather than unconditional success. Focused OAuth state, server-session, logout, and role regressions passed together with TypeScript validation.

## Completed upload, OCR, and provider-boundary remediation

The unauthenticated whole-document raw upload route and the legacy teacher PDF/base64 extraction path have been removed. Express now accepts only a 1 MB JSON envelope and a 64 KB URL-encoded body. Textbook PDFs, including the owner-required 150 MB scanned sources, use the authenticated resumable 512 KB chunk flow. Finalization creates a durable completion claim before source ingestion and returns an existing completed receipt to safe retries rather than re-ingesting a source. Direct TXT/image and paper-pattern uploads that cannot safely fit the hardened parser are explicitly limited to 512 KB in both client and server contracts; no larger direct base64 path is represented as supported.

Completed resumable PDFs are stored as a compact immutable manifest with chunk keys, byte lengths, and an SHA-256 content hash. Intake validates the first PDF chunk, stores the manifest, and queues OCR without assembling a whole document in the web process. OCR page-count discovery, page-batched OCR, and OCR page review sequentially materialize the manifest to temporary storage. Focused manifest, source-intake, resumable-completion, OCR worker, and OCR review regressions prove ordered bytes, malformed-manifest rejection, safe fallback limits, durable claim contention, and completed-receipt recovery.

Both managed and Gemini generation transports now enforce a 90-second abort deadline, bounded success/error bodies, and capped/sanitized provider error text. The protected public scope catalog no longer performs whole-text analysis for unauthenticated callers and is restricted to teacher access with a bounded deterministic estimate.

## Completed generation privacy, persistence, and retention remediation

Shared prior-paper exclusion now uses scope-bound concept, facet, answer-target, source-reference, and learning-objective metadata only. Raw teacher question text and raw printable-draft content are no longer recovered into another teacher's generation context. Newly saved MCQ concept history deliberately omits question text, and a regression confirms the persisted coverage metadata is non-reconstructable at that boundary.

`getGenerationStatus` now returns only owned job progress, lifecycle, retry, cache, and receipt metadata. It does not return source text, source snapshots, generated results, resumable printable state, provider diagnostics, or raw failure content. Teacher-visible provider failures are stable operational messages; detailed evidence remains private in the server record. The generation-status privacy regression verifies the projection.

MCQ save now obtains a short-lived durable claim, creates the quiz and all question rows in one transaction, records the job receipt in that same transaction, and returns the existing receipt on a retry. Quiz attempts and scored answer rows are likewise created in a single transaction. Migrations `0027_romantic_hercules` and `0028_shiny_the_order` were applied additively, reconciled in the live Drizzle ledger, and verified by standard migration execution. The ledger contains 29 distinct hashes for 29 rows.

Transient generation jobs now receive a 30-day retention deadline. On normal generation/history/cache access, expired exact-result cache rows are removed and expired transient prompt text, generated result payloads, resumable state, provider diagnostics, and raw error text are redacted while operational metadata remains available. This retention policy does not remove approved curriculum sources, OCR review evidence, or reviewed paper references.

## Validation evidence and remaining release gate

The full test suite completed with 49 passing test files, 239 passing tests, and one credential-gated suite containing three skipped tests. TypeScript validation, production build, frozen-lockfile installation, production dependency audit, standard Drizzle migration execution, focused upload/OCR/auth/provider/generation regressions, and signed-out visual route checks completed successfully. The custom OCR runtime image retains its required system binaries and now installs with `pnpm install --frozen-lockfile`.

This remediation evidence does not grant production approval. The remaining real-data release gate is the owner-run Grade 9 Chemistry actual-PDF intake, resume/recovery, OCR review, source activation, and selected-scope generation acceptance flow. No source will be fabricated or substituted for that gate.

## Post-checkpoint OAuth publication evidence — 2026-08-23

- Checkpoint `7c7c3fe0` contains the proxy-safe OAuth origin repair and passed the full local suite (240 tests passing, three credential-gated skips) plus the production build.
- The public academy home route at `https://aiquizhub-g2y5mute.manus.space/` was rechecked after deployment propagation and rendered the Grade 9/10 selection screen with its Staff sign-in entry.
- A public OAuth-start probe carrying the allow-listed browser origin redirected to the official Manus sign-in route rather than returning the previous `Unsupported sign-in host` response. Real-device sign-in and callback completion remain an owner verification step.
- A subsequent public availability check also rendered the academy home screen with its Staff sign-in entry; the protected callback completion remains untested until the owner signs in on their own device.
- The published academy home route was rechecked again after sharing the link with the owner and completed loading with the Staff sign-in entry visible.
- A further public navigation check confirmed the academy home screen again completes loading with the Staff sign-in entry; only the owner-controlled sign-in callback remains to be confirmed.
- The academy link was subsequently rechecked and again loaded the Grade 9/10 home screen with the Staff sign-in entry; no unsupported-host response was observed in the public start path.
- The academy home screen was rechecked once more and completed loading with the Staff sign-in entry visible; real-device callback completion remains the only pending OAuth validation.

## Owner-reproduced callback failure and targeted repair — 2026-08-23

The owner completed the public account-selection step with the Portal Admin-linked Manus account. The official Manus account chooser returned to the academy callback, which then returned the safe response `{"error":"Sign-in could not be completed"}`. This excludes the previous public-host rejection and provides direct evidence that the failure occurs after browser-bound state verification.

Production logs identified the exact failure: `Session signing configuration is unavailable`. The Phase 139 session implementation had added a character-count requirement to the platform-provided opaque `JWT_SECRET`; production startup checked only that the configuration existed, so the application could load and begin OAuth but the callback failed while issuing its server-backed session. This was an application regression, not an owner-account error.

The targeted repair keeps the required non-empty secret, browser-bound OAuth state, host-only state cookie, twelve-hour server-backed session, revocation record, trusted-origin validation, and safe generic callback errors. It derives a fixed 256-bit domain-separated HMAC signing key from the opaque managed secret rather than assuming that the secret's displayed character length represents entropy. The focused session regression now exercises a short opaque managed-secret value; the full local suite passes with 49 test files, 241 tests, and three credential-gated skips. TypeScript and the production build also pass. Deployment and a second owner real-device sign-in remain required before this can be marked complete.

## Fresh-upload response incident classification — 2026-08-23

The Grade 9 Chemistry draft and its recovery action remained intact. A public readiness probe returned HTTP 200 with the expected tRPC JSON content type and `configuration: true`, `database: true`, demonstrating that the live application and database were reachable; this probe did not send source data. The protected fresh-upload procedure itself accepts only the existing curriculum-set ID, filename, and file size before a new session exists, so the reported failure occurred before any PDF bytes, manifest objects, OCR, or chunk ordering could be involved.

Live logs then showed repeated `JWSSignatureVerificationFailed` records immediately after deployment. The session-key derivation repair changed the verifier from the pre-repair raw opaque-secret key to a derived key, invalidating the owner browser's still-valid pre-repair session cookie. As a result, the protected upload-ticket request was rejected before the handler could return its normal SuperJSON/tRPC envelope, producing the mobile client's response-transform message. The simultaneous platform availability banner was treated as a competing condition, but the public readiness response and session-verification evidence identify the application-side cause.

The repair retains the derived key for all newly issued sessions and adds a fixed, one-time bridge for only raw-key cookies whose signed expiration falls within the maximum lifetime of cookies issued before the migration. The normal server-backed session record, app audience, revocation, and twelve-hour expiry checks still apply after signature verification. A raw-key token with an expiration beyond the compatibility horizon is rejected. The focused regression proves both cases; the full suite passes with 49 test files, 242 tests, and three credential-gated skips, alongside TypeScript and a production build. Publishing and owner confirmation of the existing Chemistry fresh-upload action remain required.

# Protected Upload Response Incident — Investigation and Remediation Plan

## Goal

Diagnose and resolve the Grade 9 Chemistry **Start a fresh upload** failure shown on the owner's mobile device as `Unable to transform response from server`, while preserving the existing Portal Admin-only, 150 MB, manifest-backed, resumable PDF intake design. The plan separates failures within Paramount Academy from any hosting or gateway availability restriction so that no unsafe workaround is introduced.

## Evidence established before implementation

| Observation | Interpretation | Constraint for the repair |
| --- | --- | --- |
| The existing Grade 9 Chemistry draft remains visible and the recovery card identifies the original PDF. | The subject and draft lineage were preserved; this is not a duplicate-subject or lost-source failure. | Never delete the draft or create another Chemistry programme/set as a recovery tactic. |
| The failed action is **Start a fresh upload**, before the selected PDF is chunked. | The failed request should contain only `curriculumSetId`, filename, and size; it is not a 150 MB request. | Diagnose the small session-creation response first, independently of OCR and chunk transfer. |
| The client uses authenticated tRPC with SuperJSON through `/api/trpc`; the upload procedure returns a small JSON upload ticket. | A response-transformation error can arise from application serialization, client transport, gateway/proxy substitution, or an upstream availability page. | Capture status, content type, bounded body fingerprint, and correlation information before modifying the transport. |
| The same mobile screen displays a platform availability/billing warning. Earlier production-log collection also reported no active service. | A hosting/gateway condition is a credible competing explanation, but is not yet proof that the application code is correct. | Do not present an application patch as a solution until the public response path is measured. |
| The protected design stores 512 KB chunks in managed storage and maintains a signed upload ticket and durable completion claim. | The existing design is the approved safety boundary for 150 MB scanned PDFs. | No raw whole-file upload, `Buffer.concat`, browser-payload PDF path, unbounded retry loop, or lowered size limit may be introduced. |

## Scope and decision principles

This work covers only the fresh-session creation and resumable upload transport. It does not change source authority, OCR review, activation, staff authorization, or the existing Grade 9 draft. The public platform notice must be treated as an external operational condition rather than an application assertion; if it prevents a valid API response, the execution phase will produce a concise, evidence-rich escalation and wait for service restoration rather than attempting to bypass it.

## Execution phases

### Phase 1 — Establish a reproducible response record

1. Reproduce the unauthenticated public route and, if the owner session remains needed, inspect the authenticated action through the browser without collecting credentials or source content.
2. Capture only operational metadata for the `curriculum.prepareLargePdfUpload` request: request path/method, HTTP status, response content type, bounded response-body fingerprint or safe preview, response headers relevant to caching/proxying, and deployment timestamp/version. Redact cookies, authorization material, upload tokens, filenames where unnecessary, and all source data.
3. Correlate the request with live application logs, health/readiness output, deployment state, and the existing production availability banner. Record whether the request reached the Express/tRPC handler.
4. Classify the incident into one of four evidence-backed categories: application exception, tRPC/SuperJSON serialization mismatch, client batching/transport incompatibility, or upstream platform/gateway substitution/unavailability.

**Exit condition:** a recorded response classification with enough evidence to name the failing layer, or a documented external platform block that prevents further in-app observation.

### Phase 2 — Verify the application contract independently

1. Extend the router-level regression for `prepareLargePdfUpload` to prove that an authenticated Portal Admin receives a schema-valid, serializable ticket with a non-sensitive fixed-size response.
2. Add negative coverage confirming that unauthenticated and non-admin callers cannot obtain a ticket, and that invalid size/name inputs fail with the standard safe error envelope.
3. Test the client mutation path using the existing Curriculum Management UI suite: simulate a valid ticket, an invalid/non-JSON upstream response, and a safe application error. Confirm the UI leaves the existing draft and local resumable metadata intact.
4. Ensure tests never use real PDFs, upload tokens, cookies, credentials, or storage objects.

**Decision gate:** if this contract fails locally, repair only the demonstrated application fault. If it passes while production returns a non-conforming document or intermediary error, proceed to Phase 3 as a transport/platform incident.

### Phase 3 — Apply the minimum appropriate remediation

#### If application or serialization evidence is confirmed

1. Correct the response DTO or serialization boundary at the smallest relevant layer, retaining tRPC and SuperJSON for all application calls.
2. If evidence specifically implicates batching for this mutation, use a tRPC-supported non-batched link only for the three protected upload operations (`prepareLargePdfUpload`, `appendLargePdfChunk`, and `completeLargePdfUpload`). Do not introduce a custom `fetch` upload path or bypass same-origin/credential protections.
3. Preserve the current signed upload ticket, 12-hour upload expiry, 512 KB chunks, server-authoritative status checks, durable completion claims, and current recovery behavior.

#### If an upstream response substitution or platform availability condition is confirmed

1. Do not mask the response as a normal fresh-upload failure or retry it repeatedly.
2. Improve the client’s bounded error classification so that a non-application response is described accurately: no source was received, the existing draft remains safe, and retrying should occur only after service availability returns.
3. Prepare a minimal support escalation containing the public domain, UTC timestamp, request name, HTTP/status/content-type evidence, deployment version, and a redacted response fingerprint. It must exclude secrets, cookies, account data, signed tickets, source PDFs, OCR text, and database information.
4. Resume functional verification only after the external service again returns the documented tRPC response shape.

**Exit condition:** the repair is limited to proven defects and does not weaken any security or source-governance control.

### Phase 4 — Validate the complete protected recovery workflow

1. Run focused router, upload-session, and Curriculum Management UI regressions; then run TypeScript, the full test suite, and a production build.
2. Confirm a public health/navigation route and deployment metadata after publishing. Re-check the specific response contract; do not poll indefinitely if the platform is unavailable.
3. Ask the owner to use **Start a fresh upload** on the existing Grade 9 Chemistry draft. Confirm the new session is created before any PDF bytes are sent, then verify a real owner-selected PDF can progress using server-acknowledged 512 KB chunks.
4. If the owner permits and completes the upload, continue only through the existing acceptance sequence: interruption/resume test, OCR page review, explicit source activation, and source-scoped generation. No substitute textbook is allowed.

## Test and acceptance matrix

| Layer | Required proof | Pass criterion |
| --- | --- | --- |
| Router | Admin session creation, invalid input, role denial | Small serializable ticket only for Portal Admin; safe typed failures otherwise. |
| Client | Valid ticket, non-application response, ordinary server error | Existing draft and local recovery state remain safe; messaging is accurate and non-technical for staff. |
| Upload integrity | Resume, stale-session recovery, ordering, completion claim | No duplicate source, no chunk loss, no duplicate completion, no whole-file buffering. |
| Security | Same-origin mutation guard, session/auth, signed ticket | No bypass of the browser/session/source protections. |
| Deployment | Public route, response contract, bounded log evidence | Application handler is reached and returns the expected content type/shape, or external block is explicitly documented. |
| Owner acceptance | Fresh session + real PDF recovery | Existing Grade 9 Chemistry draft accepts the source without creating a duplicate subject; OCR review and activation remain explicit gates. |

## Assumptions, risks, and open dependencies

The plan assumes the reported mobile account was already authenticated as Portal Admin because it could reach the protected Curriculum workflow. The app cannot itself restore a hosting service that has been paused, limited, or replaced by a platform-owned gateway response. That external condition is therefore a dependency, not a code defect to conceal. The plan deliberately avoids lowering the 150 MB cap, asking for a replacement book, exposing upload/session internals, or storing source content in GitHub.

The recently repaired OAuth callback must remain independently owner-verified. It is not considered complete merely because the new upload incident appeared afterward.

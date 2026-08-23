# Live Authentication and Protected Upload Recovery Plan

## Objective

Resolve the **still-reproduced Grade 9 Chemistry “Start a fresh upload” failure** on the published academy domain, and reopen the affected portion of the prior security/reliability pass. The repair must prove the complete real-device route—Staff sign-in, callback, authenticated Portal Admin view, upload-ticket creation, and protected upload recovery—rather than treating local tests, build success, or a public health endpoint as a substitute for that proof.

## Direct acknowledgement and corrected assessment

The owner is correct that this failure did not exist before the recent authentication hardening work. The audit-related changes introduced a new session-signing-key derivation. The first repair correctly allowed the deployed opaque secret but did not sufficiently validate the effect on already-open mobile sessions or prove that the browser received and returned the new session cookie after real OAuth.

The later compatibility bridge was also **not adequate evidence of a complete fix**. Production logs showing `Missing session cookie` prove only that the app received no cookie on those requests; they do not prove whether the owner had not completed the new sign-in, whether the callback failed to set a cookie, whether mobile browser policy rejected it, or whether the protected page displayed stale client state. That uncertainty was incorrectly collapsed into a conclusion. No further session, upload, or transport modification will be made until the exact live failure boundary is measured.

## Non-negotiable safety constraints

| Constraint | Required preservation |
| --- | --- |
| Authentication | Browser-bound OAuth state, allow-listed browser origin, host-only cookies, secure cookie flags, 12-hour server-backed sessions, revocation records, and same-origin mutation protection remain enforced. |
| Grade 9 source intake | The existing Chemistry subject/draft remains the only target. No duplicate subject, no deletion, no replacement textbook request, and no activation shortcut are permitted. |
| 150 MB PDFs | Preserve the manifest-backed, 512 KB sequential resumable chunk design. Do not reintroduce whole-file buffers, browser-base64 PDFs, `Buffer.concat`, or a lowered size limit. |
| Privacy and repository hygiene | Never log raw cookies, OAuth codes, session tokens, email/account values, upload tickets, PDFs, OCR text, database dumps, or storage content. Keep GitHub private and source-free. |
| Scope discipline | No unrelated connector, provider, UI redesign, or feature work. Existing full-stack, OAuth, storage, log, and browser capabilities are sufficient; adding integrations would not solve an evidence gap. |

## Phase 1 — Freeze the risky path and record the falsified acceptance result

1. Mark the prior owner acceptance claims as **not achieved** in the private evidence register and checklist. Do not claim the OAuth callback repair, fresh-upload recovery, or broader release gate is complete.
2. Preserve the owner’s screenshots and exact reported symptoms as incident evidence without copying account data into public documentation.
3. Freeze further changes to session signing, cookies, OAuth state, tRPC transport, and the upload protocol until Phase 2 determines the failing layer.
4. Re-check only read-only deployment facts: public health response, published version, and bounded production logs. Treat the hosted warning banner, public readiness, and server logs as separate signals rather than proof of one another.

**Exit criterion:** One current incident record names the unresolved facts explicitly and no unsupported conclusion remains in the release evidence.

## Phase 2 — Create safe end-to-end observability for one owner retry

1. Add a short-lived, server-side **opaque request correlation ID** to the OAuth callback, `auth.me`, and the specific `curriculum.prepareLargePdfUpload` procedure. Log only: UTC timestamp, route/procedure, authentication state (`cookie absent`, `signature invalid`, `session revoked/expired`, `role denied`, or `authorized`), response class/status, and correlation ID. Do not log identities, cookie values, OAuth code/state values, filenames, sizes, ticket values, or source content.
2. Return a generic correlation ID in safe error envelopes so the owner can report it or screenshot it, without exposing implementation details or credentials.
3. Add client-side handling that first confirms fresh `auth.me` state before showing or invoking protected Curriculum Management actions. If unauthenticated, show one concise **“Session ended — sign in again”** action and route safely through the existing Staff sign-in flow. It must not leave a stale Portal Admin view whose next action fails as a malformed response.
4. Use the existing tRPC client contract; do not add a custom fetch, raw REST alternative, or browser-accessible diagnostic endpoint. Keep response transformations standard and testable.
5. Publish this observability-only release and have the owner perform exactly one clean, normal Chrome attempt: academy home → Staff sign-in → account selection → academy return → existing Grade 9 Chemistry → Start a fresh upload. Capture the displayed correlation ID and bounded production log record.

**Exit criterion:** The request is classified exactly as one of: callback cookie not issued, cookie absent on subsequent request, signature invalid, session record invalid/revoked/expired, authorization denial, router/application error, or successful ticket response with a client presentation defect.

## Phase 3 — Correct the proven layer only

| Evidence classification | Permitted repair |
| --- | --- |
| Callback does not set a cookie | Repair only the callback cookie options/redirect sequence compatible with the academy’s HTTPS public domain; retain browser-bound state and secure host-only cookie semantics. |
| Cookie is not returned on Chrome | Inspect cookie attributes, top-level redirect behavior, and browser context; repair only the incompatible attribute or stale client routing. Do not weaken to cross-site or JavaScript-readable cookies. |
| Signature failure | Replace the temporary legacy bridge with a deliberately versioned session-key migration protocol that verifies old sessions only for their original normal lifetime, then retires automatically. Do not accept unbounded legacy signatures. |
| Session record or role failure | Correct the demonstrated record/role lookup or expiry issue and keep server-backed revocation mandatory. |
| Authorized route returns non-tRPC response | Correct the route/proxy response boundary or narrowly unbatch the documented protected upload mutation using supported tRPC links. Do not add arbitrary client fetch. |
| Ticket succeeds but UI fades/errors | Repair the exact UI state/error mapping, retain the draft, and confirm the file bytes have not started transferring. |

Every change requires a focused regression reproducing the old condition plus a negative security test. The earlier compatibility bridge is retained only if Phase 2 demonstrates it is necessary; otherwise it will be removed rather than accumulating a speculative workaround.

## Phase 4 — Full validation after the targeted repair

1. Run focused OAuth/session, tRPC, Portal Admin Curriculum Management, resumable upload, and error-presentation tests.
2. Run the complete test suite, TypeScript check, production build, frozen production dependency install/audit, and migration replay/readiness checks where applicable.
3. Validate one signed-out public health route, one normal browser OAuth-start request, and the bounded production log contract. Do not poll repeatedly or simulate account selection.
4. Publish one checkpoint only after every automated proof passes, then synchronize it to the private GitHub mirror after confirming no secrets, source material, logs, or upload objects are staged.

## Phase 5 — Owner acceptance and release-gate decision

The owner will make one real-device attempt after the published repair. Acceptance requires all of the following: the account selection returns to the academy; the Portal Admin view is genuinely authenticated; **Start a fresh upload** on the existing Grade 9 Chemistry draft produces a new protected upload session; no duplicate subject is created; and the normal resumable upload UI begins before any actual PDF data is transferred.

Only after that acceptance may the owner choose an actual Grade 9 Chemistry PDF for the separate intake sequence: interruption/resume verification, OCR review, and explicit source activation. The project is not release-approved until this acceptance is recorded.

## Risks and stop conditions

If the observable failure is a platform-owned gateway response or a cookie policy outside application control, the evidence package will be prepared for support with only correlation ID, time, public domain, response class, and deployment version. The project will not claim an app-side repair or attempt to bypass the platform. If the owner’s browser blocks cookies, the app must fail clearly with a supported browser/cookie setting instruction, never silently show stale administration controls.

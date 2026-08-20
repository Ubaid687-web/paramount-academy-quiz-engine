# Paramount Academy Supervisor Audit — 20 August 2026

## Scope and review standard

This review examined the production dependency state, role gates, ownership checks, curriculum activation chain, upload routes, printable-generation state transitions, PDF download paths, and teacher-facing Grade 9 workflow. It did not treat a passing screen as proof of safety: each finding was traced to the responsible server or client contract before a correction was made.

## Confirmed protections retained

| Area | Evidence | Supervisor conclusion |
|---|---|---|
| Staff access | `teacherProcedure` accepts only Teacher or Portal Admin; `adminProcedure` accepts only Portal Admin. | Approval-first staff roles remain enforced server-side. |
| Drafts and generation jobs | Draft reads, edits, saved quizzes, printable advancement, and job status checks compare the record owner with the signed-in user. | Cross-user access is rejected rather than hidden only in the interface. |
| Curriculum activation | A programme cannot become teacher-ready without an active curriculum edition; active scope resolution uses server-approved chapters and segments. | Grade and subject separation remains intact. |
| Browser source exposure | The public scope catalogue returns chapter/segment metadata and capacity estimates, not the extracted textbook body. | It does not expose active textbook text through the catalogue endpoint. |
| Dependencies | Production dependency audit reported no known production vulnerabilities. | No dependency remediation was required in this release. |

## Confirmed defects repaired

| Finding | Risk | Correction |
|---|---|---|
| Any signed-in account could invoke PDF text extraction. | A non-staff account could consume parser resources. | PDF extraction now requires Teacher or Portal Admin access. |
| PDF and curriculum uploads trusted declared MIME type/base64 too far. | Malformed or mismatched files could reach parsers or storage. | Strict base64 decoding, 30 MB decoded limits, PDF magic validation, and PDF/JPEG/PNG/WebP/text signature checks now occur before parsing or storage. |
| Two rapid “advance” actions could generate the same printable batch. | Duplicate quota use and inconsistent saved state. | An atomic database claim now permits only one pending/failed printable job transition to processing. |
| Progress response reported the just-completed batch size as the next batch size. | Teacher progress feedback could be misleading. | Next-batch feedback now reports the true remaining batch size. |
| Completed generation jobs did not consistently retain `completedAt`. | Duration telemetry could not be honestly calculated. | Cached and newly completed MCQ/printable jobs now persist completion timestamps. |
| Grade 9 appeared as a setup path to every user. | Teachers could be routed toward an inaccessible administration screen. | Only Portal Admin sees the Grade 9 intake action; teachers receive a clear “being prepared” state until reviewed curriculum is activated. |

## Grade 9 operating model

> **Use the on-site Portal Admin intake workspace, not chat uploads, as the source of record for Grade 9.**

Chat is useful for discussing requirements or diagnosing a difficult scan, but it is not a durable curriculum store, does not preserve edition status, and cannot enforce the activation chain. The site already provides the correct sequence: create one Grade 9 subject, create its draft edition, upload that subject’s textbook, allow extraction/OCR, review weak pages, create chapter scopes, activate the reviewed edition, then explicitly make the programme teacher-ready. Keep model/past papers in the same subject’s pattern-source intake, where they guide wording and layout only; do not mix them with the factual textbook source.

| Role | Permitted Grade 9 action |
|---|---|
| Portal Admin | Creates subject and edition, uploads one source at a time, reviews OCR, activates chapters/edition, then enables teacher access. |
| Teacher | Sees that Grade 9 is being prepared; can generate only after the Portal Admin activation gate is complete. |
| Student or ordinary user | Cannot upload, extract, activate, or generate from curriculum sources. |

## Remaining non-blocking observations

The production build reports a large shared client bundle warning. It is a cold-load performance improvement opportunity, not a security defect and should be addressed separately through careful route-level code splitting. Output limits remain unchanged: the measured successful printable jobs are not equivalent minimal-scope samples, so they are insufficient evidence for a safe reduction.

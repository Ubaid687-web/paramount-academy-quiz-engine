# Phase 126 — Capability and Integration Assessment

## Scope and Decision Rule

This assessment evaluates capabilities only against the Academy’s actual operating model: Grade 9 and Grade 10 FBISE preparation, textbook-only factual grounding, Portal Admin review, low external cost, and staff-first workflows. A connector is not treated as an improvement merely because it is available. No connector, credential, source file, generation policy, or scheduled job was changed during this assessment.

## Verified Starting Position

| Area | Evidence | Current position | Assessment |
|---|---|---|---|
| Authentication and roles | Manus OAuth, teacher/admin procedures, role regressions | Staff access is handled inside the application. | Retain; do not add a second identity provider. |
| Textbook and paper storage | Managed S3 source storage with Portal Admin activation | Source files are versioned inside the curriculum lifecycle. | Retain as the authoritative copy. |
| AI generation | Managed provider plus direct Gemini fallback, routing telemetry, circuit breaker, validated citations | A second general-purpose model connector would duplicate the current provider architecture. | Do not add another provider. |
| OCR processing | Source intake invokes `ensureOcrScheduler`; a secure one-minute worker is created only when scanned OCR is needed | No active job exists now because no eligible OCR intake requires one. | Retain the just-in-time scheduler; do not create an idle schedule. |
| Owner alerts | Built-in `notifyOwner` helper exists but is not used by curriculum/OCR/generation workflows | Portal Admin must manually notice exceptional states. | Candidate for a small, internal improvement. |
| External connectors | No user-custom connector exists; only My Browser is enabled for the current session | No external service is currently required by the runtime. | Do not enable any connector automatically. |

## Ranked Options

| Rank | Capability | Decision | Benefit | Guardrails |
|---|---|---|---|---|
| 1 | **Built-in Portal Admin exception alerts** | Recommend, subject to approval | Notify the owner when OCR permanently fails, a source requires review after extraction, or both generation providers fail. This reduces silent operational failures without adding a vendor. | Send only one state-transition alert per source/job; never include textbook text, student data, provider credentials, or repeated retry noise. |
| 2 | **Paramount Academy curriculum-governance skill** | Recommend, subject to approval | Gives future maintenance agents a concise reusable procedure for source authority, grade separation, paper chronology, citation checks, and activation. | It is an agent-maintenance skill, not an app feature. It must not contain source-text copies, credentials, or instructions that override Portal Admin approval. |
| 3 | **Optional Google Workspace/Drive intake shortcut** | Conditional; do not enable yet | Useful only if Portal Admin keeps textbooks and past papers in Google Drive and wants to select one file rather than download/re-upload on mobile. | The selected file must be copied into the existing S3 curriculum record, signature-checked, versioned, and explicitly activated. Drive must never become a live factual source or bypass review. Requires the owner’s Google authorization. |
| 4 | **GitHub repository export** | Conditional; not a runtime feature | Adds an owner-controlled external code backup and conventional change-review path. | Use only if the owner wants repository ownership and understands that application secrets and user-source files must remain outside the repository. |

The conditional Drive option is deliberately narrow. Google’s current Drive guidance recommends the non-sensitive `drive.file` scope with a user-controlled picker where possible, rather than broad Drive access; its upload guidance also treats resumable transfer as appropriate for large files and interrupted mobile networks. [1] [2] That fits the Academy only if the final selected PDF is copied through the existing signature-checked S3 intake path and still undergoes Portal Admin review. It does **not** justify a broad folder sync, background import, or a live Drive-backed generation source.

## Explicitly Rejected for This Project Stage

| Capability | Why it is not appropriate now |
|---|---|
| Another LLM connector or provider | The managed-plus-Gemini fallback is already instrumented. A third provider increases cost, output variation, failure modes, and review burden without a verified gap. |
| External web or FBISE-paper scraping | It conflicts with the rule that uploaded textbooks are the sole factual authority and user-supplied papers are style evidence only. |
| WhatsApp, broad email marketing, CRM, or student-message automations | The project has no verified consent, recipient-management, or notification policy. Adding messaging would create privacy and operational obligations unrelated to the current examination workflow. |
| Sentry/Grafana/third-party observability | The application already has typed telemetry, test coverage, managed runtime logs, and Portal Admin history. Add external observability only after a real production incident demonstrates that these are insufficient. |
| A permanent OCR schedule | The current source intake starts the secure worker only when OCR is required. An idle schedule offers no benefit and adds operational surface area. |

## Recommended Approval Sequence

1. Approve or decline the built-in exception-alert feature.
2. Approve or decline the internal curriculum-governance skill.
3. Choose whether Google Drive intake is genuinely part of the Academy’s file workflow. If not, keep the current protected mobile upload path.
4. Consider GitHub export separately as owner governance, not as a student or teacher feature.

## References

[1]: https://developers.google.com/workspace/drive/api/guides/api-specific-auth "Google Drive API — Choose Drive API scopes"
[2]: https://developers.google.com/workspace/drive/api/guides/manage-uploads "Google Drive API — Upload file data"

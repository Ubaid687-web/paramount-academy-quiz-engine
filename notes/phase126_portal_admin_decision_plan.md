# Portal Admin Decision Sheet — Capability Extensions

## Recommended Decision

Approve the first two internal improvements together, and keep external connectors disabled for now. They improve operational control without changing the factual-source rule, adding provider cost, or giving a third party access to curriculum content.

| Choice | Recommendation | What changes | What does not change |
|---|---|---|---|
| A. Exception alerts | **Approve** | The owner receives a single in-product operational alert when an OCR job fails, when extraction leaves a source requiring review, or when generation has no usable provider result. | No source text, student data, API key, prompt, or question content leaves the project. No teacher or student receives these alerts. |
| B. Curriculum-governance skill | **Approve** | Create a concise reusable maintenance skill for future agents: grade separation, textbook-only facts, paper-style-only references, past-paper chronology, activation, and evidence checks. | It does not alter the website, database, questions, or sources. It contains no curriculum text or credential. |
| C. Google Drive source picker | **Defer** | If approved later, Portal Admin can choose one Drive file and copy it into the existing controlled S3 intake pipeline. | Drive will not become a live source, a bulk sync, or a bypass around review/activation. This requires Google authorization and a separate implementation review. |
| D. GitHub export | **Defer** | Optional owner-controlled code backup/export. | It is not a runtime feature and does not export secrets, database data, PDFs, or student information. |

## Guardrails for Option A

The system must deduplicate alert state by source or generation job. A source should not create repeated alerts while it remains in the same failure/review state. Alerts must name the subject, grade, and non-sensitive status only—for example, “Grade 9 Chemistry textbook requires OCR review”—and point the owner to the existing Portal Admin workspace.

## Guardrails for Option B

The skill must be under 500 lines, use only project-specific rules that are otherwise easy to lose across sessions, and require an evidence check before any source, provider, or curriculum change. It must explicitly reject live web content as a factual source and require Portal Admin activation.

## Why External Connectors Are Not Being Enabled Now

The current system already contains the required runtime foundations: secure staff roles, protected S3 source storage, OCR scheduling on demand, provider fallback, operational telemetry, and a grade-local curriculum flow. Adding Google Workspace, a monitoring vendor, messaging, or another model today would introduce authorization, privacy, cost, and support obligations before a verified gap exists. The only external candidate with a plausible future benefit is a narrow Google Drive picker for the owner’s own source files; it should be implemented only if that is genuinely how the Academy stores its PDFs.

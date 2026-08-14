# Paramount Academy: FBISE-Aligned Reusable Source Lifecycle Roadmap

## Decision

The platform should evolve into a **controlled Curriculum Library**, not an unrestricted “upload any PDF and generate questions” tool. Its purpose is to help students gain marks in FBISE examinations through accurate preparation. Therefore, every generated assessment must remain traceable to an approved textbook source, while model and past papers may guide format and balance but must never become the factual source for questions.

> **Textbooks determine what may be asked. Pattern papers determine how approved textbook content should be assessed.**

The previously uploaded Grade IX Physics document remains a **quality-design reference only**. It contributes accessible language, source traceability, cognitive tagging, and professional paper layout guidance. It cannot alter Grade 10 marks, section counts, OR structure, or source boundaries.

## What Already Exists

| Capability | Current status | Strength | Limitation to address deliberately |
|---|---|---|---|
| Versioned curriculum editions | Implemented | A replacement book is a linked draft; history is preserved. | Grade and subject are currently limited to Grade 10 Physics, Chemistry, and Computer Science. |
| Textbook upload and extraction | Implemented | PDF/TXT can be stored, extracted, and reviewed before chapter use. | Chapter confirmation remains operationally manual; it needs clearer review gates and status visibility. |
| Active edition control | Implemented | Only one reviewed active edition is exposed for a grade/subject; activation archives the prior active edition. | The activation checklist should be visible before the action is enabled. |
| Pattern-paper intake | Implemented | Model/past-paper files have their own draft/extracted/active lifecycle. | Pattern structure is not yet captured in a structured, reviewable profile. |
| Source-safe generation | Implemented | Questions use approved textbook scope or explicit custom text; paper sources supply guidance only. | The interface should make this distinction obvious to Portal Admin. |
| Teacher workflow | Implemented | Teachers see approved choices rather than raw documents. | Teachers need a compact “current source” label, not technical intake controls. |

## Non-Negotiable Governance Rules

| Rule | Required system behaviour |
|---|---|
| **No unsupported content** | A generated question must contain a textbook source reference and learning objective. A source that is not active and reviewed cannot enter the generator. |
| **Separate roles** | Textbook, pattern paper, and teacher custom material are distinct source classes with different permissions and labels. |
| **No silent replacement** | A new textbook is always a draft edition linked to the outgoing edition. It cannot overwrite, delete, or silently change historical quizzes. |
| **One approved version at a time** | Activating a replacement archives the prior active edition only after the new edition passes all review gates. |
| **Pattern is not content** | Model/past papers can guide section layout, marks, OR alternatives, language register, and cognitive balance. They cannot be quoted as factual source text for a new question. |
| **Human approval before publication** | AI may extract, suggest, and flag; Portal Admin must confirm source, chapters, pattern profile, and activation. |
| **Custom text is temporary** | Pasted/uploaded custom content is bound to its specific assessment draft and is never treated as an approved textbook edition. |

## Target Portal Admin Experience

The correct experience is one quiet, admin-only **Curriculum Library** with a small number of purposeful stages. Teachers should not need to see books, OCR, extraction logs, or pattern metadata while preparing assessments.

| Stage | Portal Admin action | System safeguard | Teacher visibility |
|---|---|---|---|
| 1. Catalogue | Select Grade → Subject → Board. | Only configured combinations can accept intake. | Subject name and current edition only. |
| 2. Book intake | Create a new subject edition or replace the active edition; upload one textbook PDF/TXT. | New editions are `draft`; original hash, file, uploader, and extraction status are preserved. | None until activation. |
| 3. Chapter review | Review extracted chapter suggestions, pages, titles, and content; mark chapters active. | Activation is blocked until at least one reviewed active chapter exists. | Approved chapter/scope selectors only. |
| 4. Pattern intake | Upload a model paper or past paper, name its academic year, and review extracted structure. | Pattern remains `draft` until extraction and review are complete. | “Pattern guidance available” only. |
| 5. Pattern profile | Confirm section labels, question forms, marks, OR rule, and evidence notes from the supplied paper. | Profile is tied to the exact uploaded file/version and can be archived. | Board-style guidance, never raw paper text. |
| 6. Scope setup | Confirm half-chapter, block, and half-syllabus reusable scopes. | Each scope is linked to the active edition and reviewed chapter IDs. | Simple scope options in the generator. |
| 7. Activate | Review the readiness checklist and activate edition/pattern. | Replaces the active edition only after confirmation; old edition is archived. | New edition automatically becomes selectable. |

## Required Readiness Checklist

An edition should show **Not ready**, **Ready for review**, or **Ready to activate**. Activation must require all applicable items below.

| Check | Book edition | Pattern paper |
|---|---:|---:|
| File safely stored with original filename and hash | Required | Required |
| Extraction completed without unresolved failure | Required | Required |
| Admin reviewed source identity and board/grade/subject match | Required | Required |
| At least one reviewed active chapter | Required | Not applicable |
| Structured section/marks/OR profile confirmed from the supplied file | Not applicable | Required |
| Source role clearly labelled | “Question content source” | “Assessment-style guidance only” |
| Activation history and approver recorded | Required | Required |

## FBISE Assessment Quality Controls

The product should store a **quality target profile** separately from a pattern paper. It must be reviewable and configurable per grade/subject/board, not silently inferred.

| Control | Initial policy | Evidence boundary |
|---|---|---|
| Cognitive levels | K/U/A tag on every question; use the supplied quality target as a review goal. | The Grade IX document is guidance only; a Grade 10 paper profile changes exact targets only after evidence review. |
| Language | Plain, accessible wording at the textbook register. | Every claim and formula remains textbook-grounded. |
| Scenario design | New everyday scenario where it tests a verified concept and does not copy a source question. | No invented syllabus concept, statistic, experiment result, or formula. |
| MCQ delivery | Online MCQ practice plus printable paper and solution key. | Question content from approved textbook/custom source only. |
| Short and long delivery | Printable paper and solution key only. | Marks and OR structure follow the active reviewed pattern profile where available. |
| Solution quality | Explain in learnable language; include marking guide, comparison-table data, and diagram/sketch placeholders when source-supported. | No unsupported answer material. |

## Recommended Implementation Sequence

This sequence deliberately completes the existing safe foundation before generalising it. It avoids turning the platform into an uncontrolled file bucket.

### Release 1 — Complete the Existing Grade 10 Lifecycle

Build a clear readiness checklist and structured **paper-pattern profile** on top of the existing Grade 10, three-subject system. Add review fields for section names, compulsory/choice count, marks, OR arrangement, duration, and evidence notes. No new grades or arbitrary subjects are introduced in this release.

**Acceptance standard:** An administrator can replace a Grade 10 Physics/Chemistry/Computer Science book, review its chapters, upload a current paper, confirm its structured profile, and activate the new edition without developer involvement.

### Release 2 — Programme Catalogue for New Subjects and Grades

Introduce controlled configuration records for `Board`, `Grade`, and `Subject`. Replace hard-coded Grade 10 and three-subject enums only after migration planning. New combinations begin as `intake_only`; they do not appear to teachers or permit generation until their first book edition, chapter review, and quality/pattern status are approved.

**Acceptance standard:** Portal Admin can create a new subject/grade configuration, but the system prevents it from appearing in the generator before source readiness is confirmed.

### Release 3 — Assisted Review, Not Autonomous Approval

Add AI-assisted chapter-boundary suggestions, duplicate-file detection by content hash, and pattern-profile extraction suggestions. Keep every proposed result in a review queue. Never let AI activate a source, invent a syllabus, or infer unprovided pattern facts.

**Acceptance standard:** AI reduces clerical work but every activated chapter and pattern fact is confirmed by Portal Admin with evidence attached.

### Release 4 — Exam-Readiness Review Dashboard

Add an administrator-only review dashboard showing which active sources support each paper type, source coverage by chapter, K/U/A target versus actual draft balance, paper-pattern provenance, and drafts awaiting approval. This is for quality assurance, not a student-facing analytics feature.

**Acceptance standard:** Before issuing an assessment, the administrator can see the selected source edition, chapter scope, pattern profile, cognitive distribution, and warnings in one place.

## What Should Not Be Built Yet

The following would weaken reliability if introduced prematurely:

| Do not add yet | Reason |
|---|---|
| Free-form subject creation in the teacher generator | It would allow a subject to appear without textbook or pattern controls. |
| Automatic activation after PDF upload | OCR or filename alone cannot prove grade, edition, or chapter correctness. |
| Use of raw past-paper text as question source | It risks copying/exam leakage and violates the defined source-role boundary. |
| Automatic exact Grade 10 pattern claims from the Grade IX design document | The document is guidance, not Grade 10 evidence. |
| Publication of generated drafts without Portal Admin review | It removes the final guard against scope, wording, marks, and pattern errors. |

## Approval Needed Before the Next Build

Approve **Release 1** first: complete the existing Grade 10 Curriculum Library with a visible readiness checklist and structured paper-pattern profile. This will make the current three-subject system genuinely reusable when books or papers change, without risking source safety. Release 2 should begin only after the Grade 10 lifecycle has been used successfully with at least one real textbook replacement and one real current-year paper intake.

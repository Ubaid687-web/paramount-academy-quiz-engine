# Paramount Academy Quiz Engine: Reusable Curriculum Lifecycle Recommendation

## Executive recommendation

**Your concern is correct.** The current system is safe for the existing Grade 10 material, but it is only partly reusable. It already stores versioned curriculum sets, uploaded sources, reviewed chapters, half-chapter segments, reusable scopes, and source snapshots. However, it does not yet expose those capabilities as one reliable self-service workflow for new books, changed editions, new subjects, or paper-pattern uploads.

The recommended direction is **not** to make the teacher builder show raw books or every paper. Instead, create a separate, Portal Admin-only **Curriculum Library**. That library should let an administrator add, review, version, activate, archive, and visibly track material without needing development support for normal content updates. Teachers then see only approved, concise source choices in the quiz builder.

> **Principle:** Administrators manage evidence; teachers create assessments from approved evidence; students never see raw source material.

## Current architecture: what is already reusable

| Existing capability | Current status | Why it matters |
|---|---|---|
| Versioned curriculum set | Implemented | A replacement book can be represented as a new set while old quiz drafts retain their historical source snapshot. |
| Managed file source record | Implemented | PDFs/TXT files are stored with their filename, hash, extraction status, page count, and extracted text. |
| Reviewed chapters and segments | Implemented | The system can generate from selected chapters and half-chapters rather than using the whole book. |
| Reusable scope templates | Implemented | Admins can define blocks such as a unit, half syllabus, or selected chapter group once and reuse them. |
| Activation and archiving states | Implemented in data model | Only an approved active curriculum should become available to quiz generation. |
| Paper-pattern records | Implemented in data model | Model and past papers can guide assessment style without becoming examinable source content. |
| Source snapshot on generated work | Implemented | A generated assessment remains traceable even after a book changes later. |

## Current gaps: why it still feels dependent on me

| Gap | Practical result today | Required correction |
|---|---|---|
| Curriculum Library is not a clear operational module in the regular Portal Admin experience | You cannot confidently see which books, editions, papers, or review states are available. | Add a material dashboard with status, source, version, and activation visibility. |
| Subject and grade choices are hard-coded to current Grade 10 subjects | Adding a new subject or Grade 9 requires engineering changes. | Move grade, subject, board, and programme into administrator-managed catalog records. |
| Chapter preparation is manual after upload | A new book requires someone technical to guide extraction and chapter setup. | Create an extraction review queue with suggested chapters, page ranges, editable titles, and a publish checklist. |
| No self-service paper-pattern intake screen | New model papers or annual papers cannot be uploaded, reviewed, compared, and activated through a clear workflow. | Add a dedicated Paper Pattern area under the same Curriculum Library. |
| No replacement-book workflow visible to administrators | A book change feels like starting over and risks uncertainty. | Add “Replace active edition” so a new draft version is linked to the old edition and activation is controlled. |
| Teacher builder hides source provenance too completely | The teacher can select chapters but cannot see a short assurance of which approved edition and paper evidence is active. | Display a compact “Using: [edition] · [chapter count] · [pattern status]” source summary. |

## Recommended operating model

### 1. Curriculum Library — Portal Admin only

The Portal Admin opens one **Curriculum Library** area, rather than relying on the quiz builder or a developer conversation. Its first screen should show only clear status cards:

| Library card | Information shown | Main action |
|---|---|---|
| Grade 10 Physics | Active edition, number of verified chapters, active paper-pattern sources, last review date | Manage |
| Grade 10 Chemistry | Custom-source-only or active edition state, reason if blocked | Add or replace textbook |
| Grade 10 Computer Science | Active edition, units reviewed, paper-pattern sources | Manage |
| Add programme | Grade, board, subject | Start intake |

The **Manage** screen should contain five short tabs: **Books**, **Chapters**, **Paper Patterns**, **Scopes**, and **History**. It should not expose raw database terminology.

### 2. Book intake and review workflow

| Step | Portal Admin action | Automated platform action | Required human decision |
|---|---|---|---|
| A. Create edition | Select grade, board, subject, title, and edition/year | Creates a draft curriculum version | Confirm that this is the correct book. |
| B. Upload book | Upload one PDF or TXT file | Stores the original file, extracts text, records page count and extraction result | Confirm the text is readable. |
| C. Review structure | Review suggested table of contents/chapter candidates | Creates editable chapter suggestions with page ranges | Accept, rename, merge, split, or reject chapters. |
| D. Verify scope | Open sampled extracted text by chapter | Validates chapter text is present and traceable to the source file | Confirm chapter boundaries and labels. |
| E. Activate | Press “Activate this edition” | Archives the previous active edition only after confirmation and preserves historical draft snapshots | Confirm the replacement is safe for teachers. |

The system should **never automatically replace an active book** just because a new file was uploaded. Upload produces a draft edition; activation is a deliberate administrator decision.

### 3. Paper-pattern intake workflow

Books define **what may be tested**. Model papers and past papers define **how it should be assessed**. They must remain separate.

| Paper Pattern step | Result |
|---|---|
| Upload as Model Paper / Past Paper / Current-Year Paper | A source record linked to grade and subject, not to textbook content. |
| Extract and preview | Admin verifies readable text and correct year/set. |
| Record pattern facts | Section labels, item counts, marks, OR structure, and duration only when directly visible in the supplied paper. |
| Compare current year | Show a clear change log against the currently active pattern evidence. |
| Activate | Enables style guidance for drafts; it never gives the AI permission to copy questions or use unsupplied content. |

### 4. Teacher experience: concise, not technical

Teachers should not upload official books or activate sources during normal assessment creation. Their builder should remain short:

1. Select **grade and subject**.
2. Select **assessment output**: online MCQ, printable MCQ, printable short paper, or printable long paper.
3. Select **approved chapter/scope** or **custom lesson material**.
4. See a small source assurance label, for example:

> Using **FBISE Grade 10 Physics — verified edition 2026** · 2 selected chapters · 3 active paper-pattern sources

5. Generate a **draft**, review it, then download or send it for Portal Admin approval.

This keeps the teacher workflow calm while retaining evidence and version traceability behind the scenes.

## How book changes should work

When an edition changes, the administrator should not delete the old book. They should select **Replace active edition**, upload the new file, complete review, and activate it. The system should then:

1. Keep existing generated quizzes and printable drafts tied to their original source snapshots.
2. Mark the former edition **archived** for future generation while preserving it for audit.
3. Route new teacher generation only to the newly active edition.
4. Show a clear warning if a teacher opens an old draft created from an archived edition.
5. Keep paper-pattern sources independent, so a board pattern can remain active across a book replacement only when the admin confirms it still applies.

## How new subjects and grades should work

The next architecture step should replace the hard-coded Grade 10 Physics/Chemistry/Computer Science catalog with an administrator-managed **Programme Catalog**.

| Data level | Example | Owner |
|---|---|---|
| Programme | FBISE Secondary | Portal Admin |
| Grade | Grade 9 / Grade 10 | Portal Admin |
| Subject | Biology, Mathematics, English, Physics | Portal Admin |
| Curriculum edition | Grade 10 Physics 2026 edition | Portal Admin through intake workflow |
| Source file | Official textbook PDF, model paper, 2025 annual paper | Portal Admin through upload/review |
| Teacher assessment scope | Chapter 3, Chapters 1–4, Half Syllabus A | Teacher selects from approved options |

Adding a subject then becomes an operational task—not a request to a developer:

> Create subject → upload textbook → review chapters → upload paper patterns → activate → teachers can use it.

## Reliability controls that must remain non-negotiable

| Control | Reason |
|---|---|
| Draft → review → active lifecycle | Prevents a wrong or incomplete upload from influencing student assessments. |
| File hash and edition label | Makes duplicate or changed files detectable. |
| Immutable source snapshots on generated drafts | Preserves accountability after materials change. |
| Separate textbook and paper-pattern roles | Prevents paper questions from becoming source content and prevents unsupported hallucination. |
| Admin-only activation | Avoids accidental curriculum replacement by a teacher. |
| Archived rather than deleted sources | Enables audit, troubleshooting, and historical draft review. |
| Upload/extraction status with actionable retry state | Makes failures understandable without technical support. |

## Recommended implementation order

| Priority | Deliverable | Why it comes first |
|---|---|---|
| 1 | Curriculum Library dashboard with visible book/paper statuses | Solves the current lack of visibility immediately. |
| 2 | Book replacement and activation workflow | Makes edition changes safe and repeatable. |
| 3 | Paper Pattern intake and comparison workflow | Lets you add current-year papers yourself without confusing them with textbooks. |
| 4 | Chapter-review assistant and editable extraction queue | Removes the need for developer involvement after a new book upload. |
| 5 | Programme Catalog for new grades and subjects | Makes Grade 9 and future subjects operationally reusable. |
| 6 | Teacher-facing source assurance labels | Gives staff confidence without exposing complexity. |

## Decision

**Do not leave the system as a developer-operated source store.** The correct production design is a self-service Portal Admin Curriculum Library with controlled approval gates. The underlying database model already provides much of the foundation; the remaining work is to expose it as a complete, visible, safe lifecycle and to generalise the currently fixed Grade 10 subject/grade catalog.

This approach retains the project’s core rule: **every generated question remains grounded only in material you uploaded and approved**, while making routine material maintenance independent of future developer intervention.

# Paramount Academy: FBISE Scope-Controlled Quiz Architecture

**Purpose.** This architecture turns the current document-to-draft generator into a maintainable quiz engine for **10th-grade FBISE Physics, Chemistry, and Computer Science**. It is deliberately curriculum-data-driven: textbook editions may change without changing the generator code, and every generated question remains traceable to the chapter text used to create it.

## Product Boundary

The immediate product is an **admin-operated MCQ draft engine**. An administrator selects a curriculum edition, subject, scope, difficulty profile, and question count. The system composes source text only from the selected chapters, generates a source-grounded draft, and requires admin review before any student assignment or publication. Students do not upload source material, generate production quizzes, manage sharing links, or use spaced-repetition features in this release.

| Product area | Included in the current release | Explicitly deferred |
|---|---|---|
| Curriculum | 10th-grade Physics, Chemistry, Computer Science; replaceable FBISE textbook editions | Biology and 9th grade |
| Generation | Single chapter, selected chapters, first/second half of syllabus, configured block; easy, medium, hard, or FBISE-balanced | Automatic publication and free-form, untraceable generation |
| Quality | Source reference and learning objective on every item; validation; draft-only status | Automatic correctness certification |
| Portal integration | Stable API contract and published-quiz data for the Paramount Academy portal | Sharing/collaboration and spaced-repetition student workflows |

## Canonical Data Model

The database must treat a textbook **edition** as a versioned curriculum set, rather than attaching quizzes directly to a filename. Each source file and extracted chapter belongs to one curriculum set. A replacement textbook produces a new set; it does not overwrite the source used by older drafts and published quizzes.

| Entity | Responsibility | Important fields |
|---|---|---|
| `curriculumSets` | Versioned syllabus/edition for one subject and grade | `grade`, `subject`, `label`, `board`, `isActive`, `status`, `replacesSetId` |
| `curriculumSources` | Original uploaded PDF/TXT and extraction metadata | `curriculumSetId`, `storageKey`, `originalFileName`, `mimeType`, `extractionStatus`, `pageCount`, `extractedAt` |
| `curriculumChapters` | Reviewable chapter-level text used as generation evidence | `curriculumSetId`, `sourceId`, `sequence`, `code`, `title`, `blockKey`, `partKey`, `startPage`, `endPage`, `contentText`, `isActive` |
| `curriculumChapterSegments` | Admin-confirmed, ordered intra-chapter regions for half-chapter generation | `chapterId`, `sequence`, `label`, `startPage`, `endPage`, `startOffset`, `endOffset`, `contentText`, `isActive` |
| `curriculumScopeTemplates` | Admin-defined reusable half-syllabus and block groupings | `curriculumSetId`, `scopeKind`, `label`, `description`, `isActive` |
| `curriculumScopeTemplateChapters` | Ordered membership of each reusable scope template | `scopeTemplateId`, `chapterId`, `sequence` |
| `generationJobs` | Audit record of one draft request | `curriculumSetId`, `scopeType`, `selectedChapterIds`, `selectedSegmentIds`, `difficulty`, `sourceSnapshot`, `status` |
| `quizzes` | Draft/review/published quiz record | `publicationStatus`, `curriculumSetId`, `scopeSnapshot`, `difficultyProfile`, `reviewedBy`, `reviewedAt` |

`sourceSnapshot`, `scopeSnapshot`, and `selectedChapterIds` are immutable generation metadata. They preserve what was selected and supplied to the model even if an administrator later archives a chapter or activates a new textbook edition.

> **Design rule:** Existing quizzes are never silently re-grounded when books change. The active curriculum set controls new drafts; the generation snapshot explains historical drafts and published quizzes.

## Scope Resolution Rules

The user-visible scope selector has five modes. It always resolves to an explicit ordered list of chapter IDs and, where relevant, segment IDs before generation. The server—not the browser—loads the corresponding text and produces the source snapshot.

| Scope mode | Admin action | Server-side resolution | Validation |
|---|---|---|---|
| Single chapter | Select exactly one chapter | That chapter's active source text | Reject zero or more than one selected chapter |
| Half chapter | Select one chapter and an admin-confirmed first or second segment | Exactly one active segment belonging to the selected chapter | Reject unconfirmed, overlapping, empty, or cross-chapter segments |
| Multiple chapters | Select two or more named chapters | Selected chapters in curriculum sequence | Require at least two chapters from one active curriculum set |
| Half syllabus | Select a configured “first half” or “second half” template | Template membership ordered by sequence | Template must be active and contain at least one active chapter |
| Full block | Select a configured subject block | Template membership ordered by sequence | Block must be active and contain at least one active chapter |

Half-chapter, half-syllabus, and full-block definitions are **admin-confirmed stored boundaries/templates**, not unverified assumptions based on a file's page count. During curriculum intake, the system may propose a midpoint from headings, page ranges, and text length; the administrator must confirm or adjust the two segments before either can be used for draft generation. A valid chapter has two sequential non-overlapping segments—normally labelled “First half” and “Second half”—whose combined page/character ranges cover the reviewed chapter content. This supports uneven chapter lengths, subtopic boundaries, and revised editions without code changes.

The half-chapter source snapshot records the parent chapter identity, chosen segment identity, label, start and end pages, start and end text offsets, and the exact text supplied to generation. A later edit to a chapter boundary or a replacement textbook cannot change the evidence behind an existing draft.

## Generation Contract

The server receives a compact request: curriculum set identifier, scope type, selected chapter IDs or scope-template identifier, difficulty profile, quiz title, and question count. It then builds the untrusted source block from approved chapter records, wraps it in the established source-data boundary, and invokes the existing structured MCQ generator.

| Input or output | Required behavior |
|---|---|
| Subject and grade | Must match the selected active curriculum set; grade is fixed to 10 in this release |
| Difficulty | `balanced` means FBISE 30% easy / 40% medium / 30% hard. Focus profiles are retained only when intentionally selected by an admin |
| Question count | Default board-paper suggestion: 12 for Physics/Chemistry and 13 for Computer Science; admin may choose another valid draft count |
| MCQ source fields | Every item must contain `sourceReference` and `learningObjective`; the validator rejects incomplete items |
| Draft status | New records are `draft` and remain unavailable to students until a reviewer explicitly publishes or assigns them |
| Prompt safety | Extracted chapter text is data, never instructions; only server-resolved active chapter text enters the model prompt |

The chapter text is concatenated with clear chapter headings and bounded per-chapter excerpts if needed to stay within the model's input limit. The generated draft preserves chapter titles and page ranges in its source references, enabling an admin to trace each question during review.

## Curriculum Intake and Edition Replacement

The intake flow remains compatible with one-file-at-a-time uploads. Files are stored externally; relational records contain metadata, boundaries, and searchable extracted chapter text rather than raw binary data.

1. An admin creates a curriculum set, such as “FBISE Grade 10 Physics — 2026 edition.”
2. The admin uploads one PDF or TXT source. The server stores the original file, extracts readable text, and rejects image-only/scanned PDFs that cannot be safely grounded.
3. The system proposes chapter boundaries from the table of contents or recognised chapter headings. The admin reviews and edits titles, sequence, page ranges, and grouping templates before activating the set.
4. New quiz drafts query only active chapters from the active set. When a book changes, the admin creates and verifies a new set, then activates it and archives—not deletes—the old set.

## Administration and Portal Integration

The UI has two distinct routes. **Curriculum management** is restricted to admins and handles intake, chapter review, templates, activation, and retirement. **Quiz generation** is restricted to admins and contains the class/subject/scope/difficulty controls, question-count control, draft preview, and review workflow. The student-facing Paramount Academy portal only consumes quiz records whose publication status is appropriate for student access.

| Integration point | Contract |
|---|---|
| Generate draft | `subject`, `grade`, `scope`, `chapterIds`, `segmentIds`, or `scopeTemplateId`, `difficulty`, `numQuestions`, and optional title |
| Draft preview | Validated questions, source reference, learning objective, review warnings, selected scope snapshot |
| Review/publish | Reviewer identity, timestamp, decision, and optional review note are persisted with the quiz |
| Portal fetch | Published or assigned quizzes only; student attempts retain the existing quiz/attempt model |

## Delivery Sequence

The implementation proceeds in this order to avoid a UI that pretends to be chapter-aware without persisted sources: first add the versioned curriculum schema and server contracts; then build admin scope controls, including half-chapter segment review; then connect scoped text to the generator; then remove or hide the unrelated sharing and spaced-repetition paths and rename user-facing product copy to Paramount Academy. Each stage requires tests for authorization, scope resolution, source snapshots, and draft validation.

## Acceptance Criteria

The feature is ready for integration when an authorized admin can activate one 10th-grade curriculum edition, select Physics, Chemistry, or Computer Science, choose an allowed chapter, half-chapter, multi-chapter, half-syllabus, or configured block scope, choose a difficulty distribution, create a **draft-only** source-grounded MCQ set, and trace each generated item to the selected chapter or segment. Replacing a textbook edition must affect future generation only and preserve the audit trail for existing quizzes.

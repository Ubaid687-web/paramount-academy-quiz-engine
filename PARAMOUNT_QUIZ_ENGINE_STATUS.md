# Paramount Academy Quiz Engine: Verified Status Report

**Report date:** August 13, 2026 (GMT+5)  
**Platform state:** Development server running; TypeScript diagnostics clean; 51 automated tests passing across 15 test files.

## Current System Status

The platform is now branded as **Paramount Academy** and focused on the 10th-grade FBISE MCQ workflow for **Physics, Chemistry, and Computer Science**. It supports a controlled admin path from curriculum source ingestion to a reviewable MCQ draft. Generated quizzes remain drafts by default and are not automatically published or assigned to students.

| Capability | Verified implementation status |
|---|---|
| PDF/TXT source intake | PDF and TXT uploads populate the builder; text extraction is server-side; scanned/image-only PDFs are rejected with a readable error. |
| Generation feedback | The builder shows staged, accessible generation progress and a completion transition. |
| MCQ quantity | Question recommendations react to source length/complexity; the admin can adjust the count up to 100. |
| Source safety | Uploaded material is treated as untrusted data; the model prompt isolates it from system instructions. |
| Draft quality | Each question requires a `sourceReference` and `learningObjective`; invalid options, answers, duplicate options, and incomplete output are rejected. |
| FBISE difficulty | Easy, medium, hard, and balanced profiles are available. Balanced uses the 30% easy / 40% medium / 30% hard profile. |
| Scope selection | Admins can choose uploaded material, a single chapter, a half-chapter, multiple chapters, a saved half-syllabus, or a saved block. |
| Curriculum lifecycle | Versioned curriculum sets, sources, chapters, half-chapter segments, and reusable scope templates are stored separately from generated quizzes. Activating a new edition archives the prior active set for that subject. |
| Audit trail | The generation job and saved draft preserve curriculum-set identity, selected chapters/segments, scope snapshot, difficulty profile, and source text. |
| Publication safety | Saved AI quizzes are created with `draft` publication status; review is required before student availability. |

## Material Coverage Already Analysed

The FBISE source analysis and specifications are complete for the following 10th-grade materials. These analyses define the current subject profiles and board-paper defaults.

| Subject | Analysed material | Current board-paper MCQ default |
|---|---|---|
| Physics | Textbook and 2025 past paper | 12 MCQs / 12 marks |
| Chemistry | Textbook, model paper, 2024 past paper, and 2025 past paper | 12 MCQs / 12 marks |
| Computer Science | Textbook plus 2024 and 2025 past papers | 13 MCQs / 13 marks |

The detailed implementation design is documented in `PARAMOUNT_FBISE_SCOPE_ARCHITECTURE.md`; the analysed subject specifications are recorded in `paramount-academy-quiz-specs-final.md`.

> **Important setup distinction:** The books and papers have been analysed for architecture and assessment design, but no curriculum set is automatically activated in the live database. This is intentional: an admin must confirm source text and chapter boundaries before it becomes generation evidence.

## Administrator Setup Required Next

Before a chapter-, half-chapter-, half-syllabus-, or block-based draft can be generated, an authorised Paramount Academy administrator should complete this sequence in the live application.

1. Open **Curriculum Management** at `/curriculum` and create a draft curriculum set for one 10th-grade subject and edition.
2. Upload one text-based PDF or TXT source file at a time. The platform stores the original file and extracts readable text.
3. Review and save the applicable chapter text. For half-chapter practice, confirm the first and second segments. For half-syllabus or block practice, create a reusable scope template from reviewed chapters.
4. Activate the curriculum set. It then appears in the Quiz Builder at `/generate` for the selected subject.
5. Create an MCQ draft, review every question, answer, source reference, and learning objective, then use the academy portal's publication/assignment process only after approval.

## Paramount Academy Portal Integration

The Replit-based portal should treat this service as the **admin quiz engine**, not as a second RAG application. It should send staff to the curriculum-management and quiz-builder routes, and expose only reviewed/published quiz records to students. The current implementation is ready for a portal-facing integration layer that maps its own academy roles and assignments to the saved quiz records.

The previous sharing and spaced-review product surface has been removed from the active frontend and API contract so the delivered product stays focused on curriculum-grounded MCQ drafting and practice.

## Verification

The final validation run completed successfully:

| Check | Result |
|---|---|
| Automated tests | **51 passed** across 15 test files |
| TypeScript | `tsc --noEmit` passed |
| Development server | Running |
| Database migrations | Curriculum/scope/review schema changes applied successfully |

The test suite includes PDF extraction, PDF-to-draft validation, TXT activation, progress accessibility, scope resolution, admin restrictions, source-snapshot persistence, scoped draft routing, quiz attempts, and draft saving.

# Grade 10 Physics Scope and Teacher Source Workflow Status

## Active approved source

The first approved curriculum source is now active for **FBISE Grade 10 Physics (2025 edition)**. Its OCR-derived transcript is stored under the managed curriculum key `curriculum/grade-10/physics/2025/fbise-grade10-physics-2025-ocr-transcript.txt`, and the corresponding active curriculum set is **ID 1**.

| Scope asset | Active record |
|---|---:|
| Curriculum set | 1 |
| Subject | Physics |
| Grade | 10 |
| Reviewed chapters | 12 (Units 10–21) |
| Reviewed half-chapter segments | 24 |
| Reusable scope templates | 4 |
| Lifecycle state | Active |

The saved chapter boundaries and half-chapter segments create stable approved-source inputs for draft generation. Scope resolution records immutable provenance snapshots, so an MCQ draft remains traceable to the approved curriculum content selected when it was generated.

## Teacher-facing source choice

The quiz builder now presents two mutually exclusive source paths in the lesson-material area:

| Path | Intended use | Generation input |
|---|---|---|
| **Approved textbook chapters** | FBISE-aligned chapter, multi-chapter, half-chapter, and configured study-block drafts | Reviewed Physics chapters from active curriculum set 1 |
| **My custom lesson material** | A teacher's individual lesson, handout, pasted text, or one uploaded PDF/TXT file | Extracted or pasted teacher-provided content |

Teachers can continue to choose the question count and the FBISE-aligned difficulty profile. Generated assessments remain **MCQ-only drafts** and continue to require source references, learning objectives, validation, and administrative review before publication.

The class and subject context remains available through the visible **Teacher context** area. Legacy duplicate sidebar scope controls are hidden; they no longer compete with the two clear source paths.

## Availability boundaries

Physics is the only active approved Grade 10 chapter catalog at this checkpoint. Chemistry and Computer Science remain part of the planned Grade 10 product scope, but their approved textbook sources have not yet been activated. Grade 9 remains intentionally locked pending confirmation of the revised FBISE pattern and approved materials.

## Verification

The active-scope and two-path workflow was verified through the UI and integration coverage. The project suite completed with **16 passing test files and 55 passing tests**, and TypeScript completed without errors. The real-PDF upload integration test now permits the PDF parser's one-time initialization time without weakening its extraction assertions.

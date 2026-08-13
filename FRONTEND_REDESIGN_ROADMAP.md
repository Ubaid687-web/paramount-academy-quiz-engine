# Paramount Academy Quiz Engine: Frontend Roadmap

## Confirmed Product Direction

The quiz engine is an **academy portal module** focused on MCQ assessment. It is not a general quiz website and it should not show duplicated “create” actions. The new Quiz Centre has one primary path: **Open Quiz Builder**. Curriculum management and draft creation remain distinct administrator actions in the portal navigation.

| Area | Confirmed position |
|---|---|
| Assessment type | MCQs only in the current module. |
| Grade 10 | The active priority. Physics, Chemistry, and Computer Science analysis/specifications are completed. Curriculum sets still require admin source review and activation before scoped generation. |
| Grade 9 | The frontend and future workflow are represented separately. Its MCQ generator is disabled until the revised FBISE pattern and approved books/papers are confirmed. Grade 10 rules are never reused for Grade 9. |
| Content source | Source-grounded, one file at a time. Admins upload/review evidence, define chapters and half-chapters, then activate the edition. |
| Generated content | Draft only. Every item needs a source reference and learning objective before review/publication. |

## Portal Workflow

1. **Curriculum**: An administrator creates or selects a curriculum set, uploads one text-based PDF or TXT file, reviews source text, confirms chapter/half-chapter boundaries, and activates the edition.
2. **Build Draft**: The administrator chooses Grade 10, subject, source scope, question count, and difficulty profile. The builder creates an MCQ draft only.
3. **Review and assignment**: The academy portal should expose only reviewed/published records to students and manage classes, assignments, and results in the Replit portal layer.

## Next Product Inputs

To turn Grade 9 from an intake-ready frontend state into a working generation flow, provide the revised Grade 9 FBISE textbook/paper pattern and confirm which subjects are in scope. The backend can then receive a separate Grade 9 curriculum configuration, difficulty profile, and board-paper defaults without affecting Grade 10.

For Grade 10 production setup, the next immediate action is to create and activate the first reviewed curriculum set at `/curriculum`, beginning with one subject and one source file at a time.

# Grade 10 Chemistry Source Recovery Notes

> **Corrected source status — 13 August 2026:** The user has confirmed that the stored 169-page file is **not** the Chemistry textbook they supplied. Although the historical filename and OCR record remain retained for audit purposes, their provenance cannot establish an exact match to the user-supplied textbook. Curriculum set `30001` must therefore be archived and must not be available for question generation, answer writing, source-grounded explanations, or approved chapter selection. No replacement source may be inferred or imported.

## Archived historical record

## Earlier candidate record — not approved for use

The user-provided file `FBISE10thChemistryPDFTextBookNewEdition.pdf` is a **169-page scanned textbook**. Its front matter identifies it as a National Book Foundation chemistry text and includes a 2020 copyright notice. The source does not expose usable native text, so curriculum intake requires page-preserving OCR.

The contents spread and subsequent source pages identify the following legacy Grade 10 Chemistry unit family: **Chemical Equilibrium**, **Acids, Bases and Salts**, **Organic Chemistry**, **Hydrocarbons**, **Biochemistry**, **Environmental Chemistry I: Atmosphere**, **Environmental Chemistry II: Water**, and **Chemical Industries**. The contents spread directly confirms starts for Units 10 (page 20), 12 (page 72), 14 (page 108), and 16 (page 144). Remaining boundaries will be verified against the recovered source pages before the set is activated.

## Historical edition-control note

This retained file must not be conflated with a newer 2026–2027 NBF/FBISE Chemistry edition or with the user's actual uploaded textbook. It remains preserved only as an archived audit artifact.

| Evidence | Finding |
|---|---|
| Uploaded textbook | 169 pages; scanned; NBF front matter; 2020 copyright notice |
| Uploaded contents spread | Units 9–16 sequence; confirmed selected starts at pp. 20, 72, 108, and 144 |
| Public reference | [StudyPlusPlus FBISE Grade 10 Chemistry listing](https://studyplusplus.com/fbise/books/10/chemistry) describes a distinct newer 13-chapter 2026–2027 edition |
| Public reference | [Taleem360 Federal Chemistry textbook listing](https://www.taleem360.com/10th-class-chemistry-federal-text-book-pdf-74a) notes that a newer 2025 edition is available |

## Current constraint

No MCQ generation, short question, long question, full-paper draft, answer key, explanation, or chapter scope may be based on this OCR text. Teachers may use the separate custom pasted/uploaded source path until the exact Chemistry textbook is verified and activated.

## Superseded activation record

The historical source was previously activated as **curriculum set 30001**. That activation is superseded by the corrected source-status decision above: its chapter records, segments, and templates are preserved only for audit and must not appear in the teacher builder.

| Verification item | Result |
|---|---|
| Managed source storage | OCR transcript stored through the project-managed storage path |
| Curriculum activation | Set 30001 is archived for Grade 10 Chemistry |
| Builder integration | Archived Chemistry chapter selection must remain unavailable |
| TypeScript | Clean |
| Non-database regression coverage | 14 test files / 46 tests passed |
| Remaining validation limitation | The database-backed `quiz.test.ts` and `e2e.test.ts` suites could not complete because the managed TiDB gateway intermittently timed out or failed DNS resolution from the workspace; this is recorded separately from the Chemistry activation itself. |

At the time of this note, an independent DNS-over-HTTPS lookup resolved the managed TiDB hostname, while the local sandbox resolver continued to return no result. This confirms the remaining regression follow-up is an environment connectivity issue rather than an unresolved Chemistry source or builder defect.

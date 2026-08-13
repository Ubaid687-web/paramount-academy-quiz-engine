# Grade 10 Chemistry Source Recovery Notes

## Verified candidate for curriculum intake

The user-provided file `FBISE10thChemistryPDFTextBookNewEdition.pdf` is a **169-page scanned textbook**. Its front matter identifies it as a National Book Foundation chemistry text and includes a 2020 copyright notice. The source does not expose usable native text, so curriculum intake requires page-preserving OCR.

The contents spread and subsequent source pages identify the following legacy Grade 10 Chemistry unit family: **Chemical Equilibrium**, **Acids, Bases and Salts**, **Organic Chemistry**, **Hydrocarbons**, **Biochemistry**, **Environmental Chemistry I: Atmosphere**, **Environmental Chemistry II: Water**, and **Chemical Industries**. The contents spread directly confirms starts for Units 10 (page 20), 12 (page 72), 14 (page 108), and 16 (page 144). Remaining boundaries will be verified against the recovered source pages before the set is activated.

## Edition-control decision

This uploaded book must be treated as its own **versioned curriculum source**. A public listing for a newer 2026–2027 NBF/FBISE Chemistry edition describes a different 13-chapter sequence numbered 1–13. It must not be conflated with the uploaded 8-unit, Units 9–16 source. The curriculum set will therefore use an explicit source-edition label and preserve its original page provenance.

| Evidence | Finding |
|---|---|
| Uploaded textbook | 169 pages; scanned; NBF front matter; 2020 copyright notice |
| Uploaded contents spread | Units 9–16 sequence; confirmed selected starts at pp. 20, 72, 108, and 144 |
| Public reference | [StudyPlusPlus FBISE Grade 10 Chemistry listing](https://studyplusplus.com/fbise/books/10/chemistry) describes a distinct newer 13-chapter 2026–2027 edition |
| Public reference | [Taleem360 Federal Chemistry textbook listing](https://www.taleem360.com/10th-class-chemistry-federal-text-book-pdf-74a) notes that a newer 2025 edition is available |

## Constraint

No MCQ generation will be based on OCR text until its chapter page ranges and per-chapter text quality are validated. This keeps the resulting drafts source-grounded and prevents the older source from being presented as the newer 13-chapter curriculum.

## Activation record

The reviewed source has now been activated as **curriculum set 30001**. It contains the eight Units 9–16 chapter records, sixteen half-chapter segments, and four reusable scope templates. The builder’s Chemistry route has focused UI coverage proving that an active catalog can expose **Unit 10: Acids, Bases and Salts** through the **Approved textbook chapters** path.

| Verification item | Result |
|---|---|
| Managed source storage | OCR transcript stored through the project-managed storage path |
| Curriculum activation | Set 30001 is active for Grade 10 Chemistry |
| Builder integration | Chemistry chapter selection covered in `aiAgentProgressUi.test.tsx` |
| TypeScript | Clean |
| Non-database regression coverage | 14 test files / 46 tests passed |
| Remaining validation limitation | The database-backed `quiz.test.ts` and `e2e.test.ts` suites could not complete because the managed TiDB gateway intermittently timed out or failed DNS resolution from the workspace; this is recorded separately from the Chemistry activation itself. |

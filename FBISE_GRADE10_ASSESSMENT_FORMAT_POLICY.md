# Grade 10 FBISE Assessment-Format Policy

## Purpose and Source Boundary

This policy translates only the **verified structure** of user-supplied Grade 10 model and annual papers into generation-format guidance. It covers Section A MCQs, Section B printable short-question pairs, Section C printable long-question pairs, marks, timing where visible, and `OR` layout. It does **not** treat a paper as an answer source, a syllabus, a question bank, or a prediction of a future FBISE paper.

> **Non-negotiable rule:** The active approved textbook is the sole factual authority. A reviewed paper profile may control only presentation: section shape, observed marks, concise command style, and the presence of a verified `OR` alternative. Every generated question, answer, marking point, formula reference, and diagram prompt remains grounded in the selected textbook scope.

## Reviewed Source Matrix

| Subject / source | Source state | Section A — MCQs | Section B — short questions | Section C — long questions | `OR` evidence | Duration / total marks | Generation implication |
|---|---|---:|---|---|---|---|---|
| Computer Science model paper, Curriculum 2022–23 | Active, reviewed | 13 × 1 | 22 marks are visible; the extracted layout does not verify an `OR` rule | 4 × 5 | **Do not infer** `OR` from the model extraction | 180 minutes / 55 marks | Supports one-mark MCQ presentation and a 4-slot long-question shape; it cannot alone impose `OR`. |
| Computer Science annual 2024 | Active, reviewed | 13 × 1 | 11 × 2 | 4 × 5 | `OR` visible for every observed Section B part and Section C question | 180 minutes / 55 marks | Supports 2-mark short pairs, 5-mark long pairs, and matched `OR` alternatives. |
| Computer Science annual 2025 | Active, reviewed | 13 × 1 | 11 × 2 | 4 × 5 | `OR` visible for every observed Section B part and Section C question | 180 minutes / 55 marks | Confirms the same observed annual-paper structure as 2024. |
| Computer Science 2026 evening | Draft, reviewed | 13 × 1 | 11 × 2 | 4 slots; Section C totals 18 marks, but individual marks are absent | `OR` visible in Sections B and C | Duration not verified / 53 marks | May inform review only. It must not establish a 5-mark long-question rule because the per-question allocation is not visible. |
| Computer Science 2026 morning | Draft, reviewed | 13 × 1 | 11 × 2 | 4 × 5 | `OR` visible in Sections B and C | 160 minutes / 55 marks | May inform review only; separate from the evening source and from all PBA material. |
| Physics 2026 evening | Draft, reviewed | 12 × 1 | 11 × 3 | 4 × 5 | `OR` visible for every listed Section B part and Section C question | Duration not verified / 65 marks | Physics-specific review format: 3-mark short pairs and 5-mark long pairs. |
| Chemistry 2026 evening | Draft, reviewed | 12 × 1 | 11 × 3 | 4 × 5 | `OR` visible for every listed Section B part and Section C question | 160 minutes / 65 marks | Chemistry-specific review format: 3-mark short pairs and 5-mark long pairs. |

## Stable Rules, Variations, and Unknowns

| Classification | What the reviewed sources support | Generation policy |
|---|---|---|
| **Stable within active Computer Science annual evidence** | 13 one-mark MCQs; 11 two-mark Section B parts; four five-mark Section C slots; `OR` alternatives in Sections B and C. | Active Computer Science profile guidance carries these figures into MCQ and printable draft prompts. Teacher-selected draft size remains a teacher decision; it is not presented as an official paper. |
| **Subject-specific variation** | Physics and Chemistry reviewed 2026 evening profiles show 12 one-mark MCQs, 11 three-mark Section B parts, and four five-mark Section C questions. | These values are recorded subject-by-subject. They do not overwrite Computer Science settings and are not automatically activated. |
| **Shift-specific variation** | Computer Science 2026 morning is a 55-mark, 160-minute profile with 4 × 5 in Section C; evening is a 53-mark profile with Section C total 18 and individual marks not visible. | Morning and evening remain separate source records. The incomplete evening per-question allocation is never guessed. |
| **Model-paper uncertainty** | The Computer Science model paper’s extraction does not show a legible `OR` marker. | No `OR` layout is inferred from a column arrangement or from a model paper alone. |
| **PBA boundary** | Practical-Based Assessment pages are a distinct assessment stream. | PBA cannot set written-paper Section A/B/C rules and cannot enter written-paper generation guidance. |

## Implemented Generation Rules

The assessment engine now reads **reviewed active profile fields**, rather than only a paper’s year and type, when active pattern sources exist for the selected programme. The following constraints are enforced in generation guidance.

| Output | Implemented guidance | Guardrail |
|---|---|---|
| Online / printable MCQs | The prompt receives only reviewed active Section-A metadata, such as one-mark MCQ presentation where all active profiles agree. | The teacher’s requested number of practice MCQs remains a draft choice; past-paper questions and answers are never copied. |
| Printable short questions | When every attached active profile agrees on a short-question mark value, the prompt requires that value. | If profiles vary or omit the value, the prompt explicitly avoids inventing a board rule and retains the validated draft-contract range. |
| Printable long questions | When every attached active profile agrees on a long-question mark value, the prompt requires that value and requires a matching rubric total. | If the marks are incomplete or vary, no false five-mark claim is made. |
| `OR` alternatives | The printable contract retains paired alternatives; guidance says `OR` is verified only where a reviewed active source states it. Both alternatives must assess the same textbook learning objective and carry equal marks. | Model-paper ambiguity and unverified scan columns cannot create an `OR` rule. |

## Operational Boundary for Portal Admin

Paper sources remain **draft** until explicit activation. Therefore, the system does not automatically make the 2026 Physics, Chemistry, Computer Science morning, or Computer Science evening profiles live merely because they have been reviewed. Portal Admin may review these records, compare a later official formatted source, and activate only the exact source that is safe to use for format guidance.

## References

[1]: `assessmentPatternProfiles` records for user-supplied Grade 10 Computer Science model, 2024, 2025, 2026 morning, and 2026 evening papers.
[2]: `assessmentPatternProfiles` record for user-supplied Grade 10 Physics 2026 evening paper, source 60001.
[3]: `assessmentPatternProfiles` record for user-supplied Grade 10 Chemistry 2026 evening paper, source 90001.
[4]: `INCOMING_SCAN_INVENTORY.md` — PBA and shift-separation boundaries for the CamScanner material.

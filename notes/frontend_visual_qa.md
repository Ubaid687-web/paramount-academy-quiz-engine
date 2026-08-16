# Frontend visual QA — 2026-08-16

The latest preview at the managed dev URL loads the redesigned Paramount Academy Quiz Centre. The header shows the brand and a single Quiz Centre navigation entry. The primary hero uses the label “Quiz preparation” and the heading “Choose a grade.” The page contains one prominent “Add subject in Portal Admin” entry, a Grade 10 card labelled “Ready to prepare” with three approved subjects, and a separate Grade 9 card labelled “Curriculum intake.” The Grade 9 copy explains that it stays separate until Portal Admin verifies its textbook and paper pattern. The Recent MCQ drafts area remains intentionally inactive until a grade is selected.

The preview also shows the managed preview-mode notice at the bottom; this is platform UI, not application content. No duplicate Generate Quiz button is visible on the grade-selection screen.

The Grade 10 path then shows three subject cards only: Chemistry, Computer Science, and Physics. Selecting Chemistry leads to a focused “Grade 10 · Chemistry” screen with a single “Open builder” action and a “Change subject” escape route. The page does not show pattern-management or other subject details, keeping teacher-facing setup short.

## Chemistry scan verification

Visual inspection of supplied PDF pages 13–15 confirms the printed headings “UNIT 02” and “Unit 2: Matter,” while OCR omitted the heading and began at section 2.1. Visual inspection of pages 74–76 confirms “UNIT 06” and “Unit 6: Salts.” These are direct source observations, so the Chemistry chapter map must not rely on OCR headings alone when a unit title is legible in the scanned page image.

The builder opens as a three-step flow: “Quiz type”, “Source”, and “Quiz settings.” Step 1 is intentionally narrow and explains that MCQs support online practice and printable PDF, while short and long questions are printable paper and solution key only. The teacher context is displayed as “Grade 10 · Chemistry” with one Change action. The three assessment choices are visible as compact cards; no duplicate Generate Quiz action is present on Step 1.

After activating Chemistry edition 120001, the builder refreshes with “Grade 10 · Chemistry” context and the MCQ card is enabled. The Source and Quiz settings rail steps remain locked until the teacher makes the next valid selection, which is the intended progressive flow.

Selecting MCQ advances to Step 2 / 3, “Select source.” The layout separates “Approved textbook chapters” from “My custom lesson material”; the approved path is available for the active Chemistry edition, while the custom path retains one file upload and paste-text option. The step includes an explicit Back action and keeps the Quiz settings rail locked until a source and title are valid.

The approved Chemistry selector exposes all thirteen source-bound units with page spans: Unit 01 History of Chemistry (7–13), Unit 02 Matter (14–25), Unit 03 Stoichiometry (26–45), Unit 04 Electrochemistry (46–63), Unit 05 Reaction Kinetics (64–73), Unit 06 Salts (74–81), Unit 07 Nitrogen, Sulphur and Metals (82–94), Unit 08 Organic Chemistry (95–108), Unit 09 Hydrocarbons (109–122), Unit 10 Hydroxy Compounds (123–129), Unit 11 Carboxylic Compounds (130–136), Unit 12 Polymers (137–149), and Unit 13 Biochemistry (150–164). The active source label identifies the National Book Foundation 2025 edition and NCP 2022–23.

## OCR quality-review verification

The public preview correctly protects Curriculum Library data behind the Portal Admin session, so live source-quality flags cannot be inspected without administrator authentication. The route presents the concise administrator-only notice rather than exposing book evidence. Quality-review display and review actions are covered in the Portal Admin UI regression, while source 90001 now has three persisted weak-page flags: pages 1, 6, and 56.

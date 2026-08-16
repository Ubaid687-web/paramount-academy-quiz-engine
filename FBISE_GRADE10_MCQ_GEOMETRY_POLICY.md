# FBISE Grade 10 MCQ Physical-Fit Policy

**Status:** Evidence-grounded calibration policy  
**Scope:** Grade 10 Chemistry, Physics, and Computer Science  
**Evidence:** Supplied FBISE model papers, supplied 2024/2025 annual papers, and supplied 2026 written-paper transcripts  

## Governing decision

The supplied papers do **not** support one universal character limit for every MCQ. The papers use a fixed Section A table, but the height of each row varies with the actual stem and option content. A legitimate paper item may have a multi-line stem, a multi-line option, a formula, a code fragment, a numerical value, or a short phrase. The reliable constraint is whether the item fits the measured Question/A/B/C/D/bubble geometry when rendered at the subject and paper-profile layout.

The previous provisional 110-character stem and 35-character option caps are withdrawn. They were not directly measured from the supplied papers and must not govern generation.

## Directly observed common geometry

The three inspected model PDFs use a common Section A structure: a Question column, four narrow option columns, and a dedicated answer-bubble column. Chemistry and Physics model papers contain 12 one-mark items. Computer Science model papers contain 13 one-mark items. The annual-paper transcripts show the same answer-shaped option pattern. Section A timing differs by source profile; it must come from the reviewed paper profile rather than from this compactness policy.

| Evidence | Observed physical form | Implementation consequence |
|---|---|---|
| Chemistry model, 12 items | Two-page table; stems and options wrap inside cells; formulas and chemical terms appear as compact choices | Use table-cell measurement and preserve valid multi-line scientific content |
| Physics model, 12 items | Two-page table; multi-line stems and options such as short phrases or relationships | Use row-height validation; do not flatten all options into one long line |
| Computer Science model, 13 items | Table with keyword, code, output, and short operational options; later rows continue on the next page | Preserve code/formula tokens and validate the actual rendered row |
| Chemistry 2024/2025 transcripts | 12 direct one-mark items with short terms, values, formulas, and process names | Prefer concise answer-shaped options, but do not set an unsupported universal cap |
| Computer Science 2024/2025/2026 transcripts | 13 direct one-mark items with operators, code fragments, outputs, and brief phrases | Use subject-aware token preservation and physical-fit validation |

## Generation rules

The model must write one direct question focus and must not add decorative background, teaching explanation, or a scenario longer than needed to establish the tested textbook fact or relationship. Each option must be answer-shaped and parallel to the others. Explanations, source references, and learning objectives remain metadata for teacher review; they must never be included in the student Section A cells.

The model must choose the compact form appropriate to the source content. Chemistry may require a formula, ion, compound name, numerical value, or short process phrase. Physics may require a unit, relationship, angle, material, or brief physical outcome. Computer Science may require a keyword, operator, code fragment, output, or short operational phrase. These forms are not interchangeable and must not be shortened in a way that changes the textbook meaning.

The model must not copy or lightly reword a supplied paper question. Paper sources provide layout and wording evidence only. The approved textbook or curriculum scope remains the factual authority.

## Validation rules

Validation must occur in two stages. First, structural checks reject empty, duplicated, non-parallel, or obviously explanatory options. Second, the MCQ is rendered using the same table dimensions, font family, font size, line spacing, and bubble column used by the printable paper. The renderer measures the wrapped height of the stem and all four options. An item is rejected or sent for revision only when its row exceeds the available row height or causes the Section A page to overflow its profiled page boundary.

Character counts may be recorded as diagnostics, but they are not the acceptance rule. A warning can say that an item is unusually long relative to the observed corpus; it must not silently truncate, paraphrase, or delete textbook content. If an item does not fit, the generator should request a shorter direct formulation while preserving the same source-supported concept, or the teacher should review it manually.

## Printable rendering requirements

The MCQ PDF must use the authentic Section A table geometry: a numbered Question column, four separate A–D option cells, and a dedicated bubble column. It must calculate row height from wrapped content before drawing each row, carry a complete row to the next page when necessary, and never place options as four uncontrolled full-width lines. The student paper must not contain explanations or source references. The answer key may include those fields in a separate layout.

Every generated MCQ draft remains a teacher-review draft. The interface should show a compactness warning only when the measured row or page fit fails, rather than presenting arbitrary character-limit errors.

## Open evidence boundaries

The CamScanner bundle reviewed in the project contains Chemistry and Computer Science Practical Based Assessment pages. Those pages use task tables, code blocks, marks cells, images, and bilingual answer spaces. They are quarantined from regular Section A MCQ geometry and must not be used to derive MCQ limits.

The annual written-paper transcripts are extracted text and may contain OCR distortions. Exact visual row geometry should be taken from the managed PDFs when available. Where only a transcript exists, the source may guide wording and option form but cannot establish a pixel-level layout measurement.

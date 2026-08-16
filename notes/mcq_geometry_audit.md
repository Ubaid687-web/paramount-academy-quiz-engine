# MCQ geometry audit — source observations

## Visual evidence: CamScanner08-01-202611.39.pdf, pages 1–2

The first two pages are a Chemistry Practical Based Assessment (PBA) Composite, not a conventional Section A MCQ paper. Page 1 shows a table/grid layout with compact subparts, bilingual text, narrow marks columns, and fixed answer spaces. Page 2 continues the same constrained worksheet geometry. This source must not be used to set the regular MCQ stem or option limits; it is practical-assessment evidence only.

No MCQ-length rule is inferred from these pages. The relevant observation is that the physical paper reserves fixed columns and answer spaces, so generated content must be measured against the correct regular written-paper source rather than a generic PDF width.

## Visual evidence: CamScanner08-01-202611.39.pdf, pages 3–4

Pages 3–4 are a Computer Science PBA Composite. They use dense task tables, code blocks, image-identification rows, marks cells, and bilingual answer spaces. They are not regular written-paper Section A MCQ evidence. Their physical density confirms the need to separate PBA geometry from MCQ geometry, but no stem or option cap is inferred from them.

## Visual evidence: Chemistry Model Question Paper, source 30001

The stored PDF is a five-page model paper. Section A is a table on pages 1–2 with 12 one-mark MCQs. Each row has a fixed Question column, four separate A–D option columns, and a separate bubble column. The option columns are narrow and wrap text within cells; the paper does not place options as long explanatory paragraphs. Several stems are multi-line, including the dry-ice scenario and the reaction-rate item, so a universal 110-character stem cap would be unsupported. The correct source-grounded rule is row/cell fit: preserve the full factual item when it fits the observed table row, keep options parallel and substantially shorter than the stem, and reject only when the rendered row overflows the measured table height.

Page 2 continues rows viii–xii in the same fixed grid. Short numerical/formula options are compact; one equation option can wrap to two lines. The physical layout therefore requires rendered-height validation rather than a blind character limit.

## Visual evidence: Physics Model Question Paper, source 30002

Physics uses the same fixed table geometry as Chemistry: a Question column, four narrow A–D option columns, and a separate bubble column. Section A has 12 one-mark rows across two pages. The first page visibly includes multi-line stems and options such as “It has gained electron” or “Conduction and convection”; the second page continues with rows 7–12. Options are concise but can occupy two lines. The correct implementation target is not a universal character cap; it is a measured row-height/layout constraint with four parallel option cells and a separate bubble area.

## Visual evidence: Computer Science Model Question Paper, source 30003

Computer Science uses the same fixed Question / A / B / C / D / bubbles table. Section A has 13 one-mark rows, with the first page holding most rows and page 2 holding the final two. Options such as “Windows Operating System,” “Natural Language Processing,” and “Backend as a Service” wrap inside their narrow columns but remain short answer-shaped phrases. Stems also wrap over multiple lines. This confirms that a fixed character limit would incorrectly reject legitimate supplied-paper forms; the correct fit check must use the subject’s measured table width and row height.

## Annual transcript evidence

The stored Chemistry 2024 and 2025 papers both show 12 one-mark Section A items with direct stems and short answer-shaped options. The Chemistry 2025 transcript includes compact formulas, one-word species, values, and short process names; Chemistry 2024 includes short numeric/formula choices and brief chemical terms. The Computer Science 2024 and 2025 transcripts similarly use 13 one-mark items with keywords, operators, code fragments, outputs, and brief phrases. The Computer Science 2026 reconstructed source retains the same table pattern with 13 items and 15-minute timing; the 2026 model source has 13 items and 20-minute timing. These observations support subject-aware rendered-fit checks, not one universal character cap.

## Managed visual sources inspected

- Chemistry model PDF (source 30001): https://d2xsxph8kpxj0f.cloudfront.net/310519663538757281/g2y5mutEzwdHvruUz8MtKx/assessment-patterns/grade-10/chemistry/model/class10chemistrymodelquestionpapernewsyllabus.pdf
- Physics model PDF (source 30002): https://d2xsxph8kpxj0f.cloudfront.net/310519663538757281/g2y5mutEzwdHvruUz8MtKx/assessment-patterns/grade-10/physics/model/class10physicsmodelquestionpapernewsyllabus.pdf
- Computer Science model PDF (source 30003): https://d2xsxph8kpxj0f.cloudfront.net/310519663538757281/g2y5mutEzwdHvruUz8MtKx/assessment-patterns/grade-10/computer-science/model/class10computersciencemodelquestionpapernewsyllabus.pdf

All three inspected model PDFs use the same four-option table geometry with a dedicated bubble column. The row heights vary with the actual content and permit multi-line stems/options. No fixed 110/35 character rule is supported by the visual evidence.

## Renderer visual QA finding

The new table renderer correctly displays a compact Question/A–D/bubble grid with wrapped stems and options. However, a 13-item sample that fits visibly on page 1 still produces a blank page 2 containing only the footer. This is a renderer finalization/pagination defect, not an MCQ content rule; it must be fixed before release.

The footer fix was verified: the same 13-item cross-subject sample now renders as one page, with all rows, wrapped options, bubble circles, and footer inside the page boundary. This confirms the renderer’s row-height and pagination path is usable for compact paper-style drafts.

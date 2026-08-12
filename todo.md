# Project TODO

## Phase 1: 10th Grade Material Analysis (Physics, Chemistry, Computer Science)
- [x] Analyze 10th grade Physics textbook structure and chapters
- [x] Extract 10th grade Physics past paper exam format
- [x] Document 10th grade Physics exam pattern and marking scheme
- [x] Analyze 10th grade Chemistry textbook structure and chapters
- [x] Extract 10th grade Chemistry past paper exam format
- [x] Document 10th grade Chemistry exam pattern and marking scheme
- [x] Analyze 10th grade Chemistry model paper exam format
- [x] Analyze 10th grade Chemistry 2024 past paper exam format
- [x] Analyze 10th grade Computer Science textbook structure, units, and chapter boundaries
- [x] Collect and analyze 10th grade Computer Science materials (textbook, past papers, exam patterns)
- [ ] Document quiz structure specifications for all 10th grade subjects (Physics, Chemistry, Computer Science)

## Phase 2: Platform Audit & Bug Fixing
- [x] Fix broken document upload flow for PDF-based study material ingestion
- [ ] Remove duplicate quiz-generation actions from the AI Agent interface
- [ ] Improve MCQ count recommendation logic so large content can yield appropriate question volume
- [ ] Add admin controls for selecting scope and difficulty in FBISE-style practice generation
- [ ] Remove misaligned or unnecessary product elements that do not fit the academy portal direction

## Phase 3: Product Architecture & Implementation
- [ ] Define the product architecture for chapter-based, half-chapter, and block-based quiz generation
- [ ] Implement bug fixes and remove unnecessary or misaligned product elements
- [ ] Refine quiz-generation controls to support FBISE-style difficulty and scope selection
- [ ] Write and run tests for the repaired and refined quiz platform

## Phase 4: Reporting & Delivery
- [ ] Report the updated system status, uploaded-material coverage, and next required inputs

- [ ] Keep `isProcessingFile` true until PDF extraction actually finishes, and show the processing state in the upload UI.
- [ ] Add/restore a test covering successful PDF upload/extraction behavior for the AIAgent flow or backend extraction path.
- [ ] Verify the repaired PDF upload path end-to-end and only then mark the upload bug as complete.
- [x] Add an animated loading state and visible progress indicator while AI quiz generation is running.
- [x] Add automated tests for the generation-progress state and accessible completion feedback.
- [x] Add a UI-focused test confirming the generation loading panel exposes progressbar accessibility attributes and staged feedback.
- [x] Add coverage confirming the loading panel exits and the generated-quiz success state appears after completion.

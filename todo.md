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
- [x] Document quiz structure specifications for all 10th grade subjects (Physics, Chemistry, Computer Science)

## Phase 2: Platform Audit & Bug Fixing
- [x] Fix broken document upload flow for PDF-based study material ingestion
- [x] Remove duplicate quiz-generation actions from the AI Agent interface
- [x] Improve MCQ count recommendation logic so large content can yield appropriate question volume
- [x] Add admin controls for selecting scope and difficulty in FBISE-style practice generation
- [x] Remove misaligned or unnecessary product elements that do not fit the academy portal direction

## Phase 3: Product Architecture & Implementation
- [x] Define the product architecture for chapter-based, half-chapter, and block-based quiz generation
- [x] Implement bug fixes and remove unnecessary or misaligned product elements
- [x] Refine quiz-generation controls to support FBISE-style difficulty and scope selection
- [x] Write and run tests for the repaired and refined quiz platform

- [x] Implement admin curriculum management for source upload, chapter review, half-chapter segments, reusable templates, and curriculum activation.
- [x] Add an integration test that resolves an active stored curriculum scope through draft generation and draft saving.
- [x] Add explicit admin and catalog-loading error states for scoped generation controls.
- [x] Verify scoped draft saving preserves the curriculum set, source snapshot, and difficulty profile on the quiz record.

## Phase 4: Reporting & Delivery
- [x] Report the updated system status, uploaded-material coverage, and next required inputs

- [x] Keep `isProcessingFile` true until PDF extraction actually finishes, and show the processing state in the upload UI.
- [x] Add/restore a test covering successful PDF upload/extraction behavior for the AIAgent flow or backend extraction path.
- [x] Verify the repaired PDF upload path end-to-end and only then mark the upload bug as complete.
- [x] Add an animated loading state and visible progress indicator while AI quiz generation is running.
- [x] Add automated tests for the generation-progress state and accessible completion feedback.
- [x] Add a UI-focused test confirming the generation loading panel exposes progressbar accessibility attributes and staged feedback.
- [x] Add coverage confirming the loading panel exits and the generated-quiz success state appears after completion.
- [x] Reproduce and repair the PDF upload flow that currently leaves extracted content unavailable to the quiz builder.
- [x] Ensure both PDF and TXT uploads populate the content field, supply a usable default title, and activate the Generate MCQs action.
- [x] Add visible upload-processing feedback and a clear extraction error state without leaving the interface inactive.
- [x] Enforce a reviewable draft output contract with source metadata, source references, structured validation, and safe failure responses.
- [x] Verify the document-to-draft workflow with an integration test that connects real source ingestion to draft validation without invoking a paid model call.
- [x] Add a non-mocked integration test for real PDF extraction followed by the source-grounded draft validation contract.

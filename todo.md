# Project TODO

## Phase 9: Material Reconciliation and Two-Path MCQ Workflow
- [x] Recheck project records and material-analysis artifacts for all previously supplied Grade 10 textbooks, papers, model papers, and patterns.
- [x] Document verified Grade 10 coverage by subject, including chapter evidence and paper-pattern sources.
- [x] Present approved chapter selection as a clear first teacher path, with chapter names and multi-select controls.
- [x] Present pasted/uploaded content as a separate customization path without mixing it into approved chapter selection.
- [x] Identify only the remaining storage/evidence gap required to activate existing analysed textbook material as a true approved source.
- [x] Test, checkpoint, and report the reconciled two-path workflow.

## Phase 8: First Active Grade 10 Curriculum Source
- [x] Locate and verify the first eligible Grade 10 textbook source for curriculum intake.
- [x] Create the source's versioned curriculum set and ingest the verified file into managed storage.
- [x] Review and save chapter and half-chapter boundaries for the first active scope.
- [x] Activate the approved curriculum and verify teachers can select it for source-grounded MCQ drafting.
- [x] Test, checkpoint, and report the available first curriculum scope.

## Phase 6: Progressive Teacher Workflow
- [x] Audit the current portal density against Ammara Faisal, Danish Butt, and Ubaidullah Butt's teaching responsibilities.
- [x] Define and document progressive teacher flow: grade → subject → action, with unnecessary technical detail hidden by default.
- [x] Rebuild the Quiz Centre around readable Grade 9 and Grade 10 subject paths instead of all controls at once.
- [x] Add subject-aware builder entry states that reveal only the selected teacher's next relevant action.
- [x] Superseded: all teachers receive access to all current MCQ subjects through Portal Admin; no individual subject-assignment model is needed now.
- [x] Superseded: replace the temporary teaching-focus selector with the confirmed all-teachers, all-current-subjects workflow.
- [x] Superseded: use the existing Portal Admin role for curriculum administration rather than a founder-specific guard.

## Phase 7: Portal Admin Access Simplification
- [x] Remove teacher-name and founder wording from the quiz-engine interface and temporary planning controls.
- [x] Replace the temporary teaching-focus selector with a clean all-teachers workflow covering all current MCQ subjects.
- [x] Describe curriculum management as a Portal Admin capability, without exposing it in the teacher workflow.
- [x] Update tests and documentation for the Portal Admin access model.
- [x] Separate founder-only curriculum administration from teacher-facing draft preparation screens.
- [x] Add UI tests for progressive grade and subject navigation, then validate and report the role-aware roadmap.
- [x] Save a verified Portal Admin access roadmap covering shared Grade 10 teaching flow, Grade 9 intake, and admin responsibilities.

## Phase 5: Academy Portal Frontend Redesign
- [x] Audit the current portal-facing screens and reconfirm Grade 9 versus Grade 10 curriculum readiness.
- [x] Replace the duplicate quiz-generation entry actions with one clear academy workflow.
- [x] Redesign the quiz-engine dashboard as a structured, modern Paramount Academy portal module.
- [x] Make the MCQ-only purpose, grade readiness, subjects, drafts, and curriculum setup states visually clear.
- [x] Refine the quiz builder as a professional grade-aware, subject-aware admin workflow.
- [x] Add frontend tests for the redesigned entry and builder states, then validate and report the confirmed roadmap.
- [x] Add UI test coverage for the redesigned Quiz Centre single-entry action, grade readiness messaging, and empty library state.
- [x] Deliver the confirmed frontend roadmap covering Grade 10 readiness, Grade 9 intake status, and portal integration steps.

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

## Phase 10: Grade 10 Chemistry Curriculum Activation
- [x] Verify the approved Grade 10 Chemistry textbook source and recover an OCR-readable transcript where necessary.
- [x] Create the Chemistry versioned curriculum set, source record, reviewed chapter boundaries, half-chapter segments, and reusable scope templates.
- [x] Activate the Chemistry curriculum and verify its chapters appear through the Grade 10 Chemistry teacher builder path.
- [x] Re-run the full regression suite after managed TiDB connectivity stabilizes; focused Chemistry builder coverage already passes.
- [x] Document, checkpoint, and report the activated Chemistry source workflow.

## Phase 10A: Existing Material Provenance Reconciliation
- [x] Reconcile the already supplied Chemistry and Computer Science material records with their curriculum activation status; do not request duplicate uploads.

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

## Phase 11: Grade 10 Computer Science Curriculum and Assessment Evidence
- [x] Reconcile the previously supplied Grade 10 Computer Science textbook and paper-analysis records without requesting duplicate uploads.
- [x] Recover the retained Computer Science textbook into a managed, page-preserving transcript and review its chapter boundaries.
- [x] Create and activate the Grade 10 Computer Science curriculum set with chapter records, half-chapter segments, and reusable scope templates.
- [x] Document evidence-grounded paper patterns for MCQ, short-question, long-question, and full-exam preparation without generating unsupported content.
- [x] Add Computer Science builder coverage, run regression validation, checkpoint, and report the activated source.

## Phase 11A: Corrected Computer Science Source Boundary
- [x] Use only the single user-supplied Grade 10 Computer Science textbook identified as FBISE Curriculum 2022–2023 and the files already supplied in this chat.
- [x] Do not substitute external textbooks, newer editions, public papers, or inferred chapter lists for the supplied source.
- [x] Add a builder regression safeguard that hides approved Computer Science chapters while no exact supplied curriculum source is active.

## Phase 12: Source-Safe Multi-Mode Assessment Framework
- [x] Audit and publish an exact access register for user-supplied Grade 10 textbooks, model papers, and the 2024 and 2025 past-paper sets across Physics, Chemistry, and Computer Science.
- [x] Define shared source-grounded contracts for MCQ, short-question, long-question, and full-paper draft modes.
- [x] Extend backend validation and draft persistence to enforce source references and marks for every assessment mode.
- [x] Add a teacher-facing saved-draft review/edit flow that loads an existing assessment draft before revision.
- [x] Add UI coverage for long-question revision and the intentional disabled full-paper mode when approved paper evidence is unavailable.
- [x] Checkpoint and report the completed framework and access register.

## Phase 13: Progressive Quiz-Creation Refinement
- [x] Audit the current assessment builder for option density and identify controls that should remain hidden until their step is reached.
- [x] Refactor the builder into a clear step-by-step flow that reveals one relevant decision group at a time without removing source-safety controls.
- [x] Add smooth, reduced-motion-safe transitions and responsive interaction feedback for step changes, selections, and validation states.
- [x] Add focused UI tests for progressive disclosure, keyboard-accessible step navigation, and completion readiness.
- [x] Run full validation, save a checkpoint, and report the refined teacher workflow.
- [x] Add a keyboard-navigation regression test for the assessment step rail, including Enter and Space activation without a mouse.
- [x] Save and report the verified Phase 13 progressive-workflow checkpoint after final validation.

## Phase 14: Computer Science Source Reconciliation and Refinement
- [x] Recheck all managed project records, source registers, storage references, and database evidence for the user-re-supplied Grade 10 Computer Science FBISE 2022–2023 textbook.
- [x] Correct only evidence-backed Computer Science source-status records and builder safeguards; do not substitute any external or inferred source.
- [x] Apply the next targeted teacher-facing refinement that is safe for the verified source state.
- [x] Validate, checkpoint, and report the reconciled refinement state.

## Phase 15: Replit Integration Handoff
- [x] Audit current architecture, source records, data contracts, and integration boundaries for a Replit implementation.
- [x] Prepare a developer-ready Replit integration specification with required workflows, security controls, and acceptance criteria.
- [x] Validate the handoff against the live project state and deliver the document to the user.

## Phase 16: Quiz-Creation Wizard Verification
- [x] Audit the current quiz-creation interface for any remaining all-at-once controls or unclear transitions.
- [x] Refine the wizard stages, navigation, and motion only where the current implementation still needs improvement.
- [x] Validate the progressive workflow, accessibility, and responsive behavior before reporting the result.

## Phase 17: Mobile Subject-Selection Redesign
- [x] Audit the mobile subject-selection screen, shared academy shell, typography, and back-navigation behavior.
- [x] Define and apply a more cohesive Paramount Academy visual system for mobile spacing, colour, type, cards, and buttons.
- [x] Repair the Change class back action and validate keyboard, touch, and browser navigation behavior.
- [x] Add mobile-focused UI coverage, run validation, checkpoint, and report the completed refinement.
- [x] Add keyboard-activation coverage for both Change class and Change subject controls.
- [x] Verify the visible in-app return controls on the mobile flow and save the final Phase 17 checkpoint.

## Phase 18: Chemistry Source Integrity and Teacher UI Focus
- [x] Audit the active Grade 10 Chemistry curriculum, source provenance, storage record, and assessment-pattern links against user-supplied evidence only.
- [x] Correct or disable any Chemistry curriculum record that cannot be verified as the exact user-supplied textbook; do not substitute a source.
- [x] Reduce article-like teacher-facing explanations and retain only concise decisions, status, and next actions.
- [x] Add source-integrity and streamlined-interface coverage, validate, checkpoint, and report the result.
- [x] Save the verified Phase 18 checkpoint after the Chemistry source correction and teacher-interface refinement.
- [x] Report the archived Chemistry source decision and custom-source-only Chemistry flow to the user.

## Phase 19: MCQ-Only Product Alignment
- [x] Audit all Quiz Centre and builder controls that expose short-question, long-question, full-paper, marks, expected-answer, rubric, or manual-answer fields.
- [x] Simplify the live teacher workflow to source-grounded MCQ quiz preparation only, retaining chapter and custom-source paths.
- [x] Preserve verified user-supplied model and annual paper evidence as MCQ-pattern guidance without exposing non-MCQ quiz modes.
- [x] Document a controlled intake and comparison process for the user's upcoming current-year paper.
- [x] Add focused MCQ-only UI coverage, validate, checkpoint, and report the aligned product scope.
- [x] Reconcile the live Physics approved-source availability with the verified active Physics curriculum record before final validation.
- [x] Make the read-only chapter catalog and MCQ source-readiness status available to the live teacher flow without exposing textbook content or management actions.
- [x] Hard-disable non-MCQ saved-draft and setup branches so the live teacher builder cannot surface short, long, full-paper, marks, expected-answer, or rubric controls.
- [x] Replace deferred non-MCQ UI tests with explicit MCQ-only regression coverage for every entry path.
- [x] Implement and test source-safe paper-aware MCQ generation guidance using only verified model and annual paper pattern metadata.
- [x] Save the verified Phase 19 checkpoint after the passing MCQ-only regression suite and TypeScript validation.
- [x] Report the finalized MCQ-only scope, restored Physics chapter path, and paper-aware guidance behavior to the user.

## Phase 20: Online MCQ and Printable Paper Workflow
- [x] Extract and reconcile the user-provided FBISE quiz-generator specification with the corrected product scope.
- [x] Restore teacher-visible short-question and long-question generation as printable paper outputs only, not online student quizzes.
- [x] Preserve MCQ generation for both online quiz-taking and professional printable PDF download.
- [x] Apply verified user-supplied textbook and paper-pattern evidence to each output type without inventing content or patterns.
- [x] Add coverage for online MCQs and printable MCQ/short/long routes, validate, checkpoint, and report the restored workflow.

## Phase 21: Preview and Route Loading Performance
- [x] Diagnose slow opening and loading previews in the academy workspace and assessment-builder routes.
- [x] Reduce unnecessary client requests, render work, or route dependencies that delay first usable content.
- [x] Add regression coverage, validate the improvement, checkpoint, and report the result.

## Phase 22: Draft Library Skeleton Loading
- [x] Add accessible skeleton cards for the draft library while its deferred request is loading.
- [x] Verify the skeleton layout remains responsive and disappears when the data, empty state, or error state arrives.
- [x] Add regression coverage, validate, checkpoint, and report the loading-state refinement.

## Phase 23: Printable Paper Validation Repair
- [x] Diagnose the short-paper item-mode validation failure shown after generation completes.
- [x] Correct the server-side generated payload contract and return a concise, actionable retry message if generation is incomplete.
- [x] Add short- and long-paper validation regression coverage, validate, checkpoint, and report the repair.

## Phase 24: Mobile PDF Delivery and Reliability Audit
- [x] Trace the conflicting PDF download success/failure notices and absent mobile file download.
- [x] Repair mobile-safe PDF delivery for MCQ, short-paper, long-paper, and solution-key exports.
- [x] Audit adjacent generation, PDF export, and preview paths for hidden user-visible failures.
- [x] Add regression coverage, validate, checkpoint, and report the reliability repair.

## Phase 25: Reusable Curriculum Lifecycle Architecture
- [x] Audit the present book, paper, curriculum, and custom-source workflow for self-service gaps.
- [x] Design a reusable source intake, verification, versioning, chapter review, and activation lifecycle.
- [x] Define concise Portal Admin and teacher-facing visibility for approved materials and current source status.
- [x] Present a phased implementation recommendation before building new functionality.

## Phase 26: Curriculum Library Foundation and Export Reliability
- [x] Trace and repair the persistent printable-paper and solution-key download failure on mobile.
- [x] Replace fragile client-side PDF delivery with a verified direct-export path where necessary.
- [x] Build the first Portal Admin Curriculum Library dashboard showing active, draft, blocked, and archived source states.
- [x] Validate export reliability and Curriculum Library workflows, then checkpoint and report the implementation.

## Phase 27: Self-Service Book Replacement and Paper Pattern Intake
- [x] Implement a safe “replace active edition” action that creates a linked draft curriculum set and preserves historical source snapshots.
- [x] Add Portal Admin paper-pattern PDF/TXT intake with source type, academic year, extraction status, and controlled activation.
- [x] Display replacement lineage and active/draft/archived paper-pattern status in the Curriculum Library.
- [x] Add lifecycle safeguards and regression coverage, validate, checkpoint, and report the intake capabilities.

## Phase 28: Draft Replacement Trial
- [x] Identify an active existing curriculum edition for a safe replacement trial.
- [x] Create one linked replacement edition in draft status only, without uploading a source or activating it.
- [x] Verify the original edition remains active and report the draft lineage.

## Phase 29: PDF-Only Mobile Delivery Repair
- [x] Capture the live mobile export request outcome and identify the remaining delivery failure.
- [x] Replace the current mobile download trigger with a reliable fallback and remove false success feedback.
- [x] Verify PDF-only delivery behaviour, checkpoint, and report the resolution before resuming other work.

## Phase 30: Printable Validation and Preview Opening Reliability
- [x] Trace and eliminate the recurring short-paper validation failure shown on mobile.
- [x] Ensure only valid printable drafts expose a PDF preparation control, with no internal validator details shown to users.
- [x] Identify and reduce the slow first-open preview path while keeping the loaded application responsive.
- [x] Add regression coverage, validate, checkpoint, and report both focused repairs.

## Phase 31: Evidence-Led Mobile PDF Root-Cause Investigation
- [x] Correlate the current mobile PDF preparation request with the attachment retrieval request and final response.
- [x] Reproduce the observed sequence and inspect export token, session, proxy, and attachment headers.
- [x] Implement only the verified root-cause fix with a targeted regression test.
- [x] Validate the complete delivery sequence and report evidence-backed results.

## Phase 32: Current Development Build Verification
- [x] Restart and confirm the active development preview contains the latest PDF delivery implementation.
- [x] Provide one precise current-build PDF test path without publishing the project.
- [x] Wait for and assess the current-build result before changing PDF delivery again.

## Phase 33: In-App Preview PDF Compatibility
- [x] Identify the in-app preview response/download constraint from the current live failure path.
- [x] Test a preview-inline fallback while preserving normal attachment delivery for published use.
- [x] Validate the same attachment delivery route on a published build, because the in-app iframe does not support file delivery.

## Phase 34: FBISE-Aligned Reusable Intake Roadmap
- [x] Reconcile the uploaded FBISE design guidance with the current Grade 10 source and assessment architecture.
- [x] Audit existing subject, textbook, curriculum, replacement, and pattern-paper intake capabilities.
- [x] Design a reusable Portal Admin workflow with explicit source-governance and exam-pattern safeguards.
- [x] Present a staged implementation plan for approval before building the next capability.

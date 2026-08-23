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

## Phase 35: Release 1 — Readiness Checklist and Pattern Profile
- [x] Define and persist a source-linked, admin-reviewed paper-pattern profile for Grade 10 model and past papers.
- [x] Expose a clear edition readiness checklist without allowing automatic source or pattern activation.
- [x] Build concise Portal Admin review controls for paper-profile data and source readiness.
- [x] Add lifecycle safeguards and regression coverage, validate, checkpoint, and report Release 1.

## Phase 36: Release 2 — Programme Catalogue
- [x] Define a controlled programme record for board, grade, subject, teacher label, and intake-only/ready lifecycle status.
- [x] Seed existing Grade 10 Physics, Chemistry, and Computer Science safely without changing their active-source behaviour.
- [x] Build admin-only programme setup and readiness controls; expose only ready programmes to the teacher catalogue.
- [x] Add compatibility and source-visibility regression coverage, validate, checkpoint, and report Release 2.

## Phase 37: Controlled New-Edition PDF Chapter Extraction
- [x] Define source-safe chapter proposal rules for extracted FBISE textbook PDFs, with no automatic chapter activation.
- [x] Add an admin-only proposal service that parses an uploaded new-edition textbook extraction into reviewable chapter boundaries.
- [x] Add Portal Admin controls to generate, inspect, amend, and save proposed chapters for a draft replacement edition.
- [x] Add regression coverage for PDF parsing, review gating, source-boundary preservation, validation, checkpoint, and report.

## Phase 38: Computer Science Textbook-and-Paper Assessment Calibration
- [x] Define textbook-only factual evidence, paper-pattern-only guidance, and non-evidence Claude-analysis boundaries.
- [x] Review the stored Grade 10 Computer Science textbook and supplied model/2024/2025 paper-pattern records for verified wording and cognitive-balance guidance.
- [x] Apply controlled Computer Science guidance to assessment generation and textbook-faithful, memorisation-oriented solution-key output.
- [x] Add source-boundary and solution-presentation regression coverage, validate, checkpoint, and report.

## Phase 39: Computer Science 2024 and 2025 Paper Pattern Profiles
- [x] Inspect the supplied 2024 and 2025 Computer Science papers and record only verifiable structural evidence.
- [x] Analyse each paper’s sections, marks, time allocation, command wording, choice rules, and cognitive-demand signals.
- [x] Save separate, evidence-noted reviewed profiles without treating past-paper questions as factual source content.
- [x] Verify profile persistence and source-boundary safeguards, validate, checkpoint, and report.

## Phase 40: Computer Science Model-Paper Profile and Comparison
- [x] Inspect the supplied Computer Science model paper and record only verifiable structural evidence.
- [x] Save a separate, evidence-noted reviewed model-paper profile without using it as factual answer content.
- [x] Compare the model paper against reviewed 2024 and 2025 profiles to identify stable format guidance and variation.
- [x] Verify profile persistence and source boundaries, validate, checkpoint, and report.

## Phase 41: Grade 10 Computer Science Exam-Readiness Analysis
- [x] Define a textbook-first Grade 10 analysis framework that separates factual evidence, exercises, paper-pattern evidence, and non-evidence analysis notes.
- [x] Map Grade 10 Computer Science textbook units and exercises against supplied model/2024/2025 paper demands, with special focus on application gaps.
- [x] Incorporate the re-uploaded analysis document and 2026 annual paper as pattern evidence only when supplied.
- [x] Produce controlled Grade 10 memorisation and applied-knowledge readiness guidance; preserve strict separation from Grade 9 and defer front-end work.

## Phase 42: Newly Supplied Scan Inventory
- [x] Inspect the CamScanner PDF and separate Grade 10 written-paper evidence from practical-based assessment material.
- [x] Register written-paper content as pattern evidence only when its year, subject, and extraction quality are confirmed.
- [x] Keep practical assessment quarantined from current written-exam readiness guidance unless separately approved.

## Phase 43: Cross-Subject Analysis Method Reference
- [x] Extract only transferable textbook-to-paper analysis methods from the uploaded SSC-I Physics PDF.
- [x] Exclude all Physics facts, marks, and paper-format rules from Grade 10 Computer Science analysis.
- [x] Apply the verified method only after cross-checking every Grade 10 Computer Science conclusion against its own textbook and paper evidence.

## Phase 44: Grade 10 Curriculum Alignment Audit
- [x] Distinguish active 2022–23 Grade 10 Computer Science textbook coverage from older or incomplete paper evidence.
- [x] Mark each observed paper demand as aligned, unconfirmed, or outside the active textbook before using it for 2027 preparation.
- [x] Use only confirmed curriculum-aligned textbook-to-paper mappings in the Grade 10 readiness guidance.

## Phase 56: Chemistry Scanned PDF OCR Extraction and Frontend Overhaul
- [x] Install tesseract-ocr, pdf2image, and pytesseract to OCR the scanned Chemistry textbook PDF.
- [x] Extract chapter text and build managed curriculum chapter records for Grade 10 Chemistry.
- [x] Overhaul the frontend portal (Quiz Centre, AIAgent builder, navigation) for clean Grade 9 and Grade 10 separation, easy subject management, and intuitive curriculum addition.
- [x] Run regression tests and TypeScript validation; checkpoint and delivery remain as release actions.
- [x] Fix Quiz Centre readiness mismatch so a programme is teacher-ready only when an active reviewed curriculum set with active chapters exists.
- [x] Extend chapter proposal parsing for the scanned Chemistry textbook’s bracketed and repeated unit headers without inventing boundaries.

## Phase 57: OCR Confidence and Pre-Activation Review
- [x] Define deterministic page-quality signals and the rule for requiring administrator review of weak OCR pages.
- [x] Persist source-bound page-quality records and calculate review status during textbook ingestion.
- [x] Block curriculum activation while required page-quality reviews remain unresolved.
- [x] Add concise Portal Admin quality flags, per-page review controls, and activation guidance.
- [x] Add regressions and run full validation; checkpoint and report remain release actions.

## Phase 58: Evidence-Grounded MCQ Physical Fit Audit
- [x] Audit supplied Chemistry, Physics, and Computer Science papers for actual Section A stem, option, column, and row geometry; do not use guessed limits.
- [x] Replace any provisional compactness policy statements with measured, source-specific observations and explicit unknowns.
- [x] Add regression fixtures from the supplied paper corpus and validate generated stems/options against verified physical-fit rules.
- [x] Calibrate generation prompts, structural validation, and MCQ PDF rendering without distorting authentic paper content.
- [x] Run full validation, save a checkpoint, and report the evidence and remaining review points.

## Phase 59: Focused Wizard Workflow UX Redesign
- [x] Audit current Quiz Centre and AIAgent step/state flow.
- [x] Implement single-step conditional rendering with state-preserving Back navigation and top progress indicators.
- [x] Separate Portal Admin curriculum addition and recent draft library into distinct views so steps never stack or scroll indefinitely.
- [x] Walk through the complete workflow (grade → subject → generation → results) and verify state restoration and zero stacked UI.

## Phase 60: Compact One-Decision Assessment Builder Redesign
- [x] Audit current Assessment Builder step and source-state structure.
- [x] Implement compact step header ("Step 2 of 4" + thin progress bar) across all builder views.
- [x] Redesign Step 2 (Source) into a decision-first card view with default/recommended tags and dedicated sub-views (approved textbook chapters vs custom lesson material with Upload / Paste tabs and delayed title entry).
- [x] Apply one-decision-at-a-time layouts to Quiz type, Quiz settings, and Review steps so standard phone screens fit each step without scrolling clutter.
- [x] Run full test suite regressions and browser walkthrough confirming zero stacked choices and correct Back state restoration.

## Phase 61: Diversity, Paper-Style, and Question-Count Reliability
- [x] Inspect the supplied duplicate paper and trace current concept coverage, prompt construction, saved-draft history, and question-count input behavior.
- [x] Enforce concept-level uniqueness within generated papers, including both sides of OR pairs, and give a clear insufficient-coverage result instead of reworded duplication.
- [x] Apply only verified user-supplied model/past-paper wording and structural guidance, and exclude previous saved-paper concepts or near-duplicates for the same subject and source scope.
- [x] Repair number entry so users can clear and type a valid custom count, with range validation deferred to blur or generation.
- [x] Add regression coverage, validate the complete suite, checkpoint, and report the evidence-backed repair.

## Phase 62: Two-Column Comparison PDF Layout
- [x] Inspect the current printablePaperExport.ts renderer and PDF geometry tests.
- [x] Implement side-by-side question-pair rows (left question, right OR alternative, vertical divider, horizontal row separator) with robust measured wrapping.
- [x] Preserve all header, footer, marks, and draft labels unchanged.
- [x] Add PDF geometry regressions, verify varied question counts, and save checkpoint.

## Phase 63: Printable Pair Count and Capacity Correction
- [x] Diagnose why a teacher-entered number of printable OR pairs is being treated as twice as many unique concepts.
- [x] Restore unrestricted valid numeric entry for printable OR pairs, with range validation only on blur or generation.
- [x] Treat each OR pair as one source concept with two distinct, non-duplicate assessment angles.
- [x] Add focused capacity and input regressions, validate the suite, and checkpoint the repair.

## Phase 64: Concept-Facet Diversity and Live Count Flow
- [x] Trace the deployed and current printable count/capacity paths for stale strict concept-only behavior.
- [x] Replace one-concept-per-pair limits with concept, assessable facet, and answer-target diversity checks.
- [x] Preserve source grounding and block only duplicate answer targets or trivial rewordings.
- [x] Verify editable count behavior in the teacher flow, add regressions, validate, and checkpoint.

## Phase 65: Source-Aware Question-Count Capacity Warning
- [x] Inspect available chapter segment or content analysis count in AIAgent.tsx.
- [x] Implement a non-blocking visual warning near the question-count input when the requested count exceeds estimated available topics.
- [x] Add UI regression coverage for the warning banner and verify test suite passes.
- [x] Save checkpoint and report deliverables.

## Phase 66: Upstream Quota and Billing Error Classification
- [x] Diagnose reported 412 quota exhaustion error and separate it from textbook readability warnings.
- [x] Implement accurate `quota_exhaustion` error type and professional teacher retry advice.
- [x] Add unit test coverage, validate full test suite, checkpoint, and report.

## Phase 68: Retry Attempt Telemetry & Monitoring
- [x] Add `retryAttempts` column to `generationJobs` schema and persist count on completion.
- [x] Pass `retryAttempts` telemetry from shared LLM transport.
- [x] Add test coverage, validate full test suite, checkpoint, and report.

## Phase 69: Production-Readiness Gate Review
- [x] Verify the production architecture audit's claims against the live codebase, database, deployment, and teacher workflow.
- [x] Identify critical gaps that risk reliability, academic integrity, operational safety, or teacher trust.
- [x] Deliver a blunt go/no-go decision and a priority-ranked corrective plan before adding further features.

## Phase 70: Auditable Question Source Citations
- [x] Audit the existing generated-question contract and the approved curriculum scope metadata available for precise citations.
- [x] Add structured textbook citation fields to generated and persisted questions, without fabricating citations for custom material.
- [x] Surface citations for Portal Admin review, add source-integrity regressions, validate, checkpoint, and report.

## Phase 71: Printable Generation Failure Clarity
- [x] Verify 412 quota/billing failures across printable-paper generation and identify any misleading source-related recovery advice.
- [x] Correct any printable failure-message gap without retrying permanent quota or billing errors.
- [x] Add regression coverage, validate, and report the external-service root cause and safe recovery path.

## Phase 72: Source-Safe Generation Optimization
- [x] Audit current prompt volume and identify reductions that preserve selected-scope coverage, citations, diversity, and paper-style rules.
- [x] Implement deterministic request fingerprinting, exact successful-result reuse, and prompt budgets without sharing custom sources across teachers.
- [x] Add persisted circuit-breaker guards for upstream failures and record optimization metadata for monitoring.
- [x] Integrate MCQ and printable generation paths, add regressions, validate, checkpoint, and report.

## Phase 73: Focused Grade and Subject Intake Workflow
- [x] Audit grade selection, subject intake, and book-ingestion controls for duplicated or premature actions.
- [x] Redesign the flow as selected grade → subject name → textbook upload → extraction/OCR review → controlled activation.
- [x] Hide non-current setup details, preserve Grade 10 preparation flow, add UI regressions, validate, checkpoint, and report.

## Phase 67: Transient Rate-Limit Retry Resilience
- [x] Define bounded retry eligibility for transient LLM rate-limit and service failures without retrying quota exhaustion, billing, invalid requests, or source errors.
- [x] Implement exponential backoff with jitter in the shared LLM transport and preserve final error context.
- [x] Add transport-level retry regressions, run full validation, checkpoint, and report.

## Phase 65: Source-Aware Question Capacity Guidance
- [x] Add deterministic estimated topic counts to approved chapters and half-chapter segments in the catalog response.
- [x] Show a non-blocking warning near the MCQ question-count input when requested coverage exceeds the selected source estimate.
- [x] Add UI and analyzer regression coverage for approved and custom sources, then validate and checkpoint.

## Phase 74: Production OCR for Scanned Textbooks
- [x] Audit the existing source ingestion, storage, extraction, and review controls for scanned-image gaps.
- [x] Add bounded server-side OCR for image-only PDF and photographed textbook inputs, preserving page-level quality evidence.
- [x] Restrict activation until Portal Admin completes required page review and validate the deployed production runtime.
- [x] Add OCR, ingestion, and UI regressions; validate, checkpoint, and report the completed pipeline.

## Phase 75: Urdu-Language OCR Support
- [x] Audit the current OCR language configuration and text-quality thresholds for Urdu-script source pages.
- [x] Add bilingual Urdu-and-English OCR language selection and production language data.
- [x] Preserve page review safeguards for Urdu-only and mixed-script textbook pages.
- [x] Add regression coverage, validate the production build, checkpoint, and report the enhanced pipeline.

## Phase 76: Future Grade Intake and Security Reliability Audit
- [x] Audit grade-management entry points, authorization boundaries, client-visible data, dependencies, and duplicate workflow paths.
- [x] Add a controlled Portal Admin entry point for future grades without cluttering teacher-facing Grade 9/10 preparation.
- [x] Implement only verified, low-risk security or reliability fixes and record any remaining risks.
- [x] Add regression coverage, validate source/build/security checks, checkpoint, and report the completed audit.

## Phase 77: Teacher and Portal Admin Role Separation
- [x] Audit role storage, current admin-only procedures, teacher workflows, navigation, and staff assignment controls.
- [x] Add a safe teacher role migration and preserve Portal Admin ownership during the transition.
- [x] Enforce Portal Admin-only curriculum/OCR/activation access while allowing teachers to build and use approved assessments.
- [x] Add role-boundary regressions, validate, checkpoint, and report the completed access-control release.

## Phase 78: Portal Admin Future-Grade Workflow Verification
- [x] Verify the Add another grade control, controlled programme creation, and focused subject-intake handoff as Portal Admin without activating a curriculum.
- [x] Confirm the created programme remains intake-only until textbook review and explicit activation.
- [x] Record the end-to-end result and any evidenced follow-up fixes.

## Phase 79: Free and Open-Source Portal Functionality Review
- [x] Inventory teacher and Portal Admin components, runtime dependencies, local processing paths, and external-service boundaries.
- [x] Exercise teacher and Portal Admin workflows that operate without paid AI generation.
- [x] Repair verified low-risk functional issues and add focused regression coverage.
- [x] Validate reviewed workflows and document remaining external-service limitations.

## Phase 80: Automatic Teacher Provisioning
- [x] Audit sign-in provisioning and determine the safe identity fields available for staff assignment.
- [x] Add an explicit allowlist-based automatic teacher role assignment that cannot elevate Portal Admin access.
- [x] Surface pending staff accounts for Portal Admin review and preserve manual role management.
- [x] Add provisioning regressions, validate sign-in behavior, checkpoint, and report required onboarding steps.

## Phase 81: Secondary Generation Provider Assessment
- [x] Audit exact-result caching, prompt budgeting, circuit breaking, and retry handling in the existing quiz-generation paths.
- [x] Design a provider-isolated fallback that can be attempted only after an eligible primary-provider usage-exhaustion failure.
- [x] Preserve source grounding, structured output validation, citation rules, diversity checks, and per-provider observability.
- [x] Present the technical recommendation and request a Gemini credential only after explicit approval to implement.

## Phase 82: Portal Admin-Controlled Gemini Fallback
- [x] Define persistent Portal Admin configuration for enabling or disabling Gemini fallback without code changes.
- [x] Add provider-isolated routing so Gemini is attempted only after eligible managed-provider quota exhaustion, without retry loops.
- [x] Record provider, primary failure type, fallback use, and provider-specific retry telemetry for every generation job.
- [x] Add a concise Portal Admin AI generation controls card and visible generation history monitoring view.
- [x] Add source-safety, routing, control, and telemetry regressions; validate before requesting the Gemini key securely.

## Phase 83: Shared FBISE Style Anchor
- [x] Audit approved paper-pattern profiles, current prompt construction, and saved-paper evidence for a source-safe style anchor.
- [x] Define a shared anchor containing only approved FBISE wording, marks, and OR-pairing conventions, separate from textbook facts.
- [x] Decide and implement a bounded refresh lifecycle for approved examples without allowing unreviewed generated content to influence future papers.
- [x] Attach the exact same selected anchor to primary and Gemini fallback calls, with provider-neutral prompt accounting.
- [x] Add source-boundary, refresh, and cross-provider consistency regressions; validate, checkpoint, and report.

## Phase 84: OCR Review Comparison Workspace
- [x] Audit stored textbook-file access, page-image rendering, and page-bounded transcript availability for Portal Admin review.
- [x] Add an admin-only OCR review workspace with original page image and extracted page text side by side.
- [x] Add a controlled page-level correction action that updates only the reviewed page transcript, records who approved it, and never activates a source automatically.
- [x] Preserve explicit per-page approve/re-upload decisions without allowing a review action to alter other source text or activate sources automatically.
- [x] Add a Portal Admin-only temporary chapter exclusion control and remove excluded chapters from all teacher generation scopes.
- [x] Provide a safe interim path for inspecting flagged Chemistry page transcripts before the workspace is released.
- [x] Add authorization, page-boundary, review-action, and UI regressions; validate, checkpoint, and report.

## Phase 85: Published Portal Admin Access Visibility
- [x] Verify the deployed public landing route, authentication state, and Portal Admin route availability.
- [x] Diagnose whether a real navigation or role-visibility gap prevents Portal Admin from reaching curriculum controls.
- [x] Implement and validate a minimal navigation correction only if evidence identifies an app-level gap.
- [x] Clearly distinguish the app access path from the external account-status banner and report the result.

## Phase 86: Gemini Fallback Routing Regression
- [x] Inspect the persisted Gemini fallback setting, provider telemetry, circuit state, and the reported generation failure.
- [x] Trace managed-provider quota classification through the MCQ and printable fallback routing paths.
- [x] Repair any evidenced setting, environment, circuit, or routing defect without weakening source-safety safeguards.
- [x] Add regression coverage and validate the corrected fallback behavior with the configured provider.
- [x] Checkpoint and report the exact enablement path and remaining external limitations.

## Phase 87: Billing-Era Portal Visibility and Role-Separation Audit
- [x] Reconstruct each billing-era change and map its intended user, route, Portal control, and current visible state.
- [x] Verify owner, Portal Admin, Teacher, and ordinary-user role state plus published sign-in and route behavior.
- [x] Identify and repair every evidenced case where a completed capability is hidden, unreachable, unclear, or wrongly shown to a role.
- [x] Add visible role/status feedback and regressions for the corrected Portal access paths.
- [x] Validate the published Portal walkthrough, checkpoint, and report the actual teacher/admin separation.

## Phase 88: Published Revision Recovery
- [x] Reconcile the older local workspace and live public UI against the later database schema and verified checkpoint history.
- [x] Recover the latest verified source release locally without rewriting project history.
- [x] Restore the recovered release to the published project before making further Portal visibility changes.
- [x] Verify the restored published build exposes the intended role-gated controls and maintains Gemini fallback generation.

## Phase 89: Focused Portal Admin Workflow
- [x] Audit every current Portal Admin section and classify it by immediate staff task, dependency, and frequency of use.
- [x] Replace the long single-page administration layout with compact task navigation and focused progressive-disclosure sections.
- [x] Keep curriculum intake, staff access, OCR review, generation controls, and readiness work reachable without showing unrelated details together.
- [x] Add responsive UI regressions for task navigation and closed-section states, then validate the full build.
- [x] Publish the focused Portal workflow and document the intended staff path.

## Phase 90: Chemistry Page-56 Electrochemical Series Review
- [x] Verify the affected Chemistry source page, Unit 04 chapter mapping, OCR review status, and chapter availability.
- [x] Save the user-supplied Electrochemical Series transcript as a page-bounded reviewed correction for page 56 only.
- [x] Recheck remaining OCR flags and preserve manual control over Unit 04 generation availability.
- [x] Validate the resulting curriculum state and report the single remaining Portal Admin action, if any.
- [x] Checkpoint the reviewed OCR correction record.

## Phase 91: Chemistry Non-Substantive OCR Pages
- [x] Verify pages 1 and 6 are the only remaining Chemistry OCR flags and have no chapter-bound generation role.
- [x] Record the user-confirmed pages as reviewed without changing source or chapter content.
- [x] Verify Chemistry OCR readiness and unchanged generation availability, then checkpoint the review record.

## Phase 92: Security, Curriculum, Navigation, and Staff Access Audit
- [x] Audit server procedures, role boundaries, authentication assumptions, dependencies, secrets exposure, and error paths for evidenced security or hidden-regression risks.
- [x] Verify all Grade 10 Chemistry curriculum editions and safely archive the incorrect non-2022–23 edition without deleting audit history or active textbook evidence.
- [x] Map navigation dead ends and add consistent Back and return paths across teacher and Portal Admin workflows.
- [x] Define a professional sign-in and approval-first staff access flow within supported authentication capabilities; do not add unsupported Google/email/phone credentials superficially.
- [x] Implement the approved safe improvements, add regressions, run production validation, checkpoint, and report the verified limitations and findings.

## Phase 93: Mobile Back-Navigation Review
- [x] Map every mobile Back and return path across Quiz Centre, assessment builder, Portal Admin, and staff sign-in.
- [x] Verify mobile touch targets, labels, destinations, and state restoration in each active workflow.
- [x] Repair any evidenced mobile navigation gap and add focused regression coverage.
- [x] Validate and report the intuitive mobile navigation result.

## Phase 94: Active MCQ Generation Navigation Guard
- [x] Inspect active MCQ generation state and all assessment-builder Back navigation handlers.
- [x] Add an accessible confirmation that appears only while MCQ generation is active.
- [x] Ensure stay preserves the active request and leave returns safely to Quiz Centre.
- [x] Add regression coverage for guarded and ordinary Back navigation, validate, and publish.

## Phase 95: Mobile Leave-Confirmation Responsiveness
- [x] Capture the active-generation leave confirmation at a mobile viewport and inspect its spacing, text wrapping, action hierarchy, and clipping.
- [x] Refine the dialog only if the mobile review identifies an evidenced layout or usability issue.
- [x] Add or update responsive dialog regression coverage, validate, and publish the reviewed result.

## Phase 96: Leave-Confirmation Entrance Motion
- [x] Review the shared dialog animation primitives and preserve the reduced-motion path.
- [x] Add a short fade-and-scale entrance to the active-generation leave confirmation without changing its layout or behavior.
- [x] Add regression coverage, validate the motion refinement, and publish.

## Phase 97: Core Mobile Assessment Workflow Audit
- [x] Establish bundle, route-loading, and rendering baselines for the Quiz Centre and assessment-builder workflow.
- [x] Inspect grade selection, source selection, settings, active generation, and review states at a 390px viewport for responsive or performance bottlenecks.
- [x] Implement only evidenced low-risk improvements, add regressions, validate, and publish.

## Phase 98: Printable Generation Gemini Fallback Investigation
- [x] Inspect short-question printable-generation provider routing, Portal Admin setting, circuit state, and recent job telemetry.
- [x] Trace the managed-quota failure path and identify any concrete reason Gemini fallback is not selected.
- [x] Repair only an evidenced routing or configuration defect, add focused regression coverage, validate, and publish.

## Phase 99: Gemini Transient Request-Limit Recovery
- [x] Preserve and honor a bounded Gemini retry-after window for transient request-limit responses.
- [x] Keep transient Gemini circuits short and distinguish them from confirmed quota/billing outages in printable-paper feedback.
- [x] Add regression coverage, validate the recovery path, and publish only the evidenced repair.

## Phase 100: Token and API Usage Audit — Report Only
- [x] Map static prompts, source budgeting, output limits, cache/retry paths, provider request shapes, and recorded usage telemetry.
- [x] Assess all five proposed optimization areas without altering safeguards, provider settings, prompts, limits, or production behavior.
- [x] Deliver evidence-based findings and a safeguard-preserving recommendation; implement nothing until Portal Admin review.

## Phase 101: Safe Token Optimization Roadmap
- [x] Add additive, provider-reported token and cache-hit telemetry to generation records and Portal Admin history without changing generation behavior.
- [x] Validate telemetry through MCQ and printable paths while preserving source grounding, validation, diversity, exclusion, retries, and cache correctness.
- [x] Assess an approved-scope source-span selector only after telemetry is available; retain current source budgets until provenance and coverage are demonstrated.
- [x] Revisit output limits only after measured data and separate Portal Admin approval.

## Phase 102: Chemistry Short-Paper Completion Failure
- [x] Inspect the reported short-paper job, selected approved scope, provider telemetry, and exact server error.
- [x] Reproduce the failure and identify the specific capacity, provider, validation, or routing condition causing the generic mobile message.
- [x] Repair only the evidenced defect, add regressions, validate the mobile flow, and publish.

## Phase 103: Provider-Level Printable Failure Evidence
- [x] Correlate the latest failed Computer Science short-paper request with generation-job data, provider circuit state, retries, batching, source size, and production logs.
- [x] Determine from recorded evidence whether the managed provider, Gemini fallback, provider request limits, or application routing caused the failure.
- [x] Add durable Portal Admin-visible failure evidence and repair only a demonstrated application-side defect; validate and publish.

## Phase 104: Printable Paper 90-92% Doctype HTML Error Fix
- [x] Investigate server-side timeouts and client-side JSON parsing when printable paper generation reaches 90-92% progress.
- [x] Replace the long-running printable request with persisted bounded batch requests so gateway timeout HTML is no longer treated as an incomplete paper result.
- [x] Add regression tests, validate with build and test suite, and publish.

## Phase 105: Controlled Printable Generation Telemetry Test
- [x] Verify deployed printable batching and select the smallest valid approved scope for one real test request.
- [x] Run a real source-scoped printable-generation request and capture available timing evidence, provider route, retries, token use, and failure evidence.
- [x] Report measured results without changing grounding, validation, diversity, exclusion, or cache behavior.

## Phase 106: Progressive Source-Safe Printable Workflow
- [x] Audit existing printable batch execution, request lifetime, progress status, and approved-scope source assembly.
- [x] Design the bounded, resumable, per-batch-validated workflow for large printable papers without widening source authority.
- [x] Implement server-side orchestration and mobile-friendly truthful progress feedback.
- [x] Add source, diversity, retry, timeout, and progress regressions; validate and publish.

## Phase 107: FBISE Printable Question and Solution-Key Quality Calibration
- [x] Audit the reported printable draft against the selected approved textbook scope, verified paper-pattern profiles, and stored source references.
- [x] Replace generic language-heavy printable prompts with source-led, concept-first FBISE question rules across Physics, Chemistry, and Computer Science.
- [x] Add an evidence-bound diagram trigger and deterministic diagram instructions only where the selected textbook and paper pattern justify them.
- [x] Remove marking-guide wording from teacher-facing solution keys and present textbook-faithful definitions and structured comparison tables; automatic external supplementary facts remain prohibited.
- [x] Add paper-quality, source-alignment, diagram, solution-key, and PDF-output regressions; validate and publish.

## Phase 108: OCR-Tolerant Printable Evidence Verification
- [x] Trace the failed post-release printable batch and reproduce the exact textbook-excerpt matching mismatch.
- [x] Implement a bounded OCR- and formatting-tolerant excerpt matcher without accepting unsupported question evidence.
- [x] Ensure failed batches show an actionable correction path rather than a misleading resume state when zero pairs are verified.
- [x] Add source-matcher, progressive-state, and mobile-feedback regressions; validate and publish.
- [x] Add a server-derived private textbook anchor only when the generated question and answer retain multiple matching source terms, then validate it through focused and full regressions.

## Phase 109: Computer Science Chapter 1 Printable Quality Audit
- [x] Inspect the uploaded Computer Science Chapter 1 paper and solution key for FBISE structure, concept coverage, textbook faithfulness, solution usefulness, and print quality.
- [x] Trace confirmed weaknesses to the question-generation or PDF-rendering contracts without adding unsupported content.
- [x] Implement evidence-based professional PDF improvements: one-based question numbering, attempted-pair-only marks, balanced continuation pages, and student-ready solution presentation.
- [x] Add regressions, validate the generated PDFs, and publish the verified repair.

## Phase 110: Supervisor Security, Reliability, and Grade 9 Intake Review
- [x] Inventory project routes, procedures, data ownership boundaries, uploads, downloads, dependency state, generation recovery, and Grade 9 curriculum readiness.
- [x] Audit authorization, cross-user data exposure, curriculum isolation, source intake, printable state recovery, and mobile/frontend error paths.
- [x] Define and implement the least-risk Grade 9 intake controls: Portal Admin-only intake with teacher-facing preparation status until explicit activation.
- [x] Restrict PDF extraction to approved staff and reject malformed/non-PDF input before parser execution; add focused regressions.
- [x] Validate curriculum source MIME signatures and strict base64 before parsing or storing Portal Admin uploads; add focused regressions.
- [x] Make progressive printable batch claiming atomic and correct next-batch feedback to prevent duplicate requests or misleading progress.
- [x] Persist completion timestamps for completed MCQ and printable generation jobs so operational telemetry can report real durations.
- [x] Repair the demonstrated security, reliability, and Grade 9 workflow defects; add focused regressions and validate the production build.
- [x] Publish the audit findings and the Grade 9 operating recommendation.

## Phase 111: Professional Generation Feedback and Staff Sign-In Experience
- [x] Audit the current printable-generation feedback and staff sign-in page for clarity, responsiveness, accessibility, and truthful timing.
- [x] Add a professional real-state generation activity display without simulated progress or misleading completion claims.
- [x] Refine the staff sign-in page with concise approval-first guidance, clear visual hierarchy, and a mobile-ready layout.
- [x] Add focused UI regressions, validate the production build, and publish the upgrade.

## Phase 112: Printable Activity-State Explanations
- [x] Add concise accessible hover and keyboard-focus explanations for the Source scope locked and Review draft release activity states.
- [x] Add UI regression coverage, validate, checkpoint, and report the refinement.

## Phase 113: Computer Science FBISE 2027 Evidence Alignment
- [x] Inventory the retained Grade 10 Computer Science textbook and supplied model, 2024, 2025, and 2026 morning/evening paper evidence without requesting duplicate uploads.
- [x] Reconcile each paper's verified topic emphasis, wording, command forms, choice structure, and current-textbook alignment; exclude outdated or unsupported demands.
- [x] Apply only evidence-backed Computer Science generation guidance for 2027 preparation, preserving textbook-only factual authority and Portal Admin review.
- [x] Add regressions, validate, checkpoint, and report the evidence-based calibration.

## Phase 114: Grade 9 Controlled Intake Recommendation
- [x] Inspect the current Grade 9 programme, curriculum, textbook, and paper-pattern readiness without enabling generation.
- [x] Provide the minimal Portal Admin-only subject-by-subject intake and activation sequence for Grade 9 Physics, Chemistry, and Computer Science.

## Phase 115: Larger Source-PDF Intake
- [x] Audit all client, router, storage, extraction, and OCR size boundaries affecting Portal Admin textbook uploads.
- [x] Permit secure Portal Admin textbook source uploads up to 150 MB while retaining strict file-signature, MIME, and base64 safeguards.
- [x] Ensure large-PDF extraction stays server-side and bounded or queued, without requiring staff to split normal textbooks manually.
- [x] Add upload-limit regressions, validate, checkpoint, and report the intake upgrade.

## Phase 116: Grade 9 Duplicate-Subject Intake Repair
- [x] Trace the raw programme-catalogue insert failure shown during Grade 9 Chemistry subject intake.
- [x] Make duplicate subject selection safe and actionable, without exposing database internals to Portal Admin.
- [x] Add regressions, validate, checkpoint, and report the repaired Grade 9 intake flow.

## Phase 117: Large-PDF Upload Fetch Failure Investigation
- [x] Capture the actual request path, runtime/deployment evidence, and payload boundary behind the Portal Admin large-PDF “failed to fetch” error.
- [x] Replace only the proven incompatible upload transport or route boundary while retaining Portal Admin authorization, file-signature checks, and OCR review safeguards.
- [x] Reproduce the large-upload path within the supported boundary, add regression coverage, validate, checkpoint, and report the root-cause repair.

## Phase 118: Published-Link Access Verification
- [x] Verify the public production domain and the project-checkpoint handoff link after the reported access failure.
- [x] Repair only any confirmed public-link or routing issue, then provide the correct opening path.

## Phase 119: Upload 503 and Non-JSON Error Repair
- [x] Capture the production route, payload, and response evidence behind the Portal Admin large-PDF “Service Unavailable” failure.
- [x] Remove the client-side raw JSON parsing failure and give a precise, safe message when an upstream response is unavailable.
- [x] Replace only the proven incompatible transport boundary, add end-to-end regressions, validate, checkpoint, and report the repair.

## Phase 120: Truthful Chunk-Upload Progress
- [x] Inspect the acknowledged chunk response and current Portal Admin upload state before adding visual progress.
- [x] Show an accessible percentage bar and status based only on server-acknowledged upload bytes, without simulated completion.
- [x] Add regressions, validate, checkpoint, and report the chunk-upload progress enhancement.

## Phase 121: Truthful Upload Speed and Time Remaining
- [x] Inspect the acknowledged-byte progress state and define measured speed and remaining-time calculations without simulated values.
- [x] Show current acknowledged upload speed and an estimated remaining time only after enough real transfer data is available.
- [x] Add regressions, validate, checkpoint, and report the upload-metrics enhancement.

## Phase 122: Protected Upload Pause and Resume
- [x] Inspect the acknowledged chunk sequencing, retry behavior, and session lifetime before adding pause and resume controls.
- [x] Let Portal Admin pause before the next protected chunk, preserve the server-acknowledged state, and resume safely from that point.
- [x] Add pause-resume regressions, validate, checkpoint, and report the protected-upload enhancement.

## Phase 123: Textbook Upload Drag and Drop
- [x] Inspect the existing Portal Admin textbook upload controls and shared upload handler before adding drag-and-drop.
- [x] Add an accessible drag-and-drop target with true hover feedback and the same source validation and protected upload path as file selection.
- [x] Add drag-and-drop regressions, validate, checkpoint, and report the upload-interface enhancement.

## Phase 124: Mobile Background Upload Recovery
- [x] Inspect protected upload session expiry, acknowledged-byte speed calculation, and browser lifecycle handling behind the reported background-tab failure.
- [x] Preserve resumable client metadata and offer safe foreground recovery from the last server-acknowledged chunk when the tab returns.
- [x] Add lifecycle and measured-speed regressions, validate, checkpoint, and report the mobile upload-resume enhancement.

## Phase 125: Evidence-Led Security, Source Integrity, and Curriculum Flow Audit
- [x] Record a version-pinned evidence register covering security, source governance, model routing, reliability, and Portal Admin workflow findings.
- [x] Harden paper-pattern intake, chunk-upload completion, programme normalization, and edition lineage against verified integrity defects.
- [x] Strengthen source-citation evidence and generated-paper provider provenance without changing the approved model-routing policy.
- [x] Repair signed-out draft-library access and reorganize curriculum intake as Grade 9/10 → subject → textbook/model/past-paper source actions.
- [x] Add ordered past-paper metadata, migrate safely, add regressions, validate the full system, checkpoint, and report the audit release.

## Phase 126: Controlled Capability and Integration Assessment
- [x] Inventory existing connectors, skills, integrations, and operational gaps without changing configuration.
- [x] Evaluate only source-governed, cost-conscious capabilities that improve staff workflow, intake reliability, or FBISE preparation quality.
- [x] Produce a ranked Portal Admin decision plan with explicit security, privacy, cost, and UX effects before enabling anything.
- [x] Implement, validate, checkpoint, and document only the capabilities that Portal Admin explicitly approves.

## Phase 127: Layered Hardening, Owner Recovery, and Approved Operational Controls
- [x] Establish a version-pinned, layered hardening plan covering static analysis, secrets, dependencies, authorization, data flow, runtime behavior, regressions, builds, and visual paths.
- [x] Add deduplicated Portal Admin exception alerts for verified OCR and generation operational failures without exposing sensitive content.
- [x] Create and validate a concise Paramount Academy curriculum-governance maintenance skill.
- [x] Configure an owner-controlled GitHub export route and verify repository safety boundaries without placing secrets, database data, or curriculum source files in version control.
- [x] Execute the layered hardening audit, repair only evidence-backed defects, add regressions, validate, checkpoint, and deliver recovery guidance.

## Phase 128: Measured Output-Limit Review and Deployed Printable Verification
- [x] Review measured printable-generation telemetry and retain existing output limits unless a specific no-regression adjustment is justified.
- [x] Preflight and run one smallest valid approved Grade 10 printable-generation verification, recording only truthful provider and completion telemetry.
- [x] Apply only an evidence-backed repair if required, validate, checkpoint, synchronize the private GitHub backup, and report the result.

## Phase 129: Grade 9 Subject-Local Curriculum and Pattern Rollout
- [x] Audit the Grade 9 subject hub, existing Chemistry draft, teacher availability boundary, and private GitHub recovery mirror before changing behavior.
- [x] Refine Grade 9 subject-local textbook, model-paper, and chronological past-paper intake actions without mixing factual source authority.
- [x] Add a reviewable Grade 9 pattern profile and ensure only approved Grade 9 wording/format guidance reaches the Grade 9 style anchor.
- [x] Add subject-isolation, intake, chronology, activation, capacity, and role-boundary regressions; validate through production build and role-based browser checks.
- [x] Publish and synchronize the verified Grade 9 rollout, then document the next safe Chemistry intake action.

## Phase 130: Source-Governed Paper Library and Grade 10 Paper Management
- [x] Audit existing model/past-paper records, stored original PDFs, access rules, and student-facing surfaces before adding a paper library.
- [x] Define and implement approved-only student filtering by grade, subject, year, and paper type without exposing draft or unreviewed references.
- [x] Refine Grade 10 Portal Admin paper-source intake and controlled original-PDF download management using the existing paper records.
- [x] Add access, filtering, download, and responsive regressions; validate, publish, synchronize GitHub, and document the resulting paper-library workflow.

## Phase 131: Professional Repository Documentation and Owner Learning System
- [x] Audit repository records and existing maintenance guidance; define factual, privacy, and non-duplication boundaries for the documentation system.
- [x] Add a concise professional README and documentation index that orient an owner, maintainer, teacher/Portal Admin, and auditor.
- [x] Write an evidence-based concepts-and-architecture guide, blameless engineering lessons register, and durable project journal.
- [x] Document safe maintenance, documentation hygiene, validation, checkpoint, and private GitHub synchronization workflows.
- [x] Validate internal links, command examples, current-state claims, sensitive-content exclusions, repository status, and private GitHub backup before publishing.

## Phase 132: Grade 9 Chemistry Upload Recovery and Intake Integrity
- [x] Inspect the existing Grade 9 Chemistry programme, draft set, source records, and stale-session recovery path without deleting or duplicating data.
- [x] Retain strict server chunk integrity while exposing authoritative recovery state for safe client reconciliation.
- [x] Add a focused recovery UI that continues the existing Chemistry draft, retries only when safe, and offers a clear fresh-session action when needed.
- [x] Add stale-session, interrupted acknowledgement, duplicate-subject continuation, and mobile recovery regressions; validate, publish, and synchronize GitHub.

## Phase 133: Safe Automatic Textbook Upload Retry
- [x] Audit current transient and resumable-conflict retry boundaries; retain manual recovery for unsafe/expired/mismatched sessions.
- [x] Add bounded automatic retries with server-authoritative reconciliation before showing Portal Admin retry or fresh-session actions.
- [x] Add automatic-retry, exhaustion, and manual-fallback regressions; validate, publish, and synchronize GitHub.

## Phase 134: Portal Admin Incomplete Upload Drafts
- [x] Audit browser-local incomplete-upload state, curriculum draft records, and safe removal boundaries.
- [x] Add a focused Drafts section that lists incomplete uploads and routes Portal Admin to resume the correct existing subject intake.
- [x] Add a non-destructive clear-session action that removes only the local unfinished-transfer record, never a stored source or curriculum record.
- [x] Add visibility, resume, and safe-clear regressions; validate, publish, and synchronize GitHub.

## Phase 135: In-App Incomplete Upload Deletion Confirmation
- [x] Replace the browser deletion prompt with an accessible in-app modal that states the exact safe removal boundary.
- [x] Add confirmation and cancellation regressions; validate, publish, and synchronize GitHub.

## Phase 136: Final Reviewer-Readiness Deep Audit
- [x] Establish a reproducible baseline: repository inventory, live/schema/migration state, runtime routes, test/build baseline, Git status, and private backup head.
- [x] Audit every owned backend, schema, migration, shared contract, and test module for authorization, input validation, source isolation, data integrity, unused/duplicated paths, and regressions.
- [x] Audit source intake, OCR, Grade 9 durable upload/recovery, activation/readiness, generation/AI/provider controls, printable/PDF/download flows, student-paper publication, frontend/mobile/accessibility, and staff workflow boundaries.
- [x] Audit dependencies, secrets, logs, storage/Git hygiene, deployment evidence, and connector fit; introduce no external integration without an evidenced, least-privilege need.
- [x] Repair only confirmed P0/P1 findings with focused regressions; record observations and accepted risks without speculative rewrites.
- [ ] Complete full validation, controlled owner Grade 9 Chemistry upload acceptance when the owner supplies the file, reviewer-readiness record, checkpoint, and GitHub synchronization.
- [x] Repair the confirmed Drizzle migration-ledger gap only after verifying live schema features match committed migrations, then prove the standard migration command has no pending replay.
- [x] Make the Portal Admin generation history intrinsically newest-first at the data boundary and remove compensating client reversal with regression coverage.

## Phase 137: Independent Professional Re-Audit
- [x] Re-establish and record an independent baseline, treating prior audit conclusions as claims to verify rather than proof.
- [x] Review architecture, migrations, database integrity, security, identity, authorization, and source-isolation boundaries.
- [x] Review textbook intake, protected storage, OCR, durable recovery, Grade 9 readiness, AI-generation controls, provider reliability, citations, and diversity.
- [x] Review PDF/download and publication boundaries, frontend/mobile/accessibility flows, dependencies/configuration/integrations, performance evidence, and repository hygiene.
- [x] Repair only evidence-backed P0/P1 findings with focused regression coverage and record accepted P2/P3 observations privately.
- [ ] Complete release validation, synchronized private backup, and the owner-run Grade 9 Chemistry actual-PDF acceptance step before inviting academic review.
- [x] P0: Remove every teacher raw-text/uploaded-custom-material generation path so only explicit active textbook scopes can be factual input.
- [x] P0: Prevent client-supplied MCQ payloads from being saved under an unrelated valid textbook citation.
- [x] P0: Prevent arbitrary Portal Admin chapter or segment text from becoming active generation source content.
- [x] P1: Apply prior-paper concept/facet/answer exclusion across all authorised teachers for the exact curriculum scope.
- [x] P1: Remove the reachable process-local prepared-PDF export path; retain the protected direct streaming/download route only.
- [x] P0: Bind printable PDF exports to an owned, completed server-held generation result rather than a browser-authored payload.
- [x] P0: Remove or source-validate manual short/long/full-paper composition so browser-authored facts cannot enter reviewed drafts.

## Phase 138: External Technical Audit Package
- [x] Classify every tracked project file for full inclusion, metadata-only inclusion, or security redaction in the external audit package.
- [x] Produce the sanitized architecture, dependency, environment, security-control, external-service, and reproducibility inventory.
- [x] Assemble the single Markdown package with full in-scope source/configuration content, checksums, and sanitized diagnostics.
- [x] Verify the completed package for secret/source-data leakage, scope completeness, and structural integrity, then deliver it with a checksum manifest.

## Phase 139: External Security Report Remediation
- [x] Independently reproduce and classify each reported P0/P1 finding against the current private project state; separate artifact-only observations from current code defects.
- [x] Replace predictable OAuth state and long-lived unrevocable session behavior with browser-bound, expiring, revocable authentication controls and safe callback failures.
- [x] Remove pre-auth large-body parsing and public full-source analysis; bound upload, extraction, OCR, and provider-resource use with safe cancellation behavior.
- [x] Eliminate cross-teacher raw-paper disclosure, project generation status/error responses minimally, and make save/chunk-completion operations atomic and idempotent.
- [x] Define retention/cleanup policy for transient records, add bounded lists/readiness/deployment hardening, and produce a reproducible auditor artifact with the lockfile.
- [ ] Run independent regression, hostile-boundary, migration, frozen-install, and production-readiness validation; obtain owner Grade 9 Chemistry actual-PDF acceptance only after the hardening gates pass.
- [x] Preserve the 150 MB scanned-PDF requirement by storing an immutable chunk manifest and processing source data in bounded units rather than assembling whole documents in web-process memory.
- [x] Add a server-side quiz-save claim and transaction so repeated teacher submissions cannot create duplicate quizzes or partial question records.
- [x] Define and enforce bounded retention for transient generation results and expired exact-result cache records without affecting approved curriculum sources or reviewed papers.
- [ ] Diagnose and repair the deployed Staff sign-in “Unsupported sign-in host” failure for the configured academy domain, with hostile-host regression coverage and real mobile redirect validation.
- [ ] Resolve the confirmed publication block: checkpoint 7c7c3fe0 is marked Not published and the academy domain remains on an older OAuth handler; do not alter domain settings or rollback while platform support restores publication.
- [ ] Diagnose and repair the confirmed mobile OAuth callback failure: account selection reaches the academy callback, which returns the safe `Sign-in could not be completed` response. Preserve browser-bound state, trusted-origin, cookie, and session safeguards while tracing the exact callback failure.
- [ ] Diagnose and repair the confirmed Grade 9 Chemistry fresh-upload failure: the existing draft is detected, but the protected fresh-upload action reports `Unable to transform response from server`. Preserve the 150 MB manifest-backed resumable upload design, draft lineage, subject isolation, and Portal Admin authorization.

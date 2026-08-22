# Phase 129 — Grade 9 Curriculum Intake and Paper-Pattern Analysis Plan

## Goal

Extend the already proven Grade 10 curriculum lifecycle to Grade 9 without mixing grades, weakening textbook-only factual authority, or creating a broad, confusing administration screen. The result will let Portal Admin handle each Grade 9 subject independently: create the subject, upload its textbook, attach a model paper and chronologically ordered past papers, review extracted material, inspect the derived pattern profile, and explicitly activate the subject for teachers.

This plan also resolves the apparent empty GitHub repository display using read-only branch and commit verification before changing any backup configuration. The private backup has been pushed through Git transport; the visible mobile screen may be showing a stale default branch or a delayed page state, but this will be confirmed against the repository’s actual `main` reference rather than assumed.

## Core Governance Decisions

| Decision | Rule |
|---|---|
| Grade separation | Grade 9 and Grade 10 remain separate `board + grade + subject` curriculum records, sources, pattern references, analysis, activation status, and teacher availability. No Grade 10 source, pattern, or generated history is used as Grade 9 factual authority. |
| Subject separation | Each Grade 9 subject has its own subject hub. The initial supported subjects remain Chemistry, Physics, and Computer Science; Portal Admin may add another subject through the existing grade-local **Add subject** action when required. |
| Factual authority | Only the explicitly uploaded, reviewed textbook edition may supply facts, definitions, formulas, examples, citations, and solution-key content. Model and past papers never become factual sources. |
| Pattern authority | Model and past papers contribute only FBISE format, command wording, choice layout, mark/OR-pairing conventions, cognitive emphasis, and non-binding recurrence observations. They do not override the textbook or justify unsupported topics. |
| Activation | Every Grade 9 subject remains unavailable to teachers until Portal Admin has reviewed the textbook/OCR status, reviewed pattern intake, and explicitly activated the curriculum edition. |
| Capacity and duplication | Existing source-capacity warnings remain non-blocking. Generation stays breadth-first and blocks duplicate concept + facet / answer-target tasks rather than creating weak rewordings. |

## Implementation Modules

### Module 1 — Intake State and Subject Hub

Validate the existing Grade 9 subject hub against the Grade 10 lifecycle. The hub will show only the active task state: textbook status, model-paper status, past-paper timeline, review blockers, and activation state. It will not display raw database IDs, provider settings, OCR internals, or unrelated Grade 10 controls.

The existing **Add subject** action will be reviewed for Grade 9 specifically. It will remain grade-local, normalize subject identity, prevent duplicate programme creation, and return a teacher-readable route to the existing draft where an unfinished subject was already created.

### Module 2 — Textbook Intake and Review

For each Grade 9 subject, Portal Admin will upload one textbook edition through the existing 150 MB protected chunked path. The transport retains signature validation, durable chunks, 12-hour background recovery, OCR batching, page-quality review, and explicit activation gates. There is no separate Grade 9 upload transport and no manual splitting requirement for a normal textbook PDF.

The textbook will remain a draft until source extraction is complete, page review issues are resolved or consciously excluded by the established review mechanism, chapters are reviewed, and Portal Admin activates the edition. Teachers will see a preparation status rather than an unusable generation control.

### Module 3 — Pattern Reference Intake

Add or refine a compact source-action panel inside each selected subject hub:

| Source action | Required metadata | Intake outcome |
|---|---|---|
| **Model paper** | Academic year or session where supplied; optional shift | One subject-bound style/format reference. |
| **Past paper** | Academic year, chronological order, optional shift/session | A separately stored timeline entry with a unique ordering guard per subject programme. |
| **Additional past paper** | Same metadata, next chronological position | Adds evidence without replacing earlier papers or mixing shifts. |

All paper uploads will use the hardened signature and MIME validation already applied to paper-pattern sources. They will never be merged into textbook source text, and a failed or malformed upload will not change curriculum activation.

### Module 4 — Deterministic Pattern Profile and Human Review

Once paper references are available, derive a concise reviewable profile per Grade 9 subject. It should state what the evidence actually supports: Section A compact-option conventions, command forms, short/long question shape, marks, OR-pairing, repeated *format* tendencies, and differences between older and newer papers. It must label recurrence as historical evidence, not a probability promise.

Portal Admin will review the profile before it contributes to the shared style anchor. No pattern-analysis result can silently modify the generator’s factual scope or activate a subject.

### Module 5 — Generation Integration and Quality Gates

The Grade 9 builder will become available only after activation. Its generation calls will use the Grade 9 textbook scope plus the Grade 9 reviewed pattern profile and style rules. Existing validations remain mandatory: structured output, source citations, scope/anchor verification, concept/facet diversity, prior-paper exclusion, cache correctness, provider telemetry, and Portal Admin draft review.

### Module 6 — Evidence, Security, and Regression Pack

Add focused tests for Grade 9 subject isolation, duplicate-safe subject creation, textbook/paper-source separation, chronological past-paper entries, unactivated teacher blocking, reviewed-pattern propagation, source-capacity guidance, and mobile background-resume continuity. Run TypeScript, focused tests, the complete regression suite, production build, and one role-appropriate browser walkthrough per module before checkpointing.

## Proposed Delivery Order

| Release slice | Scope | Completion evidence |
|---|---|---|
| **129.1** | Audit Grade 9 subject hub and correct only demonstrated intake/state defects. | Grade 9 Chemistry draft safely resumes; Add subject stays grade-local and duplicate-safe. |
| **129.2** | Textbook upload/review readiness verification. | One Grade 9 textbook can resume after backgrounding and remains teacher-blocked until review/activation. |
| **129.3** | Model/past-paper actions and chronological metadata. | Each uploaded paper is subject-bound, validated, ordered, and visibly distinct from the textbook. |
| **129.4** | Reviewable Grade 9 pattern profile and style-anchor isolation. | Profile influences wording/format only after Portal Admin approval; textbook remains factual authority. |
| **129.5** | End-to-end activation and builder verification. | Activated subject is available to appropriate teachers; inactive subject remains clearly unavailable. |

## Integrations and Skills Decision

No new external connector is justified for the core Grade 9 lifecycle. The existing protected S3 storage, OCR worker, Portal Admin controls, Gemini fallback, generation telemetry, and GitHub recovery repository already cover the required functions. A Google Drive importer, Obsidian vault, messaging provider, or additional model connector would add credentials, duplicate storage, or staff confusion without improving source authority.

The approved Academy curriculum-governance skill will be used for every release slice. The source-capacity guidance will remain available for non-blocking warnings. GitHub will be used only as a private code-recovery mirror; uploaded textbooks and papers remain protected application storage and are excluded from the repository.

## Test Plan

The review will first verify the GitHub `main` branch and the latest pushed commit using authenticated Git transport/API, then determine whether the mobile interface merely needs a refresh or the repository default branch needs a user-visible correction. No repository history will be rewritten.

Each Grade 9 release slice will be validated with focused server/UI tests, `pnpm check`, the full test suite, a production build, and a role-based browser walkthrough. Any issue found will be logged with the reproduction path and fixed only if it is demonstrably within the application rather than a platform, browser-cache, or account-configuration condition.

## Assumptions and Risks

This plan assumes that Grade 9 Chemistry remains the existing draft starting point and that the first Grade 9 textbook upload will be Chemistry, followed by Physics and Computer Science after the preceding subject is reviewed and activated. If the intended order changes, records remain independent and no data needs to be deleted.

Past and model papers may contain material from an older curriculum. The profile must therefore record alignment limits and never inject a paper-only topic into source-grounded generation. OCR errors in tables, formulas, code, or diagrams remain review blockers where they affect a selected source scope.

# Phase 129 — Grade 9 Intake Baseline

## Verified State

The Grade 9 catalogue currently contains separate **Chemistry** and **Computer Science** intake-only programme records. Each has one draft curriculum set, no textbook source, no chapters, no paper references, and no teacher availability. Physics has not yet been created, so the existing Grade 9-local **Add subject** action is the correct route when it is required.

The administration flow already preserves the required safety boundaries: a Grade-local subject action leads to a textbook-first intake screen; textbook files use the protected 150 MB, resumable transfer path; model and past papers are stored separately from the textbook; and papers enter a reviewable style profile rather than source content.

## GitHub Recovery Mirror

The authenticated GitHub API and Git transport both confirm that the private repository is not empty. Its default branch is `main`, its remote `HEAD` resolves to `main`, and the latest pushed checkpoint is `adac0b54d01dc9daa2e9df9b7e4b8a1373b78362`. The supplied mobile page was therefore a stale GitHub page state or pre-push view, not a failed backup. No history rewrite, forced push, or repository setting change is justified.

## Demonstrated Refinement

The existing Grade cards show generic **Textbook** and **Papers** actions. The paper workspace correctly supports separate model-paper and chronological past-paper modes, but the source action is not visible at the grade-local entry point. The justified refinement is to expose clear, separate **Textbook**, **Model paper**, and **Past papers** actions for each subject while reusing the existing URL state, strict validation, source separation, timeline metadata, review, and activation gates.

No new connector, storage system, model provider, or background worker is needed for Grade 9 intake.

## Next Safe Intake Action

Portal Admin should begin with the existing **Grade 9 Chemistry** draft: open **Curriculum → Grade 9 → Chemistry → Textbook**, select the original textbook PDF, and allow the protected transfer to continue even if Chrome backgrounds. When extraction finishes, review any flagged OCR pages, confirm reviewed chapters, and activate Chemistry only after the readiness checklist is complete.

After Chemistry is active, repeat that same sequence for Grade 9 Physics through **Add subject**, then for the existing Grade 9 Computer Science draft. Add a model paper and past papers from the separate subject-local actions when they are available; give every past paper its academic year and timeline order (`1` for the oldest). These papers can inform reviewed wording and format rules, but they never supply factual content or activate a curriculum.

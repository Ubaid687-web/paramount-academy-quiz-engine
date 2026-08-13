# Frontend QA Notes

## Visual verification — August 13, 2026

The redesigned Quiz Centre now uses a light, structured Paramount Academy portal presentation with a single primary entry action: **Open Quiz Builder**. The prior duplicate top-and-centre generation actions are no longer present. Grade readiness is explicit: Grade 10 is ready for reviewed curriculum setup, while Grade 9 is correctly labelled as awaiting confirmation of its revised pattern and approved materials.

The Quiz Builder presents a compact academy header, an MCQ-only assessment badge, a left-to-right source-and-draft-setup workflow, and an explicit Grade 9/10 selector. Grade 10 retains subject, scope, difficulty, and source-grounding controls. Grade 9 displays an honest intake-pending state and disables draft generation rather than applying Grade 10 assumptions.

The browser view loaded without runtime rendering errors after the redesign. The development server still reports historical parser-error lines from earlier hot-reload attempts, but TypeScript validation and the full automated suite pass after the corrections.

## Progressive teacher workflow verification — August 13, 2026

The live landing screen now presents a Grade 9/Grade 10 choice as the first decision, with no quiz-builder or curriculum-management action competing for attention. A compact teaching-focus selector precedes the grade cards and is explicitly labelled as temporary until secure account permissions are linked. The teacher-facing navigation exposes Quiz Centre only; the protected curriculum screen is labelled Founder Administration and is not presented as a routine teaching action.

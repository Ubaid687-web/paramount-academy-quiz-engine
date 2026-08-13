# Teacher Experience Audit

## Scope

This audit reviews the current Grade 10 Quiz Centre and Assessment Draft Studio from a teacher-facing perspective. It preserves the established rules: grade-first navigation, source-grounded drafting, one-file custom uploads, and Portal Admin review before publication.

## Live findings

| Area | Finding | Refinement target |
|---|---|---|
| Primary workflow | The builder correctly presents assessment format and source selection, but the saved-draft loader appears before the new-draft steps and competes with the main preparation journey. | Move saved-draft retrieval into a compact, optional “Continue a saved draft” disclosure below the primary path. |
| Visual hierarchy | The page header, saved-draft card, format card, source card, and right sidebar all use similar visual weight. | Add a clear progress frame and distinguish the current step from optional and supporting controls. |
| Buttons | Source, format, and grade/subject buttons already have useful states but do not share a consistent press response or explicit selected-state cue. | Standardize active feedback, selected markers, focus visibility, and restrained hover/press motion. |
| Sidebar | Draft settings are useful but visually dense beside incomplete source entry. | Present the sidebar as a concise “Draft plan,” with readiness cues and a single outcome-oriented primary action. |
| Feedback | Upload and generation feedback exist, but the blank custom-source state is large and visually passive. | Improve the upload drop zone and readiness language while retaining the one-file rule. |
| Motion | Existing transitions are mostly color-only and are globally applied. | Introduce brief transform/opacity transitions for meaningful actions; respect reduced-motion preferences and avoid continuous decorative animation. |

## Focused implementation boundary

The refinement will not add arbitrary assessment features, alter source-safety restrictions, generate unsupported questions, or expose technical Portal Admin details to teachers. It will improve sequencing, readability, affordance, and feedback around the existing Grade → Subject → Format → Source → Draft workflow.

## Approved refinement plan

The refined interface will use a **quiet academic workspace** rather than a visually busy dashboard. The most important choices will remain visible, and optional work will move behind a deliberate secondary action.

| Refinement | Decision |
|---|---|
| Workflow frame | Add a compact four-stage progress rail: **Context**, **Format**, **Source**, and **Draft**. It will describe the journey without blocking an already selected Grade 10 context. |
| Saved work | Replace the full-width saved-draft card with a low-emphasis expandable “Continue a saved draft” control. Teachers beginning a new draft will not encounter an irrelevant ID field first. |
| Format and source cards | Give selectable cards a shared selected state, tick marker, hover lift, keyboard focus ring, and short motion. Locked modes retain a clear reason instead of appearing broken. |
| Draft plan sidebar | Reframe the sidebar as a visible readiness summary with source state, expected outcome, and one primary action. Controls that do not apply to manual short/long/full-paper drafting will not compete with the main form. |
| Upload state | Make the one-file upload restriction and processing state more legible, with a clear ready state once extraction completes. |
| Motion | Use transform and opacity only for micro-interactions, retain the existing generation-progress feedback, and disable non-essential motion for reduced-motion preferences. |
| Quiz Centre | Strengthen grade and subject selection with consistent selected/pressed signals and concise step descriptions, without exposing administrative controls. |

## Live verification after refinement

The live builder now presents its primary journey in the intended order: header, four-stage workflow rail, optional saved-draft continuation, assessment format, source choice, and the draft-plan sidebar. The saved-draft input is visually collapsed until a teacher explicitly chooses to continue work, avoiding competition with a new draft.

The Quiz Centre preserves the simple Grade 10 versus Grade 9 entry choice. The revised shared card affordance keeps the grade and subject cards visually consistent with the source and format choices in the builder. The assessment builder retains the existing generated-draft progress and review safeguards; no source-safety or access control was relaxed.

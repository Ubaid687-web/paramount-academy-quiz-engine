# Paramount Academy Staff Workflow Architecture

## Purpose

The quiz engine is an academy portal module, not a technical dashboard. A teacher should make one decision at a time and should never need to understand source snapshots, chapter segments, scope templates, or backend configuration in order to prepare an MCQ draft.

The navigation sequence is therefore:

> **Choose grade → choose subject → choose the next relevant action.**

Technical curriculum configuration remains separate from routine teacher preparation.

## Current Academic Scope

| Area | Status in the quiz engine |
|---|---|
| Grade 10 Physics, Chemistry, Computer Science | Active implementation priority. Specifications were analysed; each subject still needs reviewed source material activated in the curriculum workspace before chapter-scoped generation. |
| Grade 9 | Separate intake path. Its pattern changed, so it must receive its own approved material, question profile, and board-paper settings. It must never reuse Grade 10 settings. |
| Below Grade 9 / kids programme | Out of scope for the current MCQ engine. It should not appear as a misleading selectable grade until its assessment model is defined. |
| Mathematics and English | Recognised teacher subjects, but not part of the currently configured MCQ-engine subject scope. They are future subject expansions, not placeholders presented to teachers as working features. |

## Portal Access Model

All three teachers use the same clear **Teacher Preparation** workflow and can access all currently configured MCQ subjects: Physics, Chemistry, and Computer Science. The quiz engine does not display individual staff names, teaching sides, or founder wording. Portal Admin is responsible for deciding which signed-in portal accounts receive teacher or administrator access.

## Two Workspace Levels

### 1. Teacher Preparation

The default teacher view contains only:

1. **Grade cards** for Grade 9 and Grade 10, with readiness status.
2. **Subject cards** after a grade is chosen. All currently configured subjects are shown to teachers.
3. One context-aware action, such as “Prepare Grade 10 Physics MCQ draft.”
4. A short draft form: source choice, title, question count, and difficulty.

The teacher does not see curriculum activation, permanent-source storage, half-chapter boundary configuration, or database concepts.

### 2. Portal Admin

Portal Admin manages reviewed drafts, identifies missing curriculum sources, and can access the curriculum workspace. This technical capability is deliberately separate from teacher preparation; it is not shown in the default teacher navigation. The existing admin server procedures remain the authority for these protected operations.

## Account Provisioning Requirement

The current database has `user` and `admin` roles. The Portal Admin should promote the required signed-in academy accounts to administrator access in the portal. Names are not used as authorization controls. Because every teacher is intended to have access to all currently configured MCQ subjects, no person-specific subject-permission model is required at this stage.

## Next Implementation Sequence

1. Replace the information-dense Quiz Centre with Grade 9 and Grade 10 entry cards.
2. Reveal subject cards only after a grade is selected.
3. Open the builder already focused on the selected Grade 10 subject and hide technical curriculum detail in the default teacher path.
4. Retain a separate Portal Admin curriculum workspace.
5. Add new subject permissions only if the academy later decides teachers should have different subject access.

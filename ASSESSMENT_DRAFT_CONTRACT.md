# Source-Safe Assessment Draft Contract

## Purpose

This contract defines the backend and teacher-review structure for four assessment draft modes: **MCQ**, **short-question**, **long-question**, and **full-paper**. It does not define subject content, chapter lists, mark distributions, time limits, optional-question rules, or examination patterns. Those values may be used only when the matching user-supplied textbook and paper sources are active and referenced in the draft.

## Shared draft envelope

Every assessment draft must retain the following data before review or publication can be considered.

| Field | Requirement |
|---|---|
| `assessmentMode` | One of `mcq`, `short`, `long`, or `full_paper`. |
| `sourceState` | `ready` only when an approved source snapshot is attached; otherwise `blocked`. |
| `curriculumSetId` and `scopeSnapshot` | Required for approved textbook generation. |
| `paperPatternReferences` | Required for any saved full-paper blueprint and for mode-specific pattern claims. |
| `status` | Draft-only lifecycle: `draft`, `in_review`, `published`, or `archived`. |
| `reviewWarnings` | Must state when a source, paper pattern, or marking distribution is unavailable. |

## Item contracts

| Mode | Minimum required item data | Validation rule |
|---|---|---|
| MCQ | Question, four options, one correct option, explanation, difficulty, marks, source reference, learning objective | Exactly four distinct non-empty options; marks must be explicit; source reference and learning objective are mandatory. |
| Short question | Question, expected answer, marking guide, marks, source reference, learning objective | Marks must be explicit and positive; the marking guide and source reference are mandatory. |
| Long question | Question, expected key points, marking rubric, marks, source reference, learning objective | At least one non-empty key point and rubric criterion; marks must be explicit and positive. |
| Full paper | Ordered sections, each containing validated MCQ, short, or long items; total marks; paper-pattern references | Every section and item must validate independently; the total must equal the sum of explicit item marks; no fixed pattern is assumed without a supplied-paper reference. |

## Safety rules

The framework must never generate or save content merely because a mode exists. It must block generation when the selected subject has no active source snapshot. It must also block a full-paper mode from claiming an FBISE pattern when the matching user-supplied paper reference is unavailable. In every mode, generated content remains a draft for Portal Admin review before publication.

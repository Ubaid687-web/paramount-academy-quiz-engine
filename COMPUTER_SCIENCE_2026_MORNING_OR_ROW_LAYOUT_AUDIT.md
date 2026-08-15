# Computer Science 2026 Morning Paper: OR-Row Layout Audit

## Direct Visual Finding

The isolated user-supplied morning written-paper page confirms that the expected printed layout is a **two-column choice row**, not a vertical question followed by `OR` and then a second question. Section B is headed `Q.2 Answer the following parts briefly. (11 × 2 = 22)`. Each row has a left alternative, its marks, a narrow central `OR` column with vertical borders, a right alternative, and the right-side marks. The rows are labelled `(i)` through `(xi)`.

Section C uses the same left/right structure for each long-question row: left task and marks, a central bordered `OR`, then right task and marks. The user-supplied source visually shows this as the normal written-paper presentation for the morning shift.

## Rendering Requirements Derived from the Source

| Area | Required rendering behaviour |
|---|---|
| Section B | For every short-question OR pair, render a single bordered row with left prompt, centre `OR`, and right prompt. Both alternatives retain equal marks in their own narrow marks cell. |
| Section C | Render the long-question pair in the same left/centre/right pattern, preserving equal marks and a clear visual choice. |
| Row labels | Use part labels `(i)`, `(ii)`, … for Section B. Preserve Section C question numbers such as `Q.3`, `Q.4`, etc. |
| Borders | Use vertical dividers between left content, left marks, `OR`, right content, and right marks; do not use the old horizontal stacked layout. |
| Total marks | Count one attemptable side of every OR row, never both alternatives. |

## Source Boundary

This layout finding comes from the user-supplied 2026 Computer Science **morning-shift** written-paper page only. It is presentation evidence, not factual answer content, and does not activate the source or overwrite evening-shift records.

## Implementation Visual Verification

The rebuilt 11-part local PDF preview was rendered and inspected after implementation. It now shows one bordered row per part with the requested sequence: **left question**, **left marks**, a narrow **OR** divider, **right question**, and **right marks**. It displays Section B `Q.2`, parts `(i)`–`(xi)`, and 22 attemptable marks. This verification used placeholder wording solely to inspect geometry; it is not curriculum or question evidence.

## Reference

[1]: User-supplied Grade 10 Computer Science 2026 morning written-paper Sections B/C scan, reconstructed pattern source 150001.

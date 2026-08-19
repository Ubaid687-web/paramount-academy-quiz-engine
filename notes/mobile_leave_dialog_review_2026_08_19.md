# Mobile Leave-Confirmation Review — 2026-08-19

The active MCQ-generation leave confirmation was rendered at a 390 × 844 viewport using the live assessment-builder component. The dialog fits within the viewport with clear side margins; its title and description wrap without clipping; and the full-width controls provide usable touch targets.

The review identified one action-hierarchy refinement: the shared footer's `flex-col-reverse` mobile layout displayed the destructive **Leave generation** action above **Keep generating**, despite the latter being the safe, default choice. The dialog will be adjusted locally so **Keep generating** is the first visible mobile action, while the intentional leave action follows below it. The touch targets will also be raised to 44px minimum height for mobile use.

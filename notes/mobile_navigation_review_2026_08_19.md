# Mobile Navigation Review — 19 August 2026

## Initial capture findings

The Quiz Centre at 390px shows a compact Grade → Subject → Builder progress rail with readable hierarchy. The public root capture was still loading approved programmes, so it could not yet verify the later step-specific Back actions.

The initial Staff sign-in capture stopped on the lazy-route loading fallback, so a delayed mobile capture is required before evaluating its Back to Quiz Centre button. No implementation issue is concluded from that loading-only frame.

## Settled workflow findings

At 390px, the Staff sign-in route presents a visible `Back to Quiz Centre` control above the focused sign-in card. The control is separated from the primary sign-in action, uses a readable label, and has a touch-sized bordered target.

The assessment builder presents `Back to Quiz Centre` immediately beneath the Grade 10 Physics heading, before the Step 1 of 4 progress rail. The return control is visible without scrolling and does not compete with the later in-wizard `Back` control that preserves step state. No visual hierarchy issue was found in these two settled routes.

The unauthenticated Curriculum boundary also exposes a single prominent `Return to Quiz Centre` action. Focused regression coverage confirms Quiz Centre class/subject returns, assessment-wizard state restoration, Portal Admin return navigation, and Staff sign-in return navigation. No mobile navigation repair was evidenced during this review.

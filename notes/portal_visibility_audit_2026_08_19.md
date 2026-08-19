# Portal Visibility Audit — 19 August 2026

The public domain initially returned the older-looking loading state immediately after the recovery checkpoint. A subsequent published-page inspection completed and confirmed the recovered release assets were active: the unauthenticated Grade screen showed **Staff sign in**, Grade 10 and Grade 9 cards, and the draft-library entry.

The visible **Curriculum** navigation remains role-gated and is intentionally absent for an unauthenticated visitor. It must appear only after the owner or another Portal Admin completes staff sign-in.

After the role-visibility release, the public Grade screen continued to expose **Staff sign in** and the direct `/curriculum` route returned only the clear **Portal Admin access required** boundary to an unauthenticated visitor. The route did not render protected staff, generation, OCR, or curriculum controls in that state.

After the focused-workflow release, the protected published Curriculum route continued to show the same intentional Portal Admin boundary to a visitor without an authenticated staff session. The focused Admin layout itself is covered by UI regressions for Overview, Curriculum, Review, Staff, and AI task selection, including proof that unrelated controls are not rendered together.

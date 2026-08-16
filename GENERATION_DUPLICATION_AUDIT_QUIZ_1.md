# Generated Paper Duplication Audit — Quiz 1

## Evidence reviewed

The user-supplied two-page long-question draft, `quiz-1-paper(3).pdf`, was visually reviewed on 16 August 2026. It contains ten numbered OR pairs.

## Observed failure

The draft repeatedly re-tests the same small set of concepts under light rewording. The repeated concept families are Daniel cells / galvanic cells, hydrogen–oxygen fuel cells, electrolysis of molten sodium chloride (Down's cell), and electrolytic refining of copper. These recur across the numbered pairs rather than using the breadth of the source chapter.

The issue is semantic rather than only textual: different wording still tests the same underlying examinable concept. Therefore, prompt-only wording guidance is insufficient. The generator must receive an explicit concept inventory, assign a unique concept identifier to each generated item and OR alternative, and reject intra-paper or saved-paper concept collisions.

## Required behaviour

1. Every requested item, including each OR alternative, receives a source-derived concept/topic identifier.
2. No two items in the same paper may use the same identifier or semantic duplicate concept.
3. Generation must fail safely with an explicit insufficient-distinct-concepts explanation when requested coverage exceeds the verified source inventory.
4. Paper wording and structure must be informed only by verified uploaded paper-profile evidence; factual content remains textbook-bound.
5. Previously saved generated papers for the same subject and source scope must supply excluded concept identifiers and question fingerprints for the next generation.

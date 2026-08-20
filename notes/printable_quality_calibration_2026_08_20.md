# Printable Quality Calibration — 20 August 2026

## Observed defect

The reported Chemistry short paper is structurally valid but not academically ready. Its 3-mark prompts are too long, introduce unnecessary narrative framing, and sometimes expose internal wording such as **“source text”**. The current solution PDF is a staff-oriented marking document rather than a concise student-ready solution set. These are prompt and presentation defects, not a reason to relax the textbook-only authority rule.

The completed draft was generated from Grade 10 Chemistry Unit 02, *Matter*. Its first cooling-curve answer is broadly compatible with the selected extract, but the generated reference (`SOURCE SECTION 2`) and wording show that anonymous prompt chunk labels have leaked into the output. The source chunker currently splits a chapter by word count rather than textbook heading, figure, or exercise boundary. This is not suitable for an exam-preparation paper.

## Evidence boundary

| Material | Permitted role | Not permitted |
| --- | --- | --- |
| Selected approved textbook scope | The only factual authority for question premises, definitions, equations, diagrams, answers, and comparisons | Replaced by general model knowledge or a past-paper answer |
| Reviewed FBISE paper-pattern profile | Command wording, section structure, marks, OR pairing, and cognitive-demand calibration | Facts, examples, answers, or unverified syllabus coverage |
| Portal Admin-approved example | Style only | A fact source or a template to copy |
| Model knowledge | No automatic factual contribution | “Extra” answer points or diagrams not supported by the selected textbook |

> A claimed external “extra point” may look helpful but would violate Paramount Academy’s textbook-only rule. The solution key will therefore not add outside facts automatically. A clearly marked study note is allowed only when its wording is also supported by the selected textbook and its evidence is retained.

## Question-generation rules

1. **No internal-source language.** A student-facing question must never contain “source text”, “supplied material”, “selected source”, “SOURCE SECTION”, “this paragraph”, or an internal segment label. `sourceReference` must be a real textbook heading, figure label, or approved page-bounded reference.
2. **Concept before prose.** Each 3-mark prompt starts with one direct FBISE command such as *Define*, *State*, *Explain*, *Differentiate*, *Write*, *Calculate*, or *Draw and label*. A premise is permitted only if a matching textbook example, worked problem, figure, table, or exercise supports it.
3. **No decorative scenarios.** Medical, daily-life, laboratory, or industrial contexts cannot be invented merely to sound applied. They require a matching source-supported context.
4. **Strict source evidence.** Every item will carry a compact exact textbook excerpt. The server will reject output if the cited excerpt cannot be found in the selected scope after normalisation.
5. **Balanced but meaningful alternatives.** An OR pair has equal marks and comparable demand, while testing different supported facets or answer targets. It is not a pair of reworded definitions.
6. **All-subject consistency.** These rules apply to Physics, Chemistry, and Computer Science. The reviewed subject-specific paper-pattern profile only refines format; it never changes the factual boundary.

## Diagram rule

Diagrams are not decorative. A diagram is generated only when all of the following are true:

1. The selected textbook scope explicitly supports a figure, graph, labelled sketch, structural formula, apparatus, or process diagram.
2. The prompt requires drawing, labelling, interpreting, or completing that exact visual.
3. The generated answer includes a structured `diagramSpec` with a textbook figure reference, a permitted diagram type, and labels that occur in the selected source.

The PDF renderer will draw only deterministic, limited templates such as a labelled graph, flow/process arrow, or labelled block layout. It will never invent a chemical structure, apparatus, circuit, or scientific graph from general model knowledge. A subject-specific visual that cannot satisfy these conditions remains a concise “draw the textbook figure” instruction for Portal Admin review rather than a fabricated sketch.

## Solution-key rule

The printable document will be titled **Solution Key**, not “Marking and Learning Guide.” It will remove marking points, marks, rubrics, cognitive labels, and teacher-assessment wording. Each solution will present:

| Answer type | Presentation |
| --- | --- |
| Definition or law | **Textbook answer** using the exact or tightly faithful selected-book wording, linked to the stored excerpt |
| Explanation or process | Short ordered answer steps using only source-supported statements |
| Comparison | A clean two-column table built from paired source-supported contrasts |
| Calculation | Formula, substitution, working, and final unit when the selected scope supplies the relationship |
| Diagram | A compact deterministic diagram only when the structured diagram rule passes |

Internal provenance remains available to Portal Admin through the saved draft; it is not printed as student-facing “marking” content.

## Pattern-evidence status

The project has active extracted Chemistry model, 2024, 2025, and 2026 papers. The currently reviewed Chemistry profile is the 2026 paper and confirms 11 equal-mark 3-mark OR pairs plus 4 equal-mark 5-mark OR pairs. Computer Science has reviewed 2024 and 2025 profiles; Physics currently has an active model paper but no reviewed annual-paper profile. The shared quality rules can proceed now, but any new subject-specific structural claim must wait for explicit Portal Admin review of its existing paper-profile record.


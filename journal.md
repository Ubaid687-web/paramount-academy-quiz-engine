# Paramount Academy Quiz Engine — Project Journal

## Why This Journal Exists

This is the concise decision history of the project. It records major architectural and operational changes so that future work is based on evidence rather than memory. It is not a raw chat archive, a source-material archive, or a place for credentials and private data.

> **Journal rule:** Record the decision, evidence, change, validation, and remaining uncertainty. Do not claim more certainty than the evidence supports.

## Project Intent

The project began with a focused academic objective: create a professional FBISE preparation system for Paramount Academy that helps staff prepare assessment material from the Academy’s reviewed textbooks and supplied paper references. The design gradually moved away from a generic AI quiz interface toward a governed curriculum and paper workflow.

## Major Decision Timeline

| Era | Decision and outcome | Why it matters now |
|---|---|---|
| **Foundation** | The product boundary became source-grounded assessment preparation rather than unrestricted AI question generation. | Every later feature is evaluated against source authority, role clarity, and reviewability. |
| **Curriculum architecture** | Textbooks became versioned curriculum sets with sources, chapters, segments, scopes, activation, archival, and generation snapshots. | A book replacement changes future work without rewriting the evidence behind old drafts. |
| **Paper-pattern separation** | Model and past papers became separate style/format records, not factual sources. | Prevents old or paper-only content from entering textbook-grounded generation. |
| **Teacher workflow redesign** | The Quiz Centre became a grade → subject → builder workflow with return paths and clearer role-specific states. | Teachers see approved choices rather than administrative complexity. |
| **Portal Admin lifecycle** | Grade-local subject hubs, textbook/model/past-paper actions, OCR review, chapter confirmation, and activation were exposed as controlled workflows. | Routine source maintenance is no longer dependent on one conversation or one developer. |
| **Large-upload resilience** | Protected chunk upload, mobile background recovery, server-acknowledged progress, pause/resume, and idempotent completion were added. | Large official PDFs remain usable under slow mobile conditions. |
| **AI quality controls** | Structured output validation, citations, concept/facet/answer diversity, capacity guidance, prior-history exclusion, and style anchors became mandatory controls. | Generation quality is measured against evidence and contracts, not confidence alone. |
| **Provider resilience** | Managed provider remained primary; Gemini became a narrow fallback after classified quota exhaustion with shared controls and telemetry. | Availability improved without weakening source or validation requirements. |
| **Hardening and recovery** | Evidence-led audits strengthened paper-file validation, OCR/generation alerts, provenance, role boundaries, and private GitHub backup verification. | The project has a safer way to diagnose change without guessing. |
| **Paper library** | Portal Admin publication became separate from paper-pattern activation; signed-in users can filter explicitly published original PDFs. | Source references can support generation without being exposed as student downloads. |
| **Documentation system** | README, learning guide, lessons register, maintainer workflow, and this journal were added. | Knowledge now lives in the private repository rather than only in project conversations. |

## Current Operating Principles

1. **Textbook facts, paper style.** An activated reviewed textbook is the factual authority; paper sources are format evidence only.
2. **Grade and subject separation.** Grade 9 and Grade 10 do not share factual source, paper-pattern, scope, readiness, or history state.
3. **Review before activation.** Upload is not approval. OCR/page review, chapter confirmation, paper-profile review, and explicit activation exist for a reason.
4. **A draft is not a published assessment.** Human review remains required.
5. **Server rules matter.** UI clarity is important, but permissions, provenance, and validation are enforced on the server.
6. **Evidence before change.** A symptom should be traced before a feature or repair is added.
7. **Private GitHub is code recovery.** It holds code and documentation, never protected runtime data or source materials.

## Current Source and Programme Position

| Area | Position at the Phase 131 documentation release |
|---|---|
| Grade 10 | Active/ready programmes and their reviewed source workflows exist for the supported subjects. Paper records are programme-local. |
| Grade 9 | Intake-only unless a subject’s textbook is reviewed and explicitly activated. Chemistry and Computer Science intake records exist; they are not teacher-generation evidence until activation. |
| Paper PDFs | A paper must be an uploaded original PDF and separately published by Portal Admin before it appears in the signed-in paper library. |
| GitHub | Private owner-controlled mirror is used to preserve tested code/documentation checkpoints. |

## How to Add a Future Journal Entry

Copy this template into a new section at the top of the relevant release-era notes, then add a short line to the timeline above when the decision is material.

```markdown
## YYYY-MM-DD — Short decision title

**Decision or observation:**

**Evidence inspected:**

**What changed:**

**What did not change:**

**Validation performed:**

**Open risk or next review trigger:**
```

## Entry Quality Checklist

| Ask before writing | Good answer |
|---|---|
| Is this a material decision rather than a minor wording edit? | If yes, journal it. |
| Is the evidence named? | Link a test, audit, source, route, schema, or checkpoint. |
| Is the current state separate from an old plan? | State the difference plainly. |
| Are secrets or protected sources absent? | They must remain absent. |
| Did a new risk remain open? | Name it rather than hiding it. |

## References

[1]: [Documentation Map](docs/README.md)

[2]: [Engineering Lessons](docs/ENGINEERING_LESSONS.md)

[3]: [Maintainer Workflow](docs/MAINTAINER_WORKFLOW.md)

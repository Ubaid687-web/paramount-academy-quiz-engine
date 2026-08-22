# Documentation Map

This folder is the maintained learning and maintenance entry point for the Paramount Academy Quiz Engine. The documents explain the current system without copying protected textbooks, paper files, OCR text, database records, or credentials.

## Recommended Reading Order

| Reader | Recommended sequence | Outcome |
|---|---|---|
| **Owner / learner** | [Concepts and Architecture](CONCEPTS_AND_ARCHITECTURE.md) → [Engineering Lessons](ENGINEERING_LESSONS.md) → [Project Journal](../journal.md) | Understand what was built, why its controls exist, and how the project evolved. |
| **Future developer** | Root [README](../README.md) → [Maintainer Workflow](MAINTAINER_WORKFLOW.md) → [Concepts and Architecture](CONCEPTS_AND_ARCHITECTURE.md) | Make a small, validated change without weakening security, provenance, or grade isolation. |
| **Portal Admin** | Root [README](../README.md) → [Maintainer Workflow](MAINTAINER_WORKFLOW.md) | Understand the safe operational path for textbooks, paper references, and publication. |
| **Auditor / reviewer** | [Engineering Lessons](ENGINEERING_LESSONS.md) → existing audit notes → foundational architecture | Trace a claim to its documented evidence and distinguish current rules from historical findings. |

## Current Guidance

| Document | Purpose | Treat as |
|---|---|---|
| [README](../README.md) | Project boundary, stack, roles, and development commands. | Current entry point. |
| [Concepts and Architecture](CONCEPTS_AND_ARCHITECTURE.md) | Deep learning guide to the architecture, data flow, AI safeguards, and release practice. | Current explanatory guide. |
| [Engineering Lessons](ENGINEERING_LESSONS.md) | Evidence-based, blameless record of verified defects, corrective patterns, and remaining limits. | Current learning record. |
| [Maintainer Workflow](MAINTAINER_WORKFLOW.md) | Safe change, validation, and repository-hygiene procedure. | Current maintenance guide. |
| [Project Journal](../journal.md) | Concise chronology of major decisions and releases; includes an appendable entry template. | Current decision history. |

## Foundational and Historical Evidence

The following existing files are valuable evidence but may describe an earlier release state, historical test count, or a now-completed roadmap item. Do not use an older “next step” as a replacement for current code, tests, or the maintainer workflow.

| Record | Use it for |
|---|---|
| [Scope Architecture](../PARAMOUNT_FBISE_SCOPE_ARCHITECTURE.md) | Original domain model, source-snapshot principle, and scope-resolution design. |
| [Curriculum Lifecycle Recommendation](../CURRICULUM_LIFECYCLE_RECOMMENDATION.md) | Why the Curriculum Library exists and how editions/papers should be operated. |
| [Assessment Draft Contract](../ASSESSMENT_DRAFT_CONTRACT.md) | Draft-mode envelope and validation constraints. |
| [`notes/`](../notes/) | Phase-specific audits, hardening evidence, telemetry reviews, UX observations, and controlled validation notes. |
| [`todo.md`](../todo.md) | Completed and pending project work history. |

## Documentation Rules

1. Write a claim about current behavior only after checking the relevant code, schema, test, or validated release evidence.
2. Record a failure blamelessly: symptom, verified cause, risk, fix, regression, and remaining limit.
3. Never document credentials, tokens, source-PDF text, OCR transcripts, raw database data, student information, or unapproved material.
4. Keep the root README concise. Put learning detail in the concepts guide and operational detail in the maintainer workflow.
5. Update the journal and relevant guide in the same change as a material architecture or governance decision.

## References

[1]: [Architecture Decision Records](https://adr.github.io/) — a standard way to preserve the context and consequences of significant technical decisions.

[2]: [Google SRE: Postmortem Culture](https://sre.google/sre-book/postmortem-culture/) — a reference for blameless, learning-oriented incident analysis.

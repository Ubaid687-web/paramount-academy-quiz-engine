# Paramount Academy Quiz Engine

> **A source-governed assessment platform for Paramount Academy’s FBISE preparation workflow.**

This repository contains the Paramount Academy Quiz Engine: a React, Express, tRPC, Drizzle, and MySQL/TiDB application for preparing source-grounded assessment drafts and printable papers. It is designed for controlled academic use, not for unreviewed or general-purpose question generation.

## The Core Rule

**An uploaded, reviewed textbook is the only factual authority.** Model and past papers may guide wording, marks, section structure, OR-pairing, and cognitive emphasis, but they never supply facts absent from the approved textbook. Grade 9 and Grade 10 sources, paper profiles, activation state, and generation history remain separate.[1]

## What the Platform Does

| Area | Current responsibility |
|---|---|
| **Curriculum Library** | Portal Admin creates programmes, uploads and reviews textbook editions, handles OCR review, records chapters/scopes, activates ready editions, and archives replaced editions. |
| **Paper-pattern intake** | Model and past papers are stored per grade and subject, reviewed for structure only, and ordered chronologically when the metadata is supplied. |
| **Assessment generation** | Teachers create source-grounded drafts from approved textbook scopes. Structured-output, citation, diversity, source-capacity, and prior-history controls remain active. |
| **Provider resilience** | The managed provider remains primary; Gemini is a narrowly scoped fallback after classified managed-provider quota exhaustion. Provider provenance and non-secret telemetry are retained. |
| **Printable papers** | Printable MCQ, short-question, long-question, and full-paper drafts are reviewable PDF outputs. Online practice remains MCQ-focused. |
| **Paper library** | A signed-in user can filter Portal Admin-published original PDFs by grade, subject, year, and paper type. Pattern activation does **not** publish a paper automatically. |

## Roles and Boundaries

| Role | What it may do | What it may not do |
|---|---|---|
| **Portal Admin** | Manage curriculum sources, paper patterns, activation, publication, staff access, OCR review, and provider settings. | Bypass source review or silently replace a source edition. |
| **Teacher** | Build and save assessments from approved curriculum; access authorised paper-library PDFs. | Upload/activate official sources or change provider settings. |
| **Signed-in learner/user** | Access only appropriately published quizzes and Portal Admin-published paper PDFs. | Access drafts, source text, staff data, or curriculum management. |

## Architecture at a Glance

```text
Browser (React + Tailwind)
        │ typed calls
        ▼
Server (Express + tRPC) ──► Validation / role checks / generation orchestration
        │
        ├──► Database (Drizzle + MySQL/TiDB): metadata, lifecycle, audit records
        └──► Managed storage: original source PDFs and protected uploaded material
```

The canonical data model treats an edition as a versioned curriculum set. A source snapshot is retained for each generated draft, so changing a book affects future generation without rewriting historical evidence.[1]

## Local Development

```bash
pnpm install
pnpm dev
```

| Command | Purpose |
|---|---|
| `pnpm check` | Run TypeScript validation. |
| `pnpm test` | Run the Vitest regression suite. |
| `pnpm build` | Build the production client and server bundles. |
| `pnpm drizzle-kit generate` | Generate a migration after a reviewed schema change. |

Do not commit `.env` files, credentials, database exports, uploaded textbooks, paper PDFs, OCR text, object-storage data, or user uploads.

## Read This Next

| Reader | Start here |
|---|---|
| **Owner learning the system** | [Concepts and Architecture](docs/CONCEPTS_AND_ARCHITECTURE.md) |
| **Owner reviewing past mistakes and safeguards** | [Engineering Lessons](docs/ENGINEERING_LESSONS.md) |
| **Owner tracking the project’s evolution** | [Project Journal](journal.md) |
| **Future maintainer** | [Maintainer Workflow](docs/MAINTAINER_WORKFLOW.md) |
| **Everyone** | [Documentation Map](docs/README.md) |

## Important Limits

The platform supports preparation and review; it does **not** guarantee examination outcomes, automatically certify generated content as correct, or use a past paper as factual authority. Every generated draft still requires appropriate human review.[1]

## References

[1]: [Paramount Academy FBISE Scope Architecture](PARAMOUNT_FBISE_SCOPE_ARCHITECTURE.md)


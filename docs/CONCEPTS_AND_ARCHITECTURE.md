# Concepts and Architecture: How the Paramount Academy Quiz Engine Works

## How to Use This Guide

This is a learning guide, not just a description of files. Read the modules in order once, then return to the relevant section whenever you make a change. Each module answers four questions:

1. **What is the concept?**
2. **Why does it matter in a real academy product?**
3. **How is it used in this project?**
4. **What mistake does it prevent?**

The central theme is simple:

> **Good AI assessment software is not “a model plus a prompt.” It is a system of evidence, permissions, validation, review, and recovery.**

## 1. Product Boundary: What This System Is—and Is Not

The Paramount Academy Quiz Engine is a source-governed assessment workflow for FBISE preparation. Its purpose is to help authorised staff prepare reviewable quiz drafts and printable papers from reviewed curriculum evidence. It is not an autonomous examiner, not a general chatbot, and not a guarantee of marks or examination outcomes.

| Included | Intentionally excluded or controlled |
|---|---|
| Source-grounded MCQ drafts and printable-paper drafts | Unreviewed “generate from anything” academic claims |
| Versioned textbook intake and chapter scopes | Automatic replacement of an existing textbook |
| Paper-pattern guidance for wording and format | Using model/past papers as factual knowledge |
| Portal Admin review and publication decisions | Automatic student publication |
| Managed provider with narrowly scoped Gemini fallback | Adding providers merely because they are available |

### Why boundaries matter

Feature requests often sound useful in isolation. A button may be easy to add, but it can create clutter, cost, privacy risk, ambiguous ownership, or unsafe academic output. The project therefore applies a **minimum safe change** principle: solve the evidenced problem, preserve working controls, and do not introduce a second system when the current one can be extended safely.[1]

## 2. Full-Stack Architecture: What Happens When a User Clicks a Button

The application is a full-stack web system. The browser presents the interface, the server enforces rules, the database remembers business state, managed storage retains source files, and the model is only one controlled component.

```text
Portal user
   │
   ▼
React page + Tailwind interface
   │  typed tRPC request
   ▼
Express server procedure
   ├── checks session and role
   ├── validates request shape with Zod
   ├── loads only approved records
   ├── calls storage/database/provider when allowed
   ▼
Database + managed object storage + controlled AI provider
   │
   ▼
Validated result, audit metadata, and role-appropriate UI state
```

| Layer | Technology in this project | Main responsibility |
|---|---|---|
| Browser UI | React 19, Tailwind CSS 4, Radix components, Wouter | Shows one clear action at a time, collects valid input, and renders loading/error/success states. |
| Typed application boundary | tRPC 11 and Zod | Connects browser and server through typed procedures and validates data at the server boundary. |
| Server | Express and TypeScript | Applies role checks, source rules, generation orchestration, storage actions, and PDF workflows. |
| Database | Drizzle ORM with MySQL/TiDB | Stores lifecycle state, source metadata, chapters, scopes, jobs, draft records, and audit data. |
| File storage | Managed S3-style object storage | Stores original uploads separately from relational metadata. |
| AI providers | Managed provider plus Gemini fallback | Produces structured candidate output only after source selection and controls are in place. |
| Quality system | Vitest, TypeScript checks, production build, browser checks | Detects regressions before a checkpoint is published. |

### The important lesson

The browser is helpful for usability, but the server is responsible for security. A disabled button or hidden panel is not access control. Any protected operation must be rejected by the server when the caller has the wrong role or sends an invalid record ID.[2]

## 3. Identity, Authentication, and Role-Based Access Control (RBAC)

**Authentication** answers “who has signed in?” **Authorisation** answers “what is that account allowed to do?” RBAC is the practice of assigning permissions to roles rather than trusting the page someone happens to see.

| Role | Purpose in the project | Key server-side boundary |
|---|---|---|
| `user` | Ordinary signed-in user / learner surface | Cannot manage curriculum, staff, source text, or provider controls. |
| `teacher` | Staff assessment workflow | Can use approved curriculum flows but cannot activate sources or alter governance settings. |
| `admin` | Portal Admin | Can manage curriculum, paper references, publication, roles, and operational settings. |

The server uses procedures such as `protectedProcedure`, `teacherProcedure`, and `adminProcedure`. A correct pattern is:

```text
UI may show a relevant action
        ↓
Server verifies session
        ↓
Server verifies role
        ↓
Server verifies that the selected record belongs to the permitted programme/source
        ↓
Only then does it act
```

### Example: paper PDF access

An uploaded paper is not automatically public. The record first has to be a valid, extracted, active PDF; then Portal Admin must explicitly set its student-library state to published. The student list endpoint returns only published records, while the download endpoint verifies that same condition again before returning a signed storage URL. This is **defence in depth**: hiding a source from the list is not the only control.[3]

## 4. Source Governance: The Most Important Academic Concept

The engine has two distinct evidence types. They must never be mixed.

| Evidence type | Question it answers | Allowed use | Not allowed |
|---|---|---|---|
| **Reviewed textbook** | “What is academically true and in scope?” | Facts, definitions, formulas, textbook examples, solution-key evidence, citations. | Being silently replaced by a paper or general model memory. |
| **Reviewed model/past paper** | “How is the assessment usually presented?” | Command words, marks, sections, option length, OR-pairing, layout, cognitive emphasis. | Adding paper-only facts or copying questions as content evidence. |

This is more precise than saying “use RAG.” Retrieval-augmented generation normally means retrieving relevant text before asking a model to answer. Here, retrieval is **governed**: the server resolves an explicit, approved curriculum scope and supplies only that selected textbook text as factual evidence. Paper guidance is a separate structural context block, not a source of academic facts.

### Why this rule exists

A past paper may refer to an old syllabus, use a changed term, or contain a topic that is not in the current book. If the system treated papers as factual evidence, it could teach a student content that the approved textbook does not support. The rule protects both accuracy and future book replacement.[1][4]

## 5. Versioned Curriculum: Why a Book Is Not Just a PDF File

A naïve application attaches quizzes directly to a filename. That is unsafe because books change. Paramount Academy uses a versioned model:

```text
Programme (board + grade + subject)
      │
      ├── Curriculum set / edition A  ── archived later
      │       └── Source → chapters → segments / scopes
      │
      └── Curriculum set / edition B  ── becomes active after review
              └── Source → chapters → segments / scopes
```

| Entity | Plain-English meaning | Why it exists |
|---|---|---|
| **Programme catalogue** | One subject in one grade and board, such as FBISE Grade 10 Physics. | Keeps Grade 9/10 and subject records separate. |
| **Curriculum set** | One named textbook edition under that programme. | Lets a new edition coexist with the old one. |
| **Curriculum source** | The original uploaded file and extraction metadata. | Preserves provenance and file-processing state. |
| **Chapter** | A reviewed, ordered source region that can be selected for generation. | Avoids sending an entire book when a teacher selected one chapter. |
| **Segment** | An approved part of one chapter, such as its first half. | Supports a real sub-scope without guessing at page midpoints. |
| **Scope template** | A reusable approved grouping such as half syllabus or a block. | Stops teachers rebuilding the same selection repeatedly. |
| **Source snapshot** | The exact chosen evidence captured with a draft. | Preserves the explanation for an older draft after a later book change. |

### State machines

A **state machine** means that a record can move only through allowed states. It prevents a dangerous shortcut such as “uploaded therefore ready.”

```text
Textbook: draft → extracted / needs review → chapters reviewed → active → archived
Paper:    draft → extracted → profile reviewed → active → optionally published to students
Draft:    draft → in review → published or archived
```

Activation is deliberately different from upload. Upload means “the bytes arrived.” Activation means “a human reviewed the source and allows future generation to use it.”[1]

## 6. Secure File Intake: PDF, OCR, Storage, and Mobile Recovery

File handling is a security and reliability problem, not merely an upload button.

| Control | Meaning | Why it matters |
|---|---|---|
| Declared MIME check | Checks what the browser claims the file type is. | Useful but insufficient on its own. |
| File-signature check | Inspects the actual file header, for example `%PDF-` for a PDF. | Reduces the chance that a renamed or malformed file reaches a parser. |
| Decoded-size limit | Limits the real bytes after base64 decoding. | Prevents transport expansion from bypassing an intended size limit. |
| Managed object storage | Stores file bytes outside relational rows. | Keeps database metadata fast and avoids BLOB-heavy queries. |
| Chunked upload | Sends a large file in acknowledged pieces. | Allows large PDFs and avoids one fragile long browser request. |
| Durable upload session | Persists received-chunk status and a completion receipt. | Supports recovery after slow networks, backgrounding, or ambiguous final responses. |
| Idempotency | Repeating a completion action returns the original successful result instead of creating a duplicate. | Prevents duplicate sources and duplicate OCR work after retries. |
| OCR review | Flags low-quality extracted pages for human review. | Tables, formulas, charges, diagrams, and scans can be textually wrong even when a PDF “uploads successfully.” |

### Why OCR must be reviewed

OCR is optical character recognition: software converts page images into text. It is valuable for scanned books but not authoritative by itself. A chemistry table containing charges, arrows, subscripts, or voltage values is a high-risk OCR case. The correct process is to flag weak pages, compare source and extracted text, correct or exclude affected evidence, and activate only after the relevant review is complete.[5]

## 7. Controlled Retrieval: From Teacher Selection to Source Span

When a teacher chooses a chapter, the browser does not send arbitrary textbook paragraphs to the model. It submits identifiers such as a curriculum set, chapter IDs, segment IDs, or an approved scope template. The server then resolves those identifiers against the active reviewed records.

```text
Teacher chooses “Computer Science · Unit 2”
        ↓
Server verifies active programme and source state
        ↓
Server loads approved Unit 2 content in sequence
        ↓
Server creates a source snapshot and selected spans
        ↓
Only those spans become factual generation evidence
```

This protects against three common problems:

1. A browser cannot claim a different scope just by editing a request.
2. A previous/archived edition cannot silently become evidence for a new draft.
3. The model does not receive the whole book when one chapter was selected.

### Citation anchors

A question citation is not trustworthy merely because it names a chapter. The system validates that a cited text anchor actually appears in the resolved source span. This turns a citation from a decorative label into a verifiable claim about the supplied evidence.[6]

## 8. AI Generation Is a Controlled Pipeline

The AI model proposes output. The surrounding system decides whether the request is valid, whether the output has the required shape, and whether it can be saved.

```text
Validated scope + style rules + output schema
        ↓
Provider call
        ↓
Structured candidate output
        ↓
Schema, citation, diversity, and source checks
        ↓
Draft record for human review
```

| Safeguard | What it checks |
|---|---|
| **Structured output schema** | Required fields have the expected type and arrangement. |
| **Draft contract** | MCQs need four distinct options, one answer, marks, explanation, source reference, and learning objective; other printable modes have their own required data. |
| **Citation validation** | The cited anchor is present in the resolved approved textbook text. |
| **Concept/facet/answer diversity** | Questions do not assess the same concept in the same way or repeat the same answer target under light rewording. |
| **Source-capacity guidance** | Warns when the requested count exceeds the breadth of the selected evidence instead of silently padding with weak duplicates. |
| **Prior-paper awareness** | Uses saved history to reduce repeat questions across comparable drafts. |
| **Style anchor** | Applies reviewed paper-derived wording and layout conventions consistently across providers without importing paper facts. |
| **Human review** | Keeps output as a draft until an authorised reviewer decides it is suitable. |

### A useful distinction: a concept can have multiple legitimate facets

It is correct to test a concept through different meaningful facets. For example, a concept such as pressure might have one definition question, one formula question, and one applied calculation question. It is not correct to ask “Explain the Daniel cell” and “How does the Daniel cell work?” as two supposedly different questions when the expected answer is effectively the same. The diversity model makes this distinction explicit rather than relying on wording alone.[7]

## 9. Provider Resilience Without Pretending Failure Is Quality

External AI calls can fail because of rate limits, quotas, network interruption, malformed responses, or provider availability. The project handles these separately from academic quality.

| Reliability concept | Meaning in the project |
|---|---|
| **Retry with backoff** | A temporary failure is retried a bounded number of times with increasing wait rather than being repeated instantly. |
| **Circuit breaker** | Repeated provider failure temporarily stops more wasteful calls, giving the provider time to recover. |
| **Exact-result cache** | A repeated equivalent request can reuse a previously validated result instead of spending another provider call. |
| **Fallback provider** | Gemini may be used only after the managed provider has a classified quota-exhaustion failure; it receives the same style anchor and downstream validation. |
| **Telemetry** | The system records truthful non-secret metadata such as provider used, retry counts, cache reuse, prompt size, and available token measurements. |

The fallback does not make an output automatically correct. It keeps the same source grounding and validator requirements. Provider selection is operational metadata, not a claim about which answer is academically true.[8]

## 10. User Experience Is Part of Reliability

If a secure system is confusing, people bypass it. The front end therefore follows a **one decision at a time** pattern.

| UX principle | Practical application |
|---|---|
| Progressive disclosure | Grade → subject → builder, instead of all controls on one page. |
| Visible return paths | Back buttons restore the prior selection without a page reload or lost context. |
| Honest loading state | Upload and generation progress describe actual acknowledged work rather than an invented percentage. |
| Mobile recovery | Large uploads pause/recover around backgrounding and resume from server-acknowledged chunks. |
| Role-appropriate language | Teachers see approved choices; Portal Admin sees intake/review controls; ordinary users do not see source-management tasks. |
| Compact libraries | Drafts and published paper PDFs are accessed through distinct focused views, not added into the creation wizard. |

An interface should not force a teacher to understand database terms such as source ID, extracted-text record, or provider route. Those details belong in an explicit Admin diagnostic view or the documentation—not in a routine teaching decision.[6]

## 11. Tests, Builds, Checkpoints, and Private Backup

Quality is a process, not a final button.

| Practice | What it proves | What it does **not** prove |
|---|---|---|
| TypeScript check | Type contracts are internally consistent. | That a user flow is visually correct. |
| Unit/regression test | A named behaviour remains protected. | That every real browser/provider condition is covered. |
| Integration test | Several layers work together through a defined contract. | That production credentials or quota are available. |
| Browser review | A rendered role/path appears coherent. | That hidden server authorization is safe by itself. |
| Production build | Client/server code can bundle successfully. | That an external provider will never fail. |
| Checkpoint | A tested repository state is snapshotted and published. | That future changes cannot regress it. |
| Private GitHub mirror | Owner-controlled recovery copy of code and documentation exists. | That it contains protected runtime data or user uploads. |

The safe delivery sequence is: inspect → make the smallest justified change → update tests → validate → read `todo.md` → checkpoint → verify private GitHub `main` points to the checkpoint. This is a release discipline, not bureaucracy.[9]

## 12. Glossary

| Term | Plain-English definition |
|---|---|
| **Activation** | A deliberate Portal Admin decision allowing reviewed source records to influence future generation. |
| **Audit trail** | Metadata showing who did what, when, from which source, and with which provider/result state. |
| **Citation anchor** | A text fragment that must occur in the exact selected source span. |
| **Curriculum set** | A versioned textbook edition for one board/grade/subject programme. |
| **Idempotent action** | An operation that is safe to repeat because the second attempt returns the same result instead of duplicating it. |
| **Immutable snapshot** | A preserved record of source selection used to explain a historical draft later. |
| **Least privilege** | Give an account/service only the permissions needed for its job. |
| **OCR** | Optical character recognition: conversion of scanned page images into editable/searchable text. |
| **Paper profile** | Human-reviewed description of the structural evidence in an uploaded paper, not a factual syllabus source. |
| **Prompt injection** | Text inside supplied material trying to act like instructions; the system must treat material as data, not commands. |
| **Provenance** | Evidence of where a record or output came from and which process/provider produced it. |
| **RAG** | Retrieval-augmented generation: retrieving relevant source text before a model generates. This project uses a governed version constrained to approved scopes. |
| **Schema validation** | Checking that structured data follows required fields, types, and constraints. |
| **Style anchor** | Stable, reviewed structure/wording guidance shared across providers without importing paper facts. |

## What You Should Be Able to Explain After Reading

You should now be able to explain why this platform has distinct roles, why a textbook replacement creates a new edition rather than overwriting data, why a past paper cannot teach factual content, why uploads need signature/OCR/retry controls, why model output needs validation after generation, and why a checkpoint plus private GitHub mirror is part of responsible delivery.

## References

[1]: [Paramount Academy FBISE Scope Architecture](../PARAMOUNT_FBISE_SCOPE_ARCHITECTURE.md)

[2]: [Supervisor Audit](../notes/supervisor_audit_2026_08_20.md)

[3]: [Phase 130 Paper Library Findings](../notes/phase130_paper_library_findings.md)

[4]: [Curriculum Lifecycle Recommendation](../CURRICULUM_LIFECYCLE_RECOMMENDATION.md)

[5]: [Curriculum Governance Skill](../../skills/paramount-academy-curriculum-governance/SKILL.md)

[6]: [Phase 125 Audit Findings](../notes/phase125_audit_findings.md)

[7]: [Production Architecture Audit](../notes/production_architecture_audit.md)

[8]: [Gemini Fallback Integration Sources](../notes/gemini_fallback_integration_sources.md)

[9]: [Project TODO and release history](../todo.md)

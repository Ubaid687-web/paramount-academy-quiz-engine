# Paramount Academy Quiz Engine — Evidence-Led Deep Audit and Curriculum Intake Plan

## Goal

Conduct a **read-only, evidence-led deep audit** of the Paramount Academy Quiz Engine, then apply only the highest-priority, verified repairs needed to make the system secure, professionally structured, and academically aligned for FBISE Grade 9 and Grade 10 preparation. The work will treat the uploaded textbooks as the only factual authority. Model and past papers will remain **style, structure, and assessed-demand references**, never a substitute factual source.

The objective is not a broad redesign or feature accumulation. It is to find real defects, confusing flows, authorization gaps, source-governance weaknesses, weak model-routing decisions, and avoidable frontend/backend complexity; then remove or repair only what the evidence supports.

## Confirmed Product Model

| Area | Confirmed rule | Consequence for the audit and implementation |
|---|---|---|
| Grades | Grade 9 and Grade 10 are both supported. | Every catalogue, permission, intake, and teacher-ready check must be grade-specific. |
| Grade 10 | Physics, Chemistry, and Computer Science already have managed curriculum and paper-reference records. | Preserve the existing verified records; inspect them for lifecycle and UI defects rather than recreating or replacing them. |
| Grade 9 | No textbook or paper source is yet approved. | Show a safe Portal Admin intake state rather than any generation-ready state. |
| Future subjects | The academy may add a subject in either grade. | Permit controlled, grade-specific subject creation through the same review-first lifecycle; do not hard-code the present three subjects as an exclusive list. |
| Textbook sources | An uploaded, reviewed textbook is the factual authority for generated questions and solutions. | No generation may use paper text, general model knowledge, or unreviewed OCR as factual evidence. |
| Past/model papers | They teach question form, compact wording, command verbs, marks, OR-pair presentation, and assessed-demand patterns. | Store them as ordered reference evidence and expose their review status; do not label unsupported forecasts as probabilities. |
| Teacher experience | Teachers need one clear next action, not an article or an admin console. | Hide administrative details until the relevant decision is selected; preserve Back paths and state. |
| Portal Admin control | Nothing is teacher-ready without explicit review and activation. | Audit every procedure and UI route for server-side role enforcement and activation gates. |

## Proposed Intake Information Architecture

The audit will verify whether the existing Programme Catalogue → Curriculum Set → Source model can express this structure cleanly. If it can, the implementation will simplify the interface around it rather than introduce a competing model.

| Portal Admin level | Visible decision | Resulting controlled record | What must remain hidden until needed |
|---|---|---|---|
| Grade | Select Grade 9 or Grade 10. | Grade-specific catalogue context. | Other grade’s source details and advanced controls. |
| Subject list | Choose an existing subject or **Add subject** for the selected grade. | One programme per board + grade + normalized subject. | Duplicate/technical database identifiers. |
| Subject intake | Choose the source being added: **Textbook**, **Model paper**, or **Past paper**. | Draft source associated with exactly that programme. | Chapter/scoping/generation controls before the source is extracted and reviewed. |
| Past-paper timeline | Record a chronological ordinal and human-readable paper metadata: year, session/shift where supplied, and optional label. | Ordered paper-reference record; chronology is reviewable. | Claims that a paper guarantees or predicts a future question. |
| Review | Inspect extraction/OCR, page flags, source completeness, and paper-pattern profile. | Explicit reviewed state. | Activation and teacher availability before review. |
| Activation | Approve the reviewed textbook edition and, separately, the reviewed pattern references. | Teacher-ready programme only when its textbook source and scopes are valid. | Admin source-management forms in teacher screens. |

> **Academic safeguard:** the eventual “pattern recognition” view will describe verified historic observations—such as wording, command forms, distribution, or OR pairing—not a promise that a topic will repeat in a future FBISE paper. Textbook grounding remains mandatory for every generated question.

## Audit Phases

### Phase 1 — Baseline and Evidence Register

Create a version-pinned audit baseline from the deployed code and current database contracts. Inventory routes, role boundaries, curriculum and generation procedures, storage paths, migrations, environment-variable use, tests, and current source states. Record each finding with: affected file/procedure, reproducible evidence, severity, user impact, academic-integrity impact, and a recommended disposition: **fix**, **simplify**, **retain**, **defer**, or **reject**.

No behavior will change during this phase. Existing Grade 10 curriculum material and Grade 9’s unready status will be treated as protected facts, not inferred from UI labels alone.

### Phase 2 — Security, Privacy, and Reliability Review

Perform a layered review of the security-sensitive surfaces: authentication/session handling, Portal Admin and teacher authorization at every tRPC procedure, input validation, file MIME/signature validation, content-size boundaries, chunk-upload token/session lifecycle, object-storage key access, error disclosure, rate limiting/retries, OCR isolation, database queries, and LLM credential handling. Include dependency and secret-exposure scanning, but do not expose credentials or use production data outside the approved application boundaries.

The review will distinguish between a proven vulnerability, a hardening opportunity, and an architectural risk. P0/P1 findings will receive a minimal, test-backed remediation proposal; lower risks will be recorded rather than turned into speculative work.

### Phase 3 — Source Governance, FBISE Evidence, and AI Pipeline Review

Trace each generation path from the teacher’s selected scope to source retrieval, excerpt selection, source snapshots, citations, style anchor, concept-diversity checks, prior-paper avoidance, structured validation, solution-key creation, PDF output, provider routing, retries, caching, circuit breakers, and telemetry.

This phase will test the central academic contract: **textbook facts only; paper references for form only**. It will verify that Grade 9 cannot generate until reviewed curriculum exists, that Grade 10 only exposes active reviewed sources, and that paper metadata is incapable of silently becoming factual prompt material. The existing source-capacity mechanism will be assessed for determinism, clarity, and non-blocking behavior; it will not be converted into a hard generation limit.

Model routing will be evaluated against observed telemetry and source-validation outcomes. No model will be changed because it is fashionable or nominally “stronger.” A provider/model change will be recommended only if it demonstrably improves structured-output reliability, source grounding, latency, cost, or failure recovery while retaining all existing validation gates.

### Phase 4 — Portal Admin and Teacher UX Audit

Walk every major flow on desktop and mobile: staff sign-in, Quiz Centre, Grade → Subject → Builder, Portal Admin home, Grade 9 subject intake, Grade 10 source review, textbook upload/recovery, model-paper intake, past-paper intake, chapter/scoping review, activation, and downloadable-paper preparation.

The review will identify decision density, duplicate paths, dead ends, unsafe defaults, unclear labels, unnecessary paragraphs, state-loss risks, and technical detail exposed to teachers. It will specifically determine whether the present Curriculum Library’s panels, tasks, and forms should be retained, collapsed into dedicated steps, renamed, or removed. The acceptance standard is one current decision per screen, concise status, clear Back/exit actions, and no hidden bypass around review/activation.

### Phase 5 — Curriculum Library Simplification Design

After the evidence register is complete, produce a minimal information architecture and a change map before implementation. The intended user-facing result is:

| View | Primary content | Primary action |
|---|---|---|
| Grade 9 library | Subjects with a clear “not ready” state and an **Add subject** action. | Create/select one Grade 9 subject. |
| Grade 10 library | Existing subjects with source/readiness summaries plus **Add subject**. | Continue the selected subject’s current task. |
| Subject sources | Three small source cards: Textbook, Model paper, Past papers. | Add/review exactly one source type. |
| Past-paper timeline | Ordered, reviewable paper records with supplied metadata. | Add the next reference paper or open one record. |
| Review and activation | Only the current blockers and the next approval action. | Review, correct, or activate. |

The detailed profile fields, OCR diagnostics, provider settings, raw source metadata, and paper-pattern evidence notes will stay available only in explicit Portal Admin subviews, never beneath the teacher’s or first-step admin workflow.

### Phase 6 — Minimal Remediation and Regression Coverage

Implement only approved, evidence-backed fixes in priority order: first security/academic-integrity defects, then data/reliability defects, then confusing UX structure. Every change will include targeted regression coverage and preserve source snapshots, current Grade 10 records, Grade 9 gating, two-column printable PDF rules, and the protected 150 MB upload flow.

Changes with schema consequences will use a reviewed migration and data-safe backfill plan. No source files, curriculum editions, generated questions, or pattern-paper records will be deleted or reinterpreted without an explicit Portal Admin action.

### Phase 7 — Verification and Release Decision

Run static type checking, relevant focused tests, the full regression suite, a production build, role-based procedure tests, and representative mobile/desktop walkthroughs. Conduct a final source-governance test matrix covering Grade 9 unready state, Grade 10 active state, new-subject intake, paper chronology, non-blocking capacity guidance, model fallback, and PDF workflow.

The delivery will include a concise, evidence-indexed audit report, a change log, unresolved risks with their rationale, and a clear **go / conditional-go / no-go** recommendation. A release checkpoint will be saved only after all approved acceptance criteria pass.

## Explicit Non-Goals

This audit will not invent external FBISE content, add Biology, turn past-paper history into a probability engine, expose textbook text to teachers/students, remove existing Grade 10 records merely to make the interface look simpler, replace working provider routing without measured evidence, or introduce a document-generation/API integration solely because related skills are available.

The requested Typst and Manus API capabilities are not implementation dependencies for this work: no external Manus API integration or PDF report has been requested. If a formal printable audit report is later desired, the report can be produced separately after the findings are complete.

## Validation and Acceptance Criteria

| Category | Acceptance criterion |
|---|---|
| Authorization | Every sensitive curriculum, provider, history, source, OCR, and activation action is server-authorized; UI hiding is never the only guard. |
| Source integrity | Generated questions remain factually supported by active reviewed textbook material only; paper sources guide form only. |
| Grade separation | Grade 9 remains generation-blocked until explicit review and activation; Grade 10 records stay usable and unaffected. |
| Extensibility | A Portal Admin can add a subject under either Grade 9 or Grade 10 without duplicate records or cross-grade leakage. |
| Paper chronology | Past-paper records have an ordered timeline based on supplied metadata and are clearly labelled as reference evidence, not a prediction engine. |
| Teacher clarity | Teacher-facing screens expose only the current decision and a clear next action, with state-preserving Back paths. |
| Reliability | Upload recovery, retry, extraction, review, generation, caching, and PDF flows fail safely with actionable messaging. |
| Quality gate | TypeScript, targeted tests, full regression suite, production build, and representative mobile/desktop walkthroughs pass before checkpointing. |

## Assumptions and Open Risks

The plan assumes the retained Grade 10 sources and existing database migrations are authoritative project records; the audit will verify their actual status rather than trust labels. The user has not supplied any Grade 9 source yet, so Grade 9 work is limited to safe intake structure and must not create a fake ready subject. Historic papers may be incomplete or have uncertain session metadata; the timeline will preserve unknown fields explicitly instead of guessing. Any discovered critical vulnerability will be reported immediately with a containment recommendation before a broader UI refinement proceeds.

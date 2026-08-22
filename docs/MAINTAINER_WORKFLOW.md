# Maintainer Workflow: Safe Changes to the Paramount Academy Quiz Engine

## Purpose

Use this guide before changing curriculum data, paper sources, generation behaviour, access control, uploads, provider routing, or release documentation. It translates the project’s governing rules into a repeatable repository workflow.

> **Primary rule:** Make the smallest evidence-backed change that solves the actual problem. Do not add a connector, provider, background worker, data store, or feature merely because it is available.[1]

## 1. Non-Negotiable Invariants

| Invariant | Required behaviour |
|---|---|
| Textbook authority | Only the activated, uploaded, reviewed textbook provides facts, definitions, formulas, citations, and solution content. |
| Paper-role boundary | Model and past papers provide format/style guidance only; they never become factual generation evidence. |
| Grade separation | Grade 9 and Grade 10 records, chapters, scopes, style guidance, activation state, history, and availability remain separate. |
| Review gate | Source upload, OCR extraction, paper profiling, and activation are distinct; none implies the next automatically. |
| Server authorization | Protected actions require the appropriate server-side role check, not only hidden UI. |
| Honest status | UI progress, errors, provider metadata, and review warnings must describe actual state. |
| Recovery | Large uploads, retries, and finalization must be idempotent or explicitly recoverable. |
| Privacy | Never expose or commit source text, uploads, secrets, user data, database exports, or provider responses. |

## 2. Standard Change Workflow

```text
Read context and affected tests
        ↓
Record the change in todo.md
        ↓
Inspect the relevant UI + tRPC procedure + data helper + schema
        ↓
Make the smallest justified change
        ↓
Add/update regression coverage
        ↓
Run required validation
        ↓
Review todo.md
        ↓
Checkpoint and verify private GitHub main
```

### Required questions before implementation

1. Which user symptom, test failure, or audit finding is being addressed?
2. Is the root cause verified, or is it only a hypothesis?
3. Which role owns the action and which roles must be denied?
4. Does the change affect textbook authority, paper-pattern scope, source snapshots, or grade isolation?
5. What test will fail if this protection regresses?
6. Does it add a secret, a cost, a background process, a third-party dependency, or a second data store?

If the answer to the last question is yes, pause and document the demonstrated need, least-privilege model, cost owner, data flow, and recovery plan before proceeding.

## 3. Curriculum Operations

### Add a new subject or grade

1. Portal Admin opens **Curriculum Library** and starts from the intended grade.
2. Create a programme using the canonical board/grade/subject identity.
3. Keep the programme `intake_only` until it has a reviewed active curriculum edition.
4. Create or continue a draft curriculum set for the exact textbook edition.
5. Do not infer a chapter list from another grade, subject, public source, or previous book.

### Upload or replace a textbook

1. Use the protected on-site source-upload flow; it is the durable source of record.
2. Confirm the exact file, programme, edition label, and intended replacement relationship.
3. For a large PDF, use the existing resumable chunk flow. Do not manually split a normal book merely to bypass a UI limit.
4. Check extraction status and page-level OCR review. Review/correct/exclude relevant weak pages before activation.
5. Review chapter boundaries, sequence, titles, and scopes. They must be sourced from the uploaded edition.
6. Activate deliberately. A replacement must archive the old edition for future generation while preserving historical source snapshots.

### Add a model or past paper

1. Enter the grade-local, subject-local paper workspace.
2. Choose **Model paper** or **Past paper** correctly.
3. For a past paper, record the supplied academic year and chronological order; use `1` for the oldest supplied reference. Record a shift/session only when actually supplied.
4. Let signature validation and extraction complete.
5. Record/review the paper profile for structure only: sections, marks, OR pairs, command forms, and layout.
6. Activate only after review. Activation allows style guidance; it does not publish a PDF to students.

### Publish a paper PDF to the signed-in library

1. Confirm that the record is an uploaded original PDF, extracted, active, and appropriate for learner access.
2. Use **Publish to students** in the Portal Admin source row.
3. Verify it appears through the signed-in paper-library filters for the correct grade, subject, year, and type.
4. Use **Hide from students** if the paper should no longer be available. Do not delete its pattern record merely to hide it.

## 4. Generation and Printable-Paper Changes

Before editing generation or PDF logic, verify all applicable conditions.

| Area | Required check |
|---|---|
| Scope | The server resolves only active textbook chapters, segments, or templates; never raw browser text pretending to be a curriculum scope. |
| Citation | Every anchor is verified inside the exact resolved source span. |
| Diversity | Duplicate concept/facet/answer-target combinations and duplicate OR alternatives are rejected. |
| History | Comparable prior generated work is considered when forming a new draft. |
| Style | Paper references affect wording/layout only, never factual scope. |
| Output | Online practice remains MCQ-focused; printable modes follow their reviewable contract. |
| Provider record | Persist actual provider/fallback/retry data, never a hard-coded or guessed label. |
| Failure state | Preserve truthful error/recovery status; do not show a completion toast before a usable result exists. |

Do not reduce validation, source checks, citation checks, or human review merely to save provider tokens. Optimize only waste: exact-result reuse, source-span selection, bounded retries, stable prompt components, and truthful token telemetry.

## 5. Database and Schema Workflow

When a schema change is genuinely necessary:

1. Update `drizzle/schema.ts` using an additive, data-preserving design whenever possible.
2. Run `pnpm drizzle-kit generate`.
3. Read the generated SQL. Confirm that it does not drop or overwrite data unexpectedly.
4. Apply the reviewed migration through the approved database migration path.
5. Update the relevant database helper, tRPC procedure, UI, and tests.
6. Run the focused regression, `pnpm check`, the full suite for cross-cutting changes, and `pnpm build`.

Never use destructive SQL to “clean up” uncertain data. Preserve/archived records are valuable audit evidence.

## 6. Testing and Release Evidence

| Change type | Minimum validation |
|---|---|
| Documentation-only | Internal-link and command review, sensitive-content scan, `git diff --check`, repository status. |
| UI-only | Focused UI test plus responsive browser review. |
| Server/role change | Procedure-level test and a role-boundary regression. |
| Source-intake/upload change | Upload/signature/retry/idempotency tests and a relevant browser flow. |
| Generation change | Structured-output/citation/diversity tests, relevant end-to-end flow, TypeScript, full suite, production build. |
| Schema change | Migration inspection/application plus all affected tests and build checks. |

Before checkpointing, read `todo.md` and make sure completed items are marked `[x]`. Do not claim that a path was tested if only a static read or a unit test occurred.

## 7. Repository Hygiene and Private GitHub

The repository is a private code and documentation recovery mirror. It is **not** the runtime data store.

Never commit:

- `.env` files, API keys, OAuth tokens, cookies, or credential exports;
- database dumps, table exports, or user information;
- original textbooks, model/past-paper PDFs, OCR transcripts, source chunks, storage contents, or uploads;
- generated provider responses containing protected source text;
- screenshots that reveal private staff, student, or source data unless an explicit safe review process requires them.

After a successful checkpoint, compare the local `HEAD` commit with private `github-backup/main`. If the remote differs, push `HEAD:main` and verify again. Do not rewrite history or use destructive Git recovery commands to solve uncertainty.

## 8. Connector and Integration Decision Rule

No external connector is required for normal curriculum, generation, documentation, or repository operation at the current stage. Existing managed storage, OCR, provider fallback, owner alerts, and private GitHub backup address the evidenced needs.

Consider a new integration only when all of the following are written down and approved:

| Requirement | Evidence required |
|---|---|
| Concrete gap | A current workflow fails or is measurably too costly/slow without it. |
| Owner | A named person owns the account, cost, permissions, and deactivation decision. |
| Least privilege | Scopes/permissions are no broader than necessary. |
| Data flow | It is clear what data leaves the platform and why. |
| Source protection | Textbooks, papers, students, secrets, and provider data are not unnecessarily shared. |
| Recovery | Failure, revocation, expiry, and export/backup behaviour are defined. |
| Regression plan | Tests or verification prove that the integration does not bypass existing governance. |

Potential future Drive import is conditional on a real Portal Admin file workflow and must copy selected files into the existing reviewed storage lifecycle. It must never become a live unreviewed generation source.[2]

## 9. Documentation Maintenance

Update the following in the same checkpoint as a material decision:

| Situation | Update |
|---|---|
| New architecture or lifecycle decision | `journal.md` and the relevant concepts/maintainer section. |
| Verified defect and correction | `ENGINEERING_LESSONS.md`, test reference, and journal entry where material. |
| New core procedure or package command | Root `README.md`. |
| New/retired guide | `docs/README.md`. |
| New release work | `todo.md`, checkpoint message, private GitHub verification. |

Keep documentation concise at the entry point and deep where learning is needed. Do not paste protected source material to make a guide look detailed.

## References

[1]: [Paramount Academy Curriculum Governance Skill](../../skills/paramount-academy-curriculum-governance/SKILL.md)

[2]: [Phase 126 Capability Assessment](../notes/phase126_capability_assessment.md)

[3]: [Engineering Lessons](ENGINEERING_LESSONS.md)

[4]: [Project Journal](../journal.md)

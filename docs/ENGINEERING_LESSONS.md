# Engineering Lessons: What Went Wrong, Why It Mattered, and How the System Improved

## Purpose and Reading Standard

This is a **blameless engineering learning record**. It does not reproduce a private chat transcript, assign personal fault, or pretend that every historical symptom has a perfectly recoverable root cause. Instead, it synthesises the project’s verified audit evidence, completed release work, tests, and current safeguards.

For every lesson, separate these ideas:

| Term | Meaning |
|---|---|
| **User-observed symptom** | What a user or owner saw: for example, a failed download, duplicate question, unclear screen, or rate-limit message. |
| **Verified cause** | The technical condition confirmed in code, tests, or an audit. |
| **Correction** | The smallest justified change made to address the verified cause. |
| **Prevention** | The regression, rule, lifecycle guard, or validation step that reduces recurrence. |
| **Remaining limit** | A known boundary that has not been solved, either because evidence was insufficient or because solving it would add unjustified complexity. |

> **Blameless principle:** A good lessons record assumes people acted with the information available at the time. It improves the system and process rather than using hindsight to create blame.[1]

## 1. The Foundational Lesson: Chat Context Is Not a Durable Source System

### What went wrong

Early work depended too heavily on the belief that materials discussed or uploaded during a conversation were automatically available forever as a reliable application source. That created uncertainty about which Grade 10 textbooks and papers were actually available to the running product, which edition was correct, and whether a future upload would survive a later session.

### Why it mattered

The project’s purpose is source-grounded assessment. If source provenance is ambiguous, the system can appear intelligent while being unable to prove which book or paper supported an output. That is exactly the kind of uncertainty the Academy was trying to avoid.

### Correction and prevention

The system moved to a managed curriculum lifecycle: versioned curriculum sets, managed object storage, extracted-source records, reviewed chapters, activation states, and immutable snapshots on generated drafts. The Portal Admin Curriculum Library—not chat history—is now the operational source of record for academic material.[2][3]

### Learning rule

> A conversation can explain requirements; it cannot replace a durable, versioned data model for academic source evidence.

## 2. Source Authority Was Initially Too Easy to Blur

### What went wrong

The product required both textbook material and paper-pattern evidence. Without a strict conceptual boundary, it is easy for an AI workflow to use a past paper as if it were factual syllabus content, or to let an old paper silently influence a changed curriculum.

### Verified risk

The audit and architecture work identified that source roles needed to be explicit and mechanically enforced. A paper may reveal assessment style, but it cannot prove that a concept belongs in the current textbook. This is particularly important where old and new curricula differ.[2][4]

### Correction and prevention

The data model stores paper-pattern sources separately from textbook sources. Paper profiles and style anchors may contain structure, marks, command forms, OR-pairing, and wording guidance. Generation factual scope resolves only from approved textbook chapters and segments. Grade 9 and Grade 10 guidance is kept separate, including a regression against Grade 10 Computer Science calibration leaking into Grade 9.[5]

### Learning rule

> “Relevant to an exam” is not the same as “approved factual authority.” The system must store and process those claims differently.

## 3. A Technically Capable UI Can Still Be Operationally Unusable

### What went wrong

Several user-facing screens exposed too many unrelated controls at once. Examples included duplicate generation actions, dense configuration surfaces, unclear Grade 9 setup paths, lack of visible Back paths, and large Portal Admin areas that looked like an article rather than a task tool.

### Verified cause

The Phase 125 audit identified the problem as structural rather than cosmetic: the interface exposed multiple lifecycle concepts—programme, set, edition, source, profile, scope, staff settings, and provider controls—before the user had a clear next decision.[6]

### Correction and prevention

The UI adopted grade-first and subject-first entry, focused wizard steps, one decision at a time, role-appropriate controls, clear Back paths, and compact paper/draft libraries. Portal Admin source actions are separated into textbook, model-paper, and past-paper flows. The interface is tested for role boundaries, navigation, mobile upload recovery, and focused intake states.

### Learning rule

> If a user must read a long explanation to discover the next action, the workflow design—not the user—is the problem.

## 4. “File Upload Worked” Was an Inadequate Definition of Success

### What went wrong

Standard request uploads were not sufficient for large textbooks, slow mobile networks, browser backgrounding, or ambiguous final responses. The user experienced size limits, failed requests, session loss after returning to a backgrounded browser, and uncertainty about whether a file had actually been stored.

### Verified causes

The audit found two important classes of defects: paper input previously lacked the strict decoding/signature controls used for textbooks, and repeated final-completion requests could create duplicate source/OCR work because durable upload state had no idempotent completion receipt.[6]

### Correction and prevention

The source-intake path now uses strict decoding and file-signature checks, protected chunked upload for large PDFs, server-acknowledged progress, actual transfer speed and time estimates, pause/resume, browser-visibility recovery, durable upload tokens, and idempotent completion receipts. OCR remains a reviewable downstream process rather than a hidden assumption.

### Learning rule

> A production upload is a resumable transaction with validation and recovery—not a single `POST` request with a progress animation.

## 5. OCR Output Cannot Be Trusted Merely Because It Exists

### What went wrong

Scanned textbook pages and data-dense tables can extract to plausible-looking but inaccurate text. Formulas, ionic charges, subscripts, diagrams, and reference tables are particularly vulnerable. A low score is not automatically a broken book; it is a signal that the text needs review before it becomes generation evidence.

### Correction and prevention

The system records page-level OCR quality signals and requires review where needed before source activation. The Portal Admin workflow can compare an original page against extracted text and mark a page reviewed after correction or conscious inspection. A weak relevant page can also be excluded from generation rather than forcing unsafe reuse.[7]

### Learning rule

> OCR is a conversion aid. Human verification is what turns an OCR result into approved academic evidence.

## 6. Question Repetition Requires Meaning-Level Controls

### What went wrong

Generated papers could repeat the same underlying idea several times with superficial wording changes. For example, two prompts might use different verbs but demand the same explanation and answer. The opposite mistake is overcorrecting by allowing only one question per broad concept, which removes legitimate practice on definitions, formulas, and applications.

### Correction and prevention

The system distinguishes **concept**, **facet**, and **answer target**. It can allow different meaningful facets of a concept while rejecting the same assessed answer under light rewording. Source-capacity guidance warns when selected evidence is too narrow for the requested count, and prior generated history is used to reduce cross-paper repetition.[8]

### Learning rule

> Diversity is not “different sentences.” It is different assessed knowledge or a genuinely different application of that knowledge.

## 7. A Citation Label Is Not Evidence Until It Is Verified

### What went wrong

The earlier generation path could save a structured citation whose chapter/segment identity was valid but whose quoted text anchor was not verified against the actual resolved source span. This created the risk of a citation that looked auditable but was not tied to the selected textbook text.

### Correction and prevention

Citation validation now requires the normalised text anchor to occur in the exact resolved source span before a curriculum-scope draft can be saved. This is stronger than a chapter name alone and supports honest review.[6]

### Learning rule

> A citation is a testable relationship between an output and its evidence, not decorative metadata.

## 8. UI Hiding Is Not the Same as Access Control

### What went wrong

Some early flows allowed a signed-out visitor to open a protected draft library and receive a generic error. In another area, UI-level access could appear correct while a server route still needed a direct role check.

### Correction and prevention

Protected queries are now enabled only for authenticated users; signed-out users are directed to the proper sign-in flow. Teacher and Portal Admin procedures enforce their boundaries server-side, and regression tests exercise role separation rather than trusting hidden navigation alone.[6][7]

### Learning rule

> A hidden button improves usability. A server-side authorization check provides security. You need both.

## 9. Provider Failures Must Be Reported Truthfully, Not Guessed

### What went wrong

Quota, rate limit, network, and provider errors can look similar in a browser. Earlier records also had a provenance problem: saved generation metadata could claim a constant model/provider label rather than the provider that actually generated the output.

### Correction and prevention

The application now separates classified provider outcomes, retries, circuit state, cache reuse, and fallback decisions. The Gemini fallback is used only after managed-provider quota exhaustion is classified, and provider telemetry records actual provider routing without exposing credentials. Operational failure alerts avoid source text, prompts, keys, and provider responses.[6][9]

### Learning rule

> Good telemetry says what happened. It does not turn uncertainty into a confident story.

## 10. PDF Delivery Required End-to-End Evidence

### What went wrong

The application showed cases where a user received a “downloaded” notification but did not obtain a usable file, and preview/deployed behaviour could diverge. Printable layout also had to match the intended two-column OR-pair structure rather than merely render text on a PDF page.

### Correction and prevention

Download routes were hardened and tested, while printable layout received explicit structural rules. Verification combined route tests, controlled deployed checks, and user-visible browser review rather than assuming that a successful local response proves a real download workflow.[7][10]

### Learning rule

> A file export is complete only when the target user can open the intended file in the intended environment.

## 11. External Integrations Need a Proven Need

### What went wrong

In a project with AI, files, OCR, and an academy portal, it is tempting to add connectors, dashboards, knowledge bases, extra model providers, or background schedules because they seem professional. That creates duplicate data stores, credentials, costs, and failure modes.

### Correction and prevention

The capability assessment retained existing protected storage, OCR scheduling, provider routing, notifications, and private GitHub backup. It explicitly rejected another LLM provider, web scraping, broad messaging/CRM tooling, permanent OCR schedules, and third-party observability without an evidenced gap. The current documentation work makes the same decision: Markdown in the private repository is sufficient; no Notion, Obsidian sync, or documentation SaaS is needed.[11]

### Learning rule

> Professional engineering is often the discipline to **not** add a tool until a specific gap, owner, permission model, cost, and recovery plan are clear.

## 12. GitHub Is a Code Recovery Mirror, Not a Source-Material Store

### What went wrong

The project needed a reliable owner-controlled backup, but a repository must not become a place for secrets, databases, raw PDFs, OCR source content, uploads, or storage exports. Mobile GitHub UI behaviour also created uncertainty about whether a verified push had happened.

### Correction and prevention

The private GitHub remote is verified by Git transport and commit IDs, not only by a browser page. Repository exclusions protect sensitive content, and each significant checkpoint is synchronised to `main` and checked against the local commit.[5]

### Learning rule

> Treat the repository as versioned code and documentation. Treat managed storage and the database as controlled runtime data.

## 13. Documentation Was Itself a Missing Product Capability

### What went wrong

The repository contained useful architecture plans and audit notes but lacked one professional entry point, one owner-learning guide, one lessons register, and one durable project journal. This made the project difficult to understand without the original conversation context.

### Correction and prevention

Phase 131 adds the root README, documentation map, concepts guide, lessons register, journal, and maintainer workflow. The documents classify historical records and state current boundaries clearly. Future material changes should update the relevant guide and journal in the same checkpoint.

### Learning rule

> If essential project knowledge exists only in a conversation or one developer’s memory, it is not yet part of the project.

## Current Known Limits and Honest Non-Changes

| Item | Current position | Why it is not silently “fixed” |
|---|---|---|
| Perfect AI correctness | Not guaranteed. | A model can generate plausible but incorrect text; source checks and human review reduce risk but do not replace academic judgment. |
| Examination prediction | Not claimed. | Past-paper recurrence is historical evidence, not a promise about a future paper. |
| All OCR accuracy | Not assumed. | Weak or source-critical pages require review/correction/exclusion. |
| Third provider | Not added. | Managed-plus-Gemini routing already covers the evidenced resilience need. |
| Large frontend bundle | Recorded as a non-blocking observation. | Route-level code splitting should follow measured user-visible performance evidence, not a cosmetic warning alone. |
| Universal paper PDF availability | Not assumed. | Only uploaded original PDFs explicitly published by Portal Admin appear in the student library; reconstructed Markdown references do not pretend to be PDFs. |

## A Reusable Review Question Set

Before accepting a future fix, ask:

1. What exact user symptom or audit evidence are we addressing?
2. Is the cause confirmed, or are we guessing?
3. Does the change preserve textbook-only factual authority?
4. Does it preserve Grade 9/10 and subject isolation?
5. Is a server-side role check required?
6. What regression proves this issue will not silently return?
7. What does the user see if the operation fails, pauses, or needs review?
8. Does the change add a dependency, cost, credential, or data store without a demonstrated need?
9. Is a human still required to review the output or source?
10. What must be documented in the journal before checkpointing?

## References

[1]: [Google SRE: Postmortem Culture](https://sre.google/sre-book/postmortem-culture/)

[2]: [Curriculum Lifecycle Recommendation](../CURRICULUM_LIFECYCLE_RECOMMENDATION.md)

[3]: [Supervisor Audit](../notes/supervisor_audit_2026_08_20.md)

[4]: [Grade 9 Intake and Pattern Plan](../phase129_grade9_intake_and_pattern_plan.md)

[5]: [Paramount Academy Curriculum Governance Skill](../../skills/paramount-academy-curriculum-governance/SKILL.md)

[6]: [Phase 125 Audit Findings](../notes/phase125_audit_findings.md)

[7]: [Phase 127 Hardening Findings](../notes/phase127_hardening_findings.md)

[8]: [Production Architecture Audit](../notes/production_architecture_audit.md)

[9]: [Gemini Fallback Integration Sources](../notes/gemini_fallback_integration_sources.md)

[10]: [Phase 128 Deployed Printable Verification](../notes/phase128_deployed_printable_verification.md)

[11]: [Phase 126 Capability Assessment](../notes/phase126_capability_assessment.md)


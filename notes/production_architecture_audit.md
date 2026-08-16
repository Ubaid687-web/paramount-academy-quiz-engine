# Paramount Academy Quiz Engine — Production Architecture & Delivery Audit

**Prepared by:** Senior Systems Architect & AI Engineering Lead  
**Scope:** Comprehensive product, architectural, and workflow review of the Paramount Academy Quiz Platform to eliminate demo artifacts, enforce production rigour, and establish a bulletproof roadmap for board-exam preparation.

---

## 1. Executive Assessment & Product Reality Check

The Paramount Academy Quiz Engine is not a generic AI toy or a generic wrapper; it is a specialized, high-stakes assessment instrument designed for teachers (Ubaidullah Butt, Danish Butt, Ammara Faisal) preparing students for Federal Board (FBISE) examinations in Pakistan. 

To transition from a functional prototype to an enterprise-grade academy portal module, we must ruthlessly prune features that add administrative clutter, enforce strict separation between textbook content authority and paper-pattern styling, and guarantee zero-duplication, exam-authentic paper generation.

---

## 2. Architectural Audit: What We Keep, What We Refine, What We Reject

| Subsystem / Feature | Current State | Production Verdict | Architectural Rationale & Action Plan |
| :--- | :--- | :--- | :--- |
| **Two-Path Source Intake** | Approved textbooks vs. custom pasted/uploaded material | **KEEP & FORTIFY** | Essential for separating core FBISE curriculum from ad-hoc teacher notes. Must ensure custom sources never pollute approved chapter metadata. |
| **Concept-Facet-Answer Diversity Model** | Tracks `conceptKey`, `facetKey`, `answerTarget` | **KEEP & EXPAND** | Solves the duplicate-question problem by preventing identical answer targets and reworded clones while allowing legitimate facet breadth (definition, formula, application). |
| **Authentic FBISE Printable PDFs** | Two-column side-by-side OR-pair comparison layout | **KEEP & LOCK DOWN** | Directly matches official FBISE annual and model paper geometry (Section B/C row-by-row structure). Must remain immutable during future refactors. |
| **Source-Aware Capacity Warnings** | Compares requested count against estimated topic breadth | **KEEP (Non-Blocking)** | Prevents teacher frustration by warning when content is too narrow for large question counts without blocking generation. |
| **Transient Rate-Limit Retries** | Exponential backoff with jitter (3 attempts max) | **KEEP (Robust Transport)** | Protects against momentary Forge proxy blips. Explicitly separated from 412 quota exhaustion and billing pauses. |
| **Admin Retry Telemetry (`retryAttempts`)** | Recorded in `generationJobs` table | **RETAIN AS BACKEND TELEMETRY** | Useful for monitoring upstream stability, but should remain hidden from teacher-facing UI to avoid cognitive load. |
| **Over-Engineered Admin Dashboards** | Complex analytics, share tokens, spaced repetition | **DE-PRIORITIZE / HIDE** | Teachers care about 3 things: selecting scope, generating error-free exam papers, and printing clean PDFs. Strip non-core clutter from teacher views. |

---

## 3. The Production Engineering Principles

1. **Textbook is Authority, Papers are Format:**  
   AI generation must draw factual truth, definitions, and technical scope exclusively from the approved FBISE textbook content. Model and past papers are strictly formatting, command-word, and layout references.
   
2. **Zero-Tolerance for Question Duplication:**  
   Within a single generated paper or across a student's previous paper history, identical `answerTarget` strings and trivial rewordings are strictly forbidden. If content breadth is exhausted, the system must prompt for a wider scope.

3. **Frictionless Teacher Workflow (One Decision at a Time):**  
   The assessment builder wizard must remain strictly progressive: Grade → Subject → Source Selection → Quiz Settings → Review. No stacked panels, no scrolling confusion.

---

## 4. Prioritized Production Roadmap

### Phase A: Core Reliability & Zero-Clutter UI (Immediate)
- [ ] Hide administrative telemetry (`retryAttempts`, raw job IDs) from teacher-facing views.
- [ ] Ensure print/PDF stylesheets strictly enforce the two-column comparison layout with zero margin overlap.
- [ ] Lock down teacher roles so Portal Admin handles curriculum activation while teachers execute clean draft preparation.

### Phase B: Advanced Exam Pattern Calibration (Next)
- [ ] Refine short-question and long-question OR-pair pairing logic to mirror exact FBISE Section B/C mark allocations.
- [ ] Implement automated chapter-breadth pre-check so requested question counts automatically suggest optimal chapter groupings.

### Phase C: Portal Integration & Deployment Hardening (Final)
- [ ] Finalize secure database connection pooling and automated backup verification.
- [ ] Conduct end-to-end walkthrough across Physics, Chemistry, and Computer Science 10th-grade curricula.

---
*End of Architectural Audit.*

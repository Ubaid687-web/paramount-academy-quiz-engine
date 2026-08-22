# Phase 127 — Layered Hardening Findings

## Evidence Summary

| Layer | Evidence | Result | Disposition |
|---|---|---|---|
| Build integrity | Fresh TypeScript check, restarted development server, production build | TypeScript and production build pass. The previous schema-transform entry is historical; it is absent after the fresh restart. | **No repair.** |
| Dependencies | `pnpm audit --prod --audit-level=moderate` | No known production dependency advisories. | **No repair.** Revisit only when a real advisory appears. |
| Static execution and rendering | Bounded code scan, direct review of OCR execution and chart styling | OCR uses `execFile` with fixed executable names, fixed arguments, temporary paths, and MIME-derived extensions. The sole HTML injection is the internal chart component’s generated CSS, not user text. | **No repair.** These controls are constrained rather than arbitrary command/HTML execution. |
| Public/API boundaries | Router procedure map, previous role regressions, runtime route review | The public grade/readiness metadata is deliberate and excludes textbook content. Mutations and source/draft controls remain protected. Same-origin server middleware does not enable a broad cross-origin API path. | **No repair.** Preserve signed-out grade selection while retaining server-side role gates. |
| Source and OCR flow | Signature/OCR/retry/page-review tests, terminal exception alert tests | Protected intake, OCR review gates, and retry-safe chunk completion remain covered. New owner alerts are emitted only on a newly flagged review state or terminal OCR/provider failure, not progress or retry loops. | **Retain.** |
| Generation provenance | Citation/provider/diversity regressions plus new provider-failure alert test | Grounding and actual provider telemetry stay intact. Alert text does not contain prompt text, source text, provider response, or credentials. | **Retain.** |
| Regression resistance | Full Vitest run | 46 test files passed; 241 tests passed; 3 credential-gated tests skipped. | **Pass.** |
| Mobile workflow | Fresh 390 × 844 screenshot | Grade selection, separate Grade 10 readiness and Grade 9 setup paths, Portal Admin access, and draft-library action remain legible without a dense scrolling form. | **Pass.** |

## Observations That Are Not Current Defects

The development log contains an old schema transform error and normal restart `ELIFECYCLE` entries. A clean TypeScript check and fresh server restart succeeded afterward; treating those historic lines as a current application failure would be misleading.

The production build again reports a large shared JavaScript chunk (approximately 685 kB before gzip and 199 kB gzip). This is a measured **performance follow-up**, not proof of a functional or security defect. Do not introduce speculative route splitting until actual field loading measurements identify a slow route or device.

The build also reports an outdated `baseline-browser-mapping` dataset notice. It is a non-blocking development dependency-data notice, not a known vulnerability or runtime failure. Updating it would change the dependency tree without evidence that it benefits this application; defer it.

## Repairs Justified by Evidence

No additional repair is justified by this audit layer beyond the already implemented terminal operational-alert boundaries and GitHub ignore-policy hardening. The remaining GitHub backup connection is blocked only by repository creation permission and awaits the owner-created private repository.

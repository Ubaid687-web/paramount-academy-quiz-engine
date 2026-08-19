# Core Mobile Assessment Workflow Audit — 2026-08-19

## Initial visual baseline

The Quiz Centre and Grade 10 Physics assessment-builder entry were captured at a 390 × 844 viewport after the application finished loading.

Both screens fit within the viewport without horizontal clipping. The Quiz Centre has a clear grade-first hierarchy, and the builder presents one active decision group with a visible return path and compact step rail. The builder's first screen still shows the three assessment-output options vertically; this is intentional content rather than a rendering defect, but the remaining source, settings, generation, and review states require inspection before deciding whether any optimization is justified.

## Current performance baseline

Production already lazy-loads the Assessment Builder and Curriculum Management routes. The assessment-builder chunk is approximately 132 KB uncompressed, while the shared initial JavaScript chunk is approximately 679 KB uncompressed. The latter is the only clear bundle-size signal so far; no change should be made until module ownership and mobile workflow impact are established.

## Source-selection mobile check

The focused source-choice screen fits at 390px without clipping or an unnecessary scroll. It shows only the two source paths and maintains a clear recommended/default choice. This confirms the progressive-disclosure approach is working here. The source catalog, draft availability, and other scope-dependent work should be deferred until this stage is reached, because requesting them during the first output-selection screen adds avoidable network and rendering work on mobile.

## Settings and active-generation assessment

The mobile settings screen is similarly focused: the question-count control and one forward action fit within the first viewport. No responsive repair is evidenced in the inspected Quiz Centre, output, source, or settings stages. The confirmed low-risk optimization is therefore limited to deferring the approved curriculum scope-catalog request until the teacher chooses an assessment output and reaches source selection. The request remains unchanged once the source stage opens; no generation, source-safety, or Portal Admin behavior is altered.

# QA Notes

## 2026-08-12 — Quiz generation feedback validation

The live preview route for the AI Quiz Generator is `/generate` (not `/ai-agent`). The route loaded successfully after the progress-feedback changes, displaying the expected content input, title field, question-count control, difficulty selector, and generation action. The animated in-progress panel is covered by automated UI tests because generating a real quiz would invoke a paid external model call.

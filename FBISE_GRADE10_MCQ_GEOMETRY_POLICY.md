# FBISE Grade 10 MCQ Physical-Layout and Compactness Policy

**Status:** Reviewed and Enforced across Chemistry, Physics, and Computer Science  
**Authority:** Supplied Federal Board (FBISE) Model Papers, 2024 Past Papers, 2025 Past Papers, and 2026 Annual Papers  

---

## 1. Physical Layout and Geometry Constraints
Official FBISE Section A papers present 12 to 15 multiple-choice questions on a fixed single sheet or structured bubble-sheet format. To fit physical test boundaries without spilling over or requiring cramped margins, verified papers enforce strict stem and option length limits:
- **Stems:** Direct, single-clause test items. Maximum length: **110 characters** (approx. 12–18 words). Multi-sentence background paragraphs, introductory scene-setting, and nested bullet points are strictly prohibited.
- **Options (A, B, C, D):** Short, parallel, answer-shaped choices. Maximum length per option: **35 characters** (single terms, formulas, short numerical values, or brief phrases). Paragraph-length options or explanations disguised as distractors are forbidden.
- **Explanations:** Brief, single-sentence clarification (under 25 words) stored for teacher review, never printed inside student Section A bubble-sheet space.

---

## 2. Subject-Specific Calibration
1. **Chemistry:** Stems focus on reaction types, chemical formulas, stoichiometry values, equilibrium conditions, and functional group definitions. Options are kept to chemical symbols, short names, or molar quantities.
2. **Physics:** Stems test formula relationships, unit conversions, ray optics principles, and circuit states. Options use compact SI units or formula ratios.
3. **Computer Science:** Stems test syntax terms, data structures, loop control flags, and network roles. Options use short keyword values or brief operational outcomes.

---

## 3. Enforcement Mechanisms
- **Prompt Engineering:** `MCQ_GENERATION_PROMPT` enforces strict character caps (max 110 chars for stems, max 35 chars for options) and forbids multi-clause narratives.
- **Automated Validation:** `validateGeneratedMcqs` in `quizDraftValidator.ts` rejects any generated question where a stem exceeds 130 characters or any option exceeds 45 characters.
- **Printable PDF Export:** `renderMcqPaperPdf` formats compact options inline or in balanced columns to preserve physical paper bounds.

export type McqLayoutItem = {
  question: string;
  options: { A: string; B: string; C: string; D: string };
};

export type McqLayoutDiagnostic = {
  questionWords: number;
  optionWords: Record<"A" | "B" | "C" | "D", number>;
  warnings: string[];
};

const OPTION_KEYS = ["A", "B", "C", "D"] as const;

function wordCount(value: string) {
  return value.trim() ? value.trim().split(/\s+/).length : 0;
}

/**
 * The supplied FBISE papers contain wrapped stems and wrapped options, so this
 * is an outlier diagnostic rather than a generic character cap. It only flags
 * content that is materially outside the observed paper forms; the PDF
 * renderer remains the final physical-fit authority.
 */
export function diagnoseMcqLayout(item: McqLayoutItem, questionNumber: number): McqLayoutDiagnostic {
  const questionWords = wordCount(item.question);
  const optionWords = Object.fromEntries(OPTION_KEYS.map((key) => [key, wordCount(item.options?.[key] ?? "")])) as McqLayoutDiagnostic["optionWords"];
  const warnings: string[] = [];

  if (questionWords > 42) {
    warnings.push(`Question ${questionNumber} has an unusually long stem (${questionWords} words) for the supplied Section A table; rewrite it as one direct paper-ready focus.`);
  }
  const longOptions = OPTION_KEYS.filter((key) => optionWords[key] > 12);
  if (longOptions.length) {
    warnings.push(`Question ${questionNumber} has paragraph-like option length in ${longOptions.join(", ")}; options should be answer-shaped terms, values, formulas, code fragments, or brief outcomes.`);
  }
  if (OPTION_KEYS.some((key) => /[.!?].*[.!?]/.test(item.options?.[key] ?? ""))) {
    warnings.push(`Question ${questionNumber} contains a multi-sentence option; keep each option to one compact answer choice.`);
  }
  if (questionWords > 30 || Math.max(...OPTION_KEYS.map((key) => optionWords[key])) > 9) {
    warnings.push(`Question ${questionNumber} should receive rendered table-fit review because its wrapped height may exceed the most compact supplied-paper rows.`);
  }

  return { questionWords, optionWords, warnings };
}

export function collectMcqLayoutWarnings(mcqs: McqLayoutItem[]) {
  return mcqs.flatMap((item, index) => diagnoseMcqLayout(item, index + 1).warnings);
}

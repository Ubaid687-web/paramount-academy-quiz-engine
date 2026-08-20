import { z } from "zod";

export const assessmentModeSchema = z.enum(["mcq", "short", "long", "full_paper"]);
export type AssessmentMode = z.infer<typeof assessmentModeSchema>;

export const assessmentDraftStatusSchema = z.enum(["draft", "in_review", "published", "archived"]);
export type AssessmentDraftStatus = z.infer<typeof assessmentDraftStatusSchema>;

const sourceGroundingSchema = z.object({
  sourceReference: z.string().trim().min(1, "A source reference is required."),
  sourceExcerpt: z.string().trim().min(8, "A supporting textbook excerpt is required.").optional(),
  learningObjective: z.string().trim().min(1, "A learning objective is required."),
  conceptKey: z.string().trim().min(2, "A source-derived concept key is required.").optional(),
  facetKey: z.string().trim().min(2, "An assessable facet key is required.").optional(),
  answerTarget: z.string().trim().min(2, "An answer target is required.").optional(),
  cognitiveLevel: z.enum(["K", "U", "A"]).default("U"),
  orGroup: z.number().int().positive().nullable().default(null),
  marks: z.number().int().positive("Marks must be a positive whole number."),
});

const diagramSpecSchema = z.object({
  kind: z.enum(["labelled_flow", "labelled_graph", "labelled_block"]),
  title: z.string().trim().min(2),
  labels: z.array(z.string().trim().min(1)).min(2).max(6),
});

export const mcqDraftItemSchema = sourceGroundingSchema.extend({
  kind: z.literal("mcq"),
  question: z.string().trim().min(1, "Question text is required."),
  options: z.object({
    A: z.string().trim().min(1),
    B: z.string().trim().min(1),
    C: z.string().trim().min(1),
    D: z.string().trim().min(1),
  }).superRefine((options, ctx) => {
    const normalised = Object.values(options).map((option) => option.toLowerCase().replace(/\s+/g, " ").trim());
    if (new Set(normalised).size !== 4) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "MCQ options must be distinct." });
    }
  }),
  answer: z.enum(["A", "B", "C", "D"]),
  explanation: z.string().trim().min(1, "An explanation is required."),
  difficulty: z.enum(["easy", "medium", "hard"]),
});

export const shortDraftItemSchema = sourceGroundingSchema.extend({
  kind: z.literal("short"),
  question: z.string().trim().min(1, "Question text is required."),
  expectedAnswer: z.string().trim().min(1, "An expected answer is required."),
  markingGuide: z.array(z.string().trim().min(1)).min(1, "At least one marking point is required."),
  solutionPoints: z.array(z.string().trim().min(1)).min(1, "At least one solution point is required.").optional(),
  diagramSpec: diagramSpecSchema.optional(),
  difficulty: z.enum(["easy", "medium", "hard"]),
});

export const longDraftItemSchema = sourceGroundingSchema.extend({
  kind: z.literal("long"),
  question: z.string().trim().min(1, "Question text is required."),
  expectedKeyPoints: z.array(z.string().trim().min(1)).min(1, "At least one expected key point is required."),
  markingRubric: z.array(z.object({
    criterion: z.string().trim().min(1),
    marks: z.number().int().positive(),
  })).min(1, "At least one marking-rubric criterion is required."),
  solutionPoints: z.array(z.string().trim().min(1)).min(1, "At least one solution point is required.").optional(),
  diagramSpec: diagramSpecSchema.optional(),
  difficulty: z.enum(["easy", "medium", "hard"]),
}).superRefine((item, ctx) => {
  const rubricTotal = item.markingRubric.reduce((total, criterion) => total + criterion.marks, 0);
  if (rubricTotal !== item.marks) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Long-question rubric marks must equal the item marks." });
  }
});

export const assessmentDraftItemSchema = z.discriminatedUnion("kind", [
  mcqDraftItemSchema,
  shortDraftItemSchema,
  longDraftItemSchema,
]);
export type AssessmentDraftItem = z.infer<typeof assessmentDraftItemSchema>;

export const assessmentSectionSchema = z.object({
  label: z.string().trim().min(1, "A section label is required."),
  instructions: z.string().trim().min(1, "Section instructions are required."),
  items: z.array(assessmentDraftItemSchema).min(1, "A section must contain at least one item."),
});

export const fullPaperDraftSchema = z.object({
  mode: z.literal("full_paper"),
  title: z.string().trim().min(1),
  estimatedDurationMinutes: z.number().int().positive().nullable(),
  patternReferences: z.array(z.string().trim().min(1)).min(1, "A full paper requires at least one paper-pattern reference."),
  sections: z.array(assessmentSectionSchema).min(1, "A full paper requires at least one section."),
  totalMarks: z.number().int().positive(),
}).superRefine((paper, ctx) => {
  const itemMarks = paper.sections.flatMap((section) => section.items).reduce((total, item) => total + item.marks, 0);
  if (itemMarks !== paper.totalMarks) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Full-paper total marks must equal the sum of all item marks." });
  }
});

export const modeDraftPayloadSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("mcq"),
    title: z.string().trim().min(1),
    estimatedDurationMinutes: z.number().int().positive().nullable(),
    items: z.array(mcqDraftItemSchema).min(1),
  }),
  z.object({
    mode: z.literal("short"),
    title: z.string().trim().min(1),
    estimatedDurationMinutes: z.number().int().positive().nullable(),
    items: z.array(shortDraftItemSchema).min(1),
  }),
  z.object({
    mode: z.literal("long"),
    title: z.string().trim().min(1),
    estimatedDurationMinutes: z.number().int().positive().nullable(),
    items: z.array(longDraftItemSchema).min(1),
  }),
  fullPaperDraftSchema,
]);
export type ModeDraftPayload = z.infer<typeof modeDraftPayloadSchema>;

export function totalMarksForPayload(payload: ModeDraftPayload) {
  if (payload.mode === "full_paper") return payload.totalMarks;
  return payload.items.reduce((total, item) => total + item.marks, 0);
}

export function validateAssessmentDraftPayload(payload: unknown, expectedMode?: AssessmentMode) {
  const parsed = modeDraftPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return { valid: false as const, issues: parsed.error.issues.map((issue) => issue.message) };
  }
  if (expectedMode && parsed.data.mode !== expectedMode) {
    return { valid: false as const, issues: [`Draft mode must be ${expectedMode}.`] };
  }
  return { valid: true as const, payload: parsed.data, totalMarks: totalMarksForPayload(parsed.data) };
}

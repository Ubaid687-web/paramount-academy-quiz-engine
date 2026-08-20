import { z } from "zod";
import { createHash, randomUUID } from "node:crypto";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { ENV } from "./_core/env";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, publicProcedure, protectedProcedure, router, teacherProcedure } from "./_core/trpc";
import { buildSharedStyleAnchor, type ReviewedPaperPatternGuidance } from "./styleAnchor";
import type { ProviderTokenUsage } from "./generationProvider";
import type { GenerationSourceContext } from "./aiAgent";
import type { ModeDraftPayload } from "@shared/assessmentDraftContract";

function toViewerSafeQuiz<T extends { sourceContent?: unknown; scopeSnapshot?: unknown; generationMetadata?: unknown }>(quiz: T) {
  const { sourceContent: _sourceContent, scopeSnapshot: _scopeSnapshot, generationMetadata: _generationMetadata, ...safeQuiz } = quiz;
  return safeQuiz;
}

const programmeKeySchema = z.object({
  board: z.string().trim().min(2).max(50).default("FBISE"),
  grade: z.string().trim().min(1).max(20).default("10"),
  subject: z.string().trim().min(2).max(100),
});

const printableGenerationInputSchema = z.object({
  paperType: z.enum(["short", "long"]),
  title: z.string().trim().min(3).max(160),
  contentText: z.string().min(100, "Content must be at least 100 characters").optional(),
  pairCount: z.number().int().min(1).max(30),
  difficulty: z.enum(["balanced", "easy", "medium", "hard"]).default("balanced"),
  patternProgramme: programmeKeySchema.optional(),
  scope: z.object({
    board: z.string().trim().min(2).max(50).default("FBISE"),
    grade: z.string().trim().min(1).max(20),
    subject: z.string().trim().min(2).max(100),
    scopeType: z.enum(["single_chapter", "half_chapter", "multiple_chapters", "half_syllabus", "block"]),
    chapterIds: z.array(z.number().int().positive()).optional(),
    segmentIds: z.array(z.number().int().positive()).optional(),
    scopeTemplateId: z.number().int().positive().optional(),
  }).optional(),
});

type PrintableGenerationInput = z.infer<typeof printableGenerationInputSchema>;
type ProgressivePrintableProviderTelemetry = {
  providers: Array<"managed_llm" | "gemini_byok">;
  fallbackUsed: boolean;
  primaryFailureType: string | null;
  managedRetryAttempts: number;
  geminiRetryAttempts: number;
  usage?: ProviderTokenUsage;
};
type ProgressivePrintableState = {
  version: 1;
  input: Pick<PrintableGenerationInput, "paperType" | "title" | "pairCount" | "difficulty">;
  sourceContext: GenerationSourceContext;
  batchPlan: number[];
  completedItems: Array<Record<string, unknown>>;
  providerTelemetry: ProgressivePrintableProviderTelemetry;
  final?: { payload: ModeDraftPayload; assessmentDraftId?: number; cacheReused: boolean };
};

function emptyProgressivePrintableTelemetry(): ProgressivePrintableProviderTelemetry {
  return { providers: [], fallbackUsed: false, primaryFailureType: null, managedRetryAttempts: 0, geminiRetryAttempts: 0 };
}

function addProgressiveProviderUsage(left: ProviderTokenUsage | undefined, right: ProviderTokenUsage | undefined): ProviderTokenUsage | undefined {
  if (!right) return left;
  const add = (first: number | null | undefined, second: number | null) => first === null || first === undefined ? second : second === null ? first : first + second;
  return {
    inputTokens: add(left?.inputTokens, right.inputTokens),
    outputTokens: add(left?.outputTokens, right.outputTokens),
    cachedTokens: add(left?.cachedTokens, right.cachedTokens),
    totalTokens: add(left?.totalTokens, right.totalTokens),
  };
}

function mergeProgressivePrintableTelemetry(
  current: ProgressivePrintableProviderTelemetry,
  next: { provider: "managed_llm" | "gemini_byok"; fallbackUsed: boolean; primaryFailureType: string | null; managedRetryAttempts: number; geminiRetryAttempts: number; usage?: ProviderTokenUsage },
): ProgressivePrintableProviderTelemetry {
  return {
    providers: current.providers.includes(next.provider) ? current.providers : [...current.providers, next.provider],
    fallbackUsed: current.fallbackUsed || next.fallbackUsed,
    primaryFailureType: current.primaryFailureType ?? next.primaryFailureType,
    managedRetryAttempts: current.managedRetryAttempts + next.managedRetryAttempts,
    geminiRetryAttempts: current.geminiRetryAttempts + next.geminiRetryAttempts,
    usage: addProgressiveProviderUsage(current.usage, next.usage),
  };
}

function resolveProgressivePrintableProvider(telemetry: ProgressivePrintableProviderTelemetry): "managed_llm" | "gemini_byok" | "mixed" {
  return telemetry.providers.length > 1 ? "mixed" : telemetry.providers[0] ?? "managed_llm";
}

async function buildStyleAnchorForProgramme(
  programme: { board: string; grade: string; subject: string },
  paperPatternGuidance: ReviewedPaperPatternGuidance[],
) {
  const { listApprovedStyleAnchorExamples } = await import("./db");
  const approvedExamples = await listApprovedStyleAnchorExamples(programme);
  return buildSharedStyleAnchor({ ...programme, paperPatternGuidance, approvedExamples });
}

async function resolvePrintableGenerationSource(userId: number, input: PrintableGenerationInput) {
  let contentText = input.contentText;
  let sourceContext: GenerationSourceContext | undefined;
  if (input.scope) {
    const { getActiveCurriculumScopeCatalog, listActiveAssessmentPatternSources, listReviewedAssessmentPatternGuidance, listPriorGeneratedQuestionHistory } = await import("./db");
    const { resolveCurriculumScope } = await import("./curriculumScope");
    const [catalog, paperPatternSources, paperPatternGuidance] = await Promise.all([
      getActiveCurriculumScopeCatalog(input.scope),
      listActiveAssessmentPatternSources(input.scope),
      listReviewedAssessmentPatternGuidance(input.scope),
    ]);
    if (!catalog) throw new Error("No active reviewed textbook source is available for the selected subject.");
    const styleAnchor = await buildStyleAnchorForProgramme(input.scope, paperPatternGuidance);
    const resolvedScope = resolveCurriculumScope(catalog, input.scope);
    const priorQuestionHistory = await listPriorGeneratedQuestionHistory({
      userId,
      curriculumSetId: catalog.curriculumSet.id,
      scopeSnapshot: resolvedScope.snapshot,
    });
    contentText = resolvedScope.sourceText;
    sourceContext = {
      sourceType: "curriculum_scope",
      sourceTitle: resolvedScope.displayLabel,
      styleAnchor,
      subject: catalog.curriculumSet.subject,
      classLevel: catalog.curriculumSet.grade,
      curriculumSetId: catalog.curriculumSet.id,
      scopeTemplateId: resolvedScope.scopeTemplateId,
      scopeType: resolvedScope.scopeType,
      selectedChapterIds: resolvedScope.chapterIds,
      selectedSegmentIds: resolvedScope.segmentIds,
      scopeSnapshot: resolvedScope.snapshot,
      paperPatternGuidance: paperPatternGuidance.length ? paperPatternGuidance : paperPatternSources.map((source) => ({ sourceKind: source.sourceKind, academicYear: source.academicYear })),
      priorQuestionHistory,
    };
  } else if (input.patternProgramme) {
    const { listActiveAssessmentPatternSources, listReviewedAssessmentPatternGuidance, listPriorGeneratedQuestionHistory } = await import("./db");
    const [paperSources, paperPatternGuidance, priorQuestionHistory] = await Promise.all([
      listActiveAssessmentPatternSources(input.patternProgramme),
      listReviewedAssessmentPatternGuidance(input.patternProgramme),
      listPriorGeneratedQuestionHistory({ userId, contentText: input.contentText }),
    ]);
    const styleAnchor = await buildStyleAnchorForProgramme(input.patternProgramme, paperPatternGuidance);
    sourceContext = {
      sourceType: "raw_text",
      sourceTitle: "Teacher-provided custom source",
      styleAnchor,
      subject: input.patternProgramme.subject,
      classLevel: input.patternProgramme.grade,
      paperPatternGuidance: paperPatternGuidance.length ? paperPatternGuidance : paperSources.map((source) => ({ sourceKind: source.sourceKind, academicYear: source.academicYear })),
      priorQuestionHistory,
    };
  }
  if (!contentText || !sourceContext) throw new Error("Upload or paste at least 100 characters of material, or choose a reviewed curriculum scope.");
  return { contentText, sourceContext };
}

async function createProgressivePrintableAssessmentDraft(userId: number, state: ProgressivePrintableState, payload: ModeDraftPayload) {
  if (state.sourceContext.sourceType !== "curriculum_scope" || !state.sourceContext.curriculumSetId || !state.sourceContext.scopeSnapshot) return undefined;
  if (payload.mode !== "short" && payload.mode !== "long") return undefined;
  const { createAssessmentDraft } = await import("./db");
  const attemptedMarks = new Map<number, number>();
  payload.items.forEach((item) => {
    const group = Number(item.orGroup ?? 0);
    if (group > 0 && !attemptedMarks.has(group)) attemptedMarks.set(group, item.marks);
  });
  const draft = await createAssessmentDraft({
    title: payload.title,
    assessmentMode: payload.mode,
    sourceState: "ready",
    curriculumSetId: state.sourceContext.curriculumSetId,
    scopeSnapshot: JSON.stringify(state.sourceContext.scopeSnapshot),
    paperPatternReferences: state.sourceContext.paperPatternGuidance?.length ? JSON.stringify(state.sourceContext.paperPatternGuidance) : undefined,
    draftPayload: JSON.stringify(payload),
    totalMarks: Array.from(attemptedMarks.values()).reduce((total, marks) => total + marks, 0),
    estimatedDurationMinutes: payload.estimatedDurationMinutes,
    status: "draft",
    reviewWarnings: JSON.stringify([
      "Generated draft: review is required before publication or issue.",
      "Concept keys are retained to prevent later papers from repeating this scope's underlying topics.",
    ]),
    createdBy: userId,
  });
  return draft.id;
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  staff: router({
    listRoleDirectory: adminProcedure.query(async () => {
      const { listStaffRoleDirectory } = await import("./db");
      return listStaffRoleDirectory();
    }),
    listTeacherProvisionRules: adminProcedure.query(async () => {
      const { listTeacherProvisionRules } = await import("./db");
      return listTeacherProvisionRules();
    }),
    approveTeacherEmail: adminProcedure
      .input(z.object({ email: z.string().trim().email().max(320) }))
      .mutation(async ({ ctx, input }) => {
        const { createTeacherProvisionRule } = await import("./db");
        const rule = await createTeacherProvisionRule(input.email, ctx.user.id);
        return { success: true, rule };
      }),
    removeTeacherEmailApproval: adminProcedure
      .input(z.object({ ruleId: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        const { removeTeacherProvisionRule } = await import("./db");
        await removeTeacherProvisionRule(input.ruleId);
        return { success: true };
      }),
    updateRole: adminProcedure
      .input(z.object({ userId: z.number().int().positive(), role: z.enum(["teacher", "admin"]) }))
      .mutation(async ({ ctx, input }) => {
        if (input.userId === ctx.user.id) throw new Error("You cannot change your own Portal Admin role.");
        const { getStaffMemberById, updateStaffRole } = await import("./db");
        const staffMember = await getStaffMemberById(input.userId);
        if (!staffMember) throw new Error("Staff account not found.");
        if (staffMember.openId === ENV.ownerOpenId) throw new Error("The project owner's Portal Admin role cannot be changed here.");
        await updateStaffRole(input.userId, input.role);
        return { success: true };
      }),
  }),

  generation: router({
    getProviderSettings: adminProcedure.query(async () => {
      const { getGenerationProviderSettings } = await import("./db");
      const settings = await getGenerationProviderSettings();
      return { ...settings, geminiCredentialConfigured: Boolean(ENV.geminiApiKey) };
    }),
    setGeminiFallbackEnabled: adminProcedure
      .input(z.object({ enabled: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        const { setGeminiFallbackEnabled } = await import("./db");
        return setGeminiFallbackEnabled(input.enabled, ctx.user.id);
      }),
    listHistory: adminProcedure
      .input(z.object({ limit: z.number().int().min(1).max(100).default(30) }).optional())
      .query(async ({ input }) => {
        const { listAdminGenerationHistory } = await import("./db");
        return listAdminGenerationHistory(input?.limit ?? 30);
      }),
    getStyleAnchor: adminProcedure
      .input(z.object({ programme: programmeKeySchema }))
      .query(async ({ input }) => {
        const { listApprovedStyleAnchorExamples, listEligibleStyleAnchorQuestions, listReviewedAssessmentPatternGuidance } = await import("./db");
        const [paperPatternGuidance, approvedExamples, eligibleExamples] = await Promise.all([
          listReviewedAssessmentPatternGuidance(input.programme),
          listApprovedStyleAnchorExamples(input.programme),
          listEligibleStyleAnchorQuestions(input.programme),
        ]);
        const anchor = buildSharedStyleAnchor({ ...input.programme, paperPatternGuidance, approvedExamples });
        return { anchor: { fingerprint: anchor.fingerprint, approvedExampleCount: anchor.approvedExampleCount, hasReviewedPatternRules: paperPatternGuidance.length > 0 }, approvedExamples, eligibleExamples };
      }),
    approveStyleAnchorExample: adminProcedure
      .input(z.object({ programme: programmeKeySchema, questionId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const { approveStyleAnchorExample } = await import("./db");
        return approveStyleAnchorExample(input.programme, input.questionId, ctx.user.id);
      }),
    removeStyleAnchorExample: adminProcedure
      .input(z.object({ programme: programmeKeySchema, questionId: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        const { removeStyleAnchorExample } = await import("./db");
        return removeStyleAnchorExample(input.programme, input.questionId);
      }),
  }),

  quiz: router({
    getAll: protectedProcedure.query(async ({ ctx }) => {
      const { getQuizzesVisibleToUser } = await import("./db");
      const quizzes = await getQuizzesVisibleToUser(ctx.user.id, ctx.user.role === "admin");
      return quizzes.map(toViewerSafeQuiz);
    }),

    getById: protectedProcedure
      .input(z.object({ quizId: z.number() }))
      .query(async ({ ctx, input }) => {
        const { getQuizVisibleToUser } = await import("./db");
        const quiz = await getQuizVisibleToUser(input.quizId, ctx.user.id, ctx.user.role === "admin");
        return quiz ? toViewerSafeQuiz(quiz) : undefined;
      }),

    getQuestions: protectedProcedure
      .input(z.object({ quizId: z.number(), shuffle: z.boolean().default(false) }))
      .query(async ({ ctx, input }) => {
        const { getQuizVisibleToUser } = await import("./db");
        const quiz = await getQuizVisibleToUser(input.quizId, ctx.user.id, ctx.user.role === "admin");
        if (!quiz) throw new Error("Quiz not found or unavailable.");
        const { getPracticeQuestionsByQuizId } = await import("./db");
        return getPracticeQuestionsByQuizId(input.quizId, input.shuffle);
      }),

    checkAnswer: protectedProcedure
      .input(z.object({
        quizId: z.number().int().positive(),
        questionId: z.number().int().positive(),
        selectedAnswer: z.enum(["A", "B", "C", "D"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const { getQuizVisibleToUser } = await import("./db");
        const quiz = await getQuizVisibleToUser(input.quizId, ctx.user.id, ctx.user.role === "admin");
        if (!quiz) throw new Error("Quiz not found or unavailable.");
        const { getQuestionForQuiz } = await import("./db");
        const question = await getQuestionForQuiz(input.quizId, input.questionId);
        if (!question) throw new Error("This question does not belong to the selected quiz.");
        return { isCorrect: question.correctAnswer === input.selectedAnswer ? 1 : 0 };
      }),

    submitAttempt: protectedProcedure
      .input(
        z.object({
          quizId: z.number().int().positive(),
          answers: z.array(
            z.object({
              questionId: z.number().int().positive(),
              selectedAnswer: z.enum(["A", "B", "C", "D"]),
            })
          ).min(1),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { createQuizAttempt, getQuestionsByQuizId, getQuizVisibleToUser, saveUserAnswers } = await import("./db");
        const quiz = await getQuizVisibleToUser(input.quizId, ctx.user.id, ctx.user.role === "admin");
        if (!quiz) throw new Error("Quiz not found or unavailable.");
        const questions = await getQuestionsByQuizId(input.quizId);
        if (!questions.length) throw new Error("The selected quiz has no available questions.");
        const answersByQuestion = new Map(input.answers.map((answer) => [answer.questionId, answer]));
        if (answersByQuestion.size !== questions.length || input.answers.length !== questions.length || questions.some((question) => !answersByQuestion.has(question.id))) {
          throw new Error("Submit one answer for every question in the selected quiz.");
        }
        const scoredAnswers = questions.map((question) => {
          const submitted = answersByQuestion.get(question.id)!;
          return {
            questionId: question.id,
            selectedAnswer: submitted.selectedAnswer,
            isCorrect: submitted.selectedAnswer === question.correctAnswer ? 1 : 0,
          };
        });
        const score = scoredAnswers.filter((answer) => answer.isCorrect === 1).length;
        const totalQuestions = questions.length;
        const percentage = Math.round((score / totalQuestions) * 100);

        const attemptId = await createQuizAttempt({
          userId: ctx.user.id,
          quizId: input.quizId,
          score,
          totalQuestions,
          percentage,
          startedAt: new Date(),
          completedAt: new Date(),
        });

        const userAnswersData = scoredAnswers.map((answer) => ({
          attemptId,
          questionId: answer.questionId,
          selectedAnswer: answer.selectedAnswer,
          isCorrect: answer.isCorrect,
        }));

        await saveUserAnswers(userAnswersData);

        return { attemptId, score, percentage };
      }),

    getAttemptResults: protectedProcedure
      .input(z.object({ attemptId: z.number() }))
      .query(async ({ ctx, input }) => {
        const { getAttemptWithAnswersForUser } = await import("./db");
        return getAttemptWithAnswersForUser(input.attemptId, ctx.user.id);
      }),

    getAttemptHistory: protectedProcedure.query(async ({ ctx }) => {
      const { getUserAttemptHistory } = await import("./db");
      return getUserAttemptHistory(ctx.user.id);
    }),

    deleteQuiz: protectedProcedure
      .input(z.object({ quizId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { deleteQuizAndRelated } = await import("./db");
        return deleteQuizAndRelated(input.quizId, ctx.user.id, ctx.user.role === "admin");
      }),
  }),

  pdfUpload: router({
    extractPdfText: protectedProcedure
      .input(z.object({
        fileBuffer: z.string().min(4).max(40_000_000), // Base64 encoded PDF, capped before decoding.
        fileName: z.string().min(1).max(255),
      }))
      .mutation(async ({ input }) => {
        const { extractTextFromPdf } = await import("./pdfProcessor");
        const buffer = Buffer.from(input.fileBuffer, 'base64');
        if (!buffer.length || buffer.length > 30 * 1024 * 1024) throw new Error("PDF upload must be between 1 byte and 30MB.");
        return extractTextFromPdf(buffer, input.fileName);
      }),
  }),

  curriculum: router({
    listProgrammes: adminProcedure.query(async () => {
      const { listProgrammeCatalogues } = await import("./db");
      return listProgrammeCatalogues();
    }),

    listReadyProgrammes: publicProcedure.query(async () => {
      const { listReadyProgrammes } = await import("./db");
      return listReadyProgrammes();
    }),

    createProgramme: adminProcedure
      .input(programmeKeySchema.extend({ teacherLabel: z.string().trim().min(2).max(255) }))
      .mutation(async ({ ctx, input }) => {
        const { createProgrammeCatalogue } = await import("./db");
        return createProgrammeCatalogue({ ...input, createdBy: ctx.user.id });
      }),

    activateProgramme: adminProcedure
      .input(z.object({ programmeId: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        const { activateProgrammeCatalogue } = await import("./db");
        return activateProgrammeCatalogue(input.programmeId);
      }),

    listSets: adminProcedure.query(async () => {
      const { listCurriculumSets } = await import("./db");
      return listCurriculumSets();
    }),

    getManagementDetails: adminProcedure
      .input(z.object({ curriculumSetId: z.number().int().positive() }))
      .query(async ({ input }) => {
        const { getCurriculumSet, listCurriculumSources, listCurriculumChapters, listChapterSegments, listScopeTemplates, listAssessmentPatternSources, listAssessmentPatternProfilesBySourceIds, listCurriculumSetPageReviews, listOcrExtractionJobsForSources } = await import("./db");
        const curriculumSet = await getCurriculumSet(input.curriculumSetId);
        if (!curriculumSet) throw new Error("Curriculum set not found");
        const chapters = await listCurriculumChapters(input.curriculumSetId);
        const sources = await listCurriculumSources(input.curriculumSetId);
        const sourcePageReviews = await listCurriculumSetPageReviews(input.curriculumSetId);
        const ocrJobs = await listOcrExtractionJobsForSources(sources.map((source) => source.id));
        const paperPatternSources = await listAssessmentPatternSources({ board: curriculumSet.board, grade: curriculumSet.grade, subject: curriculumSet.subject });
        const paperPatternProfiles = await listAssessmentPatternProfilesBySourceIds(paperPatternSources.map((source) => source.id));
        const chapterSegments = await Promise.all(chapters.map(async (chapter) => ({
          chapterId: chapter.id,
          segments: await listChapterSegments(chapter.id),
        })));
        return {
          curriculumSet,
          sources,
          sourcePageReviews,
          ocrJobs,
          paperPatternSources,
          paperPatternProfiles,
          chapters,
          chapterSegments,
          scopeTemplates: await listScopeTemplates(input.curriculumSetId),
          readiness: {
            sourceStored: sources.length > 0,
            sourceExtracted: sources.some((source) => source.extractionStatus === "extracted" && Boolean(source.extractedText?.trim())),
            reviewedActiveChapters: chapters.filter((chapter) => chapter.isActive === 1).length,
            weakOcrPages: sourcePageReviews.filter((page) => page.reviewStatus === "needs_review").length,
            ocrReviewComplete: !sourcePageReviews.some((page) => page.reviewStatus === "needs_review"),
            patternSourcesExtracted: paperPatternSources.filter((source) => source.extractionStatus === "extracted").length,
            patternProfilesReviewed: paperPatternProfiles.filter((profile) => profile.reviewStatus === "reviewed").length,
          },
        };
      }),

    createSet: adminProcedure
      .input(z.object({
        programmeId: z.number().int().positive(),
        label: z.string().min(3).max(255),
        editionLabel: z.string().max(255).optional(),
        replacesSetId: z.number().int().positive().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { createCurriculumSet, getProgrammeCatalogue } = await import("./db");
        const programme = await getProgrammeCatalogue(input.programmeId);
        if (!programme) throw new Error("Select a Programme Catalogue entry before creating its curriculum edition.");
        return createCurriculumSet({
          board: programme.board,
          grade: programme.grade,
          subject: programme.subject,
          label: input.label,
          editionLabel: input.editionLabel || null,
          replacesSetId: input.replacesSetId,
          createdBy: ctx.user.id,
          status: "draft",
        });
      }),

    replaceActiveSet: adminProcedure
      .input(z.object({
        currentSetId: z.number().int().positive(),
        label: z.string().min(3).max(255),
        editionLabel: z.string().max(255).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { createReplacementCurriculumSet } = await import("./db");
        return createReplacementCurriculumSet(input.currentSetId, {
          label: input.label,
          editionLabel: input.editionLabel || null,
          createdBy: ctx.user.id,
        });
      }),

    ingestSource: adminProcedure
      .input(z.object({
        curriculumSetId: z.number().int().positive(),
        fileName: z.string().min(1).max(255),
        mimeType: z.enum(["application/pdf", "text/plain", "image/jpeg", "image/png", "image/webp"]),
        fileBuffer: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const { getCurriculumSet, createCurriculumSource, createOcrExtractionJob, replaceCurriculumSourcePageReviews } = await import("./db");
        const { extractCurriculumSourceText } = await import("./curriculumIngestion");
        const { assessExtractedSourceQuality } = await import("./ocrQuality");
        const { storagePut } = await import("./storage");
        const curriculumSet = await getCurriculumSet(input.curriculumSetId);
        if (!curriculumSet) throw new Error("Curriculum set not found");

        const fileBuffer = Buffer.from(input.fileBuffer, "base64");
        if (!fileBuffer.length || fileBuffer.length > 30 * 1024 * 1024) {
          throw new Error("Curriculum source must be between 1 byte and 30MB.");
        }
        const extracted = await extractCurriculumSourceText({ fileBuffer, fileName: input.fileName, mimeType: input.mimeType });
        const extension = input.mimeType === "application/pdf" ? "pdf" : input.mimeType === "text/plain" ? "txt" : input.mimeType === "image/png" ? "png" : input.mimeType === "image/webp" ? "webp" : "jpg";
        const stored = await storagePut(
          `curricula/${input.curriculumSetId}/${randomUUID()}.${extension}`,
          fileBuffer,
          input.mimeType,
        );
        const source = await createCurriculumSource({
          curriculumSetId: input.curriculumSetId,
          storageKey: stored.key,
          storageUrl: stored.url,
          originalFileName: input.fileName,
          mimeType: input.mimeType,
          contentHash: createHash("sha256").update(fileBuffer).digest("hex"),
          extractionStatus: extracted.mode === "ocr_required" ? "pending" : "extracted",
          pageCount: extracted.pageCount,
          extractedText: extracted.text,
          uploadedBy: ctx.user.id,
          extractedAt: extracted.mode === "native_text" ? new Date() : null,
        });
        if (extracted.mode === "ocr_required") {
          await createOcrExtractionJob({ sourceId: source.id, totalPages: extracted.pageCount ?? 1 });
          const { ensureOcrScheduler } = await import("./ocrScheduler");
          await ensureOcrScheduler(ctx.req.headers.cookie);
        } else {
          await replaceCurriculumSourcePageReviews(source.id, assessExtractedSourceQuality(extracted.pages));
        }
        return source;
      }),

    proposeChaptersFromSource: adminProcedure
      .input(z.object({ curriculumSetId: z.number().int().positive(), sourceId: z.number().int().positive() }))
      .query(async ({ input }) => {
        const { getCurriculumSet, getCurriculumSource } = await import("./db");
        const { proposeChaptersFromExtractedText } = await import("./chapterProposal");
        const [curriculumSet, source] = await Promise.all([
          getCurriculumSet(input.curriculumSetId),
          getCurriculumSource(input.sourceId),
        ]);
        if (!curriculumSet || !source || source.curriculumSetId !== input.curriculumSetId) {
          throw new Error("The selected textbook source does not belong to this draft edition.");
        }
        if (source.extractionStatus !== "extracted" || !source.extractedText?.trim()) {
          throw new Error("Extract the uploaded textbook PDF before proposing chapter boundaries.");
        }
        return {
          sourceId: source.id,
          originalFileName: source.originalFileName,
          proposals: proposeChaptersFromExtractedText(source.extractedText),
        };
      }),

    ingestPaperPatternSource: adminProcedure
      .input(z.object({
        programmeId: z.number().int().positive(),
        sourceKind: z.enum(["model_paper", "past_paper"]),
        academicYear: z.string().min(4).max(20).optional(),
        fileName: z.string().min(1).max(255),
        mimeType: z.enum(["application/pdf", "text/plain"]),
        fileBuffer: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const { createAssessmentPatternSource, getProgrammeCatalogue } = await import("./db");
        const { extractCurriculumSourceText } = await import("./curriculumIngestion");
        const { storagePut } = await import("./storage");
        const fileBuffer = Buffer.from(input.fileBuffer, "base64");
        if (!fileBuffer.length || fileBuffer.length > 30 * 1024 * 1024) throw new Error("Paper-pattern source must be between 1 byte and 30MB.");
        const programme = await getProgrammeCatalogue(input.programmeId);
        if (!programme) throw new Error("Select a Programme Catalogue entry before uploading its paper-pattern source.");
        const extracted = await extractCurriculumSourceText({ fileBuffer, fileName: input.fileName, mimeType: input.mimeType });
        const extension = input.mimeType === "application/pdf" ? "pdf" : "txt";
        const safeBoard = programme.board.replace(/[^a-z0-9_-]+/gi, "-").toLowerCase();
        const safeGrade = programme.grade.replace(/[^a-z0-9_-]+/gi, "-").toLowerCase();
        const safeSubject = programme.subject.replace(/[^a-z0-9_-]+/gi, "-").toLowerCase();
        const stored = await storagePut(`paper-patterns/${safeBoard}/${safeGrade}/${safeSubject}/${randomUUID()}.${extension}`, fileBuffer, input.mimeType);
        return createAssessmentPatternSource({
          board: programme.board,
          grade: programme.grade,
          subject: programme.subject,
          sourceKind: input.sourceKind,
          academicYear: input.academicYear || null,
          storageKey: stored.key,
          storageUrl: stored.url,
          originalFileName: input.fileName,
          mimeType: input.mimeType,
          extractedText: extracted.text,
          extractionStatus: "extracted",
          status: "draft",
          uploadedBy: ctx.user.id,
        });
      }),

    activatePaperPatternSource: adminProcedure
      .input(z.object({ sourceId: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        const { activateAssessmentPatternSource } = await import("./db");
        return activateAssessmentPatternSource(input.sourceId);
      }),

    savePaperPatternProfile: adminProcedure
      .input(z.object({
        patternSourceId: z.number().int().positive(),
        sectionAInstruction: z.string().max(2000).optional(),
        sectionBInstruction: z.string().max(2000).optional(),
        sectionCInstruction: z.string().max(2000).optional(),
        mcqCount: z.number().int().min(0).max(100).optional(),
        mcqMarksEach: z.number().int().min(0).max(100).optional(),
        shortOrPairCount: z.number().int().min(0).max(100).optional(),
        shortMarksEach: z.number().int().min(0).max(100).optional(),
        longOrPairCount: z.number().int().min(0).max(100).optional(),
        longMarksEach: z.number().int().min(0).max(100).optional(),
        totalMarks: z.number().int().min(1).max(1000).optional(),
        durationMinutes: z.number().int().min(1).max(600).optional(),
        orRule: z.string().max(2000).optional(),
        profileEvidenceNotes: z.string().min(20).max(8000),
        reviewStatus: z.enum(["draft", "reviewed", "needs_revision"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const { getAssessmentPatternSource, saveAssessmentPatternProfile } = await import("./db");
        const source = await getAssessmentPatternSource(input.patternSourceId);
        if (!source) throw new Error("Paper-pattern source not found.");
        if (source.extractionStatus !== "extracted" || !source.extractedText?.trim()) {
          throw new Error("Extract the supplied paper before saving its pattern profile.");
        }
        return saveAssessmentPatternProfile({
          ...input,
          sectionAInstruction: input.sectionAInstruction || null,
          sectionBInstruction: input.sectionBInstruction || null,
          sectionCInstruction: input.sectionCInstruction || null,
          mcqCount: input.mcqCount ?? null,
          mcqMarksEach: input.mcqMarksEach ?? null,
          shortOrPairCount: input.shortOrPairCount ?? null,
          shortMarksEach: input.shortMarksEach ?? null,
          longOrPairCount: input.longOrPairCount ?? null,
          longMarksEach: input.longMarksEach ?? null,
          totalMarks: input.totalMarks ?? null,
          durationMinutes: input.durationMinutes ?? null,
          orRule: input.orRule || null,
          reviewedBy: input.reviewStatus === "reviewed" ? ctx.user.id : null,
          reviewedAt: input.reviewStatus === "reviewed" ? new Date() : null,
        });
      }),

    createChapter: adminProcedure
      .input(z.object({
        curriculumSetId: z.number().int().positive(),
        sourceId: z.number().int().positive(),
        sequence: z.number().int().positive(),
        code: z.string().max(50).optional(),
        title: z.string().min(2).max(255),
        blockKey: z.string().max(100).optional(),
        partKey: z.string().max(100).optional(),
        startPage: z.number().int().positive().optional(),
        endPage: z.number().int().positive().optional(),
        contentText: z.string().min(100),
      }))
      .mutation(async ({ input }) => {
        const { getCurriculumSet, getCurriculumSource, createCurriculumChapter } = await import("./db");
        const curriculumSet = await getCurriculumSet(input.curriculumSetId);
        const source = await getCurriculumSource(input.sourceId);
        if (!curriculumSet || !source || source.curriculumSetId !== input.curriculumSetId) {
          throw new Error("The selected chapter source does not belong to this curriculum set.");
        }
        if (input.endPage && input.startPage && input.endPage < input.startPage) {
          throw new Error("The chapter end page cannot be before its start page.");
        }
        return createCurriculumChapter({
          curriculumSetId: input.curriculumSetId,
          sourceId: input.sourceId,
          sequence: input.sequence,
          code: input.code || null,
          title: input.title,
          blockKey: input.blockKey || null,
          partKey: input.partKey || null,
          startPage: input.startPage,
          endPage: input.endPage,
          contentText: input.contentText,
          isActive: 1,
        });
      }),

    saveHalfChapterSegments: adminProcedure
      .input(z.object({
        chapterId: z.number().int().positive(),
        firstHalf: z.object({ label: z.string().min(1).max(100), contentText: z.string().min(100), startPage: z.number().int().positive().optional(), endPage: z.number().int().positive().optional() }),
        secondHalf: z.object({ label: z.string().min(1).max(100), contentText: z.string().min(100), startPage: z.number().int().positive().optional(), endPage: z.number().int().positive().optional() }),
      }))
      .mutation(async ({ input }) => {
        const { replaceChapterSegments } = await import("./db");
        return replaceChapterSegments(input.chapterId, [
          { sequence: 1, label: input.firstHalf.label, contentText: input.firstHalf.contentText, startPage: input.firstHalf.startPage, endPage: input.firstHalf.endPage, startOffset: 0, endOffset: input.firstHalf.contentText.length },
          { sequence: 2, label: input.secondHalf.label, contentText: input.secondHalf.contentText, startPage: input.secondHalf.startPage, endPage: input.secondHalf.endPage, startOffset: 0, endOffset: input.secondHalf.contentText.length },
        ]);
      }),

    createScopeTemplate: adminProcedure
      .input(z.object({
        curriculumSetId: z.number().int().positive(),
        scopeKind: z.enum(["half_syllabus", "block"]),
        label: z.string().min(2).max(255),
        description: z.string().max(1000).optional(),
        chapterIds: z.array(z.number().int().positive()).min(1),
      }))
      .mutation(async ({ input }) => {
        const { listCurriculumChapters, createScopeTemplateWithChapters } = await import("./db");
        const chapters = await listCurriculumChapters(input.curriculumSetId);
        const permittedIds = new Set(chapters.filter((chapter) => chapter.isActive === 1).map((chapter) => chapter.id));
        if (input.chapterIds.some((chapterId) => !permittedIds.has(chapterId))) {
          throw new Error("Every scope template chapter must be an active chapter in the selected curriculum set.");
        }
        return createScopeTemplateWithChapters({
          curriculumSetId: input.curriculumSetId,
          scopeKind: input.scopeKind,
          label: input.label,
          description: input.description || null,
          isActive: 1,
        }, Array.from(new Set(input.chapterIds)));
      }),

    activateSet: adminProcedure
      .input(z.object({ curriculumSetId: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        const { activateCurriculumSet } = await import("./db");
        return activateCurriculumSet(input.curriculumSetId);
      }),

    reviewSourcePage: adminProcedure
      .input(z.object({ curriculumSetId: z.number().int().positive(), sourceId: z.number().int().positive(), pageNumber: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const { getCurriculumSource, markCurriculumSourcePageReviewed } = await import("./db");
        const source = await getCurriculumSource(input.sourceId);
        if (!source || source.curriculumSetId !== input.curriculumSetId) {
          throw new Error("The selected OCR page does not belong to this curriculum edition.");
        }
        const reviewed = await markCurriculumSourcePageReviewed(input.sourceId, input.pageNumber, ctx.user.id);
        if (!reviewed) throw new Error("The selected OCR page quality record was not found.");
        return reviewed;
      }),

    getOcrReviewPage: adminProcedure
      .input(z.object({ curriculumSetId: z.number().int().positive(), sourceId: z.number().int().positive(), pageNumber: z.number().int().positive() }))
      .query(async ({ input }) => {
        const { getCurriculumSource, listCurriculumSourcePageReviews } = await import("./db");
        const { parseOcrTranscript } = await import("./ocrPipeline");
        const source = await getCurriculumSource(input.sourceId);
        if (!source || source.curriculumSetId !== input.curriculumSetId) {
          throw new Error("The selected OCR page does not belong to this curriculum edition.");
        }
        const pageText = parseOcrTranscript(source.extractedText).find((page) => page.pageNumber === input.pageNumber)?.text;
        const pageReview = (await listCurriculumSourcePageReviews([source.id])).find((page) => page.pageNumber === input.pageNumber);
        if (!pageReview || pageText === undefined) throw new Error("The selected source page is not available for OCR review.");
        return {
          sourceId: source.id,
          sourceName: source.originalFileName,
          pageNumber: input.pageNumber,
          pageText,
          pageReview,
          previewUrl: `/api/ocr-review/source/${source.id}/page/${input.pageNumber}`,
        };
      }),

    correctOcrReviewPage: adminProcedure
      .input(z.object({ curriculumSetId: z.number().int().positive(), sourceId: z.number().int().positive(), pageNumber: z.number().int().positive(), correctedText: z.string().min(10).max(30_000) }))
      .mutation(async ({ ctx, input }) => {
        const { getCurriculumSource, saveCorrectedCurriculumSourcePage } = await import("./db");
        const { parseOcrTranscript, replaceOcrTranscriptPage } = await import("./ocrPipeline");
        const source = await getCurriculumSource(input.sourceId);
        if (!source || source.curriculumSetId !== input.curriculumSetId) {
          throw new Error("The selected OCR page does not belong to this curriculum edition.");
        }
        const priorPage = parseOcrTranscript(source.extractedText).find((page) => page.pageNumber === input.pageNumber);
        if (!priorPage) throw new Error("The selected OCR page is not available for correction.");
        const correctedText = input.correctedText.replace(/\u0000/g, "").replace(/\r\n/g, "\n").trim();
        const correctedTranscript = replaceOcrTranscriptPage(source.extractedText, input.pageNumber, correctedText);
        const saved = await saveCorrectedCurriculumSourcePage({
          sourceId: source.id,
          pageNumber: input.pageNumber,
          correctedTranscript,
          correctedText,
          reviewedBy: ctx.user.id,
        });
        return { ...saved, sourceId: source.id, pageNumber: input.pageNumber, automaticallyRestoredForGeneration: false };
      }),

    setChapterGenerationAvailability: adminProcedure
      .input(z.object({ curriculumSetId: z.number().int().positive(), chapterId: z.number().int().positive(), isActive: z.boolean() }))
      .mutation(async ({ input }) => {
        const { getCurriculumChapter, listCurriculumSourcePageReviews, setCurriculumChapterGenerationAvailability } = await import("./db");
        const chapter = await getCurriculumChapter(input.chapterId);
        if (!chapter || chapter.curriculumSetId !== input.curriculumSetId) {
          throw new Error("The selected chapter does not belong to this curriculum edition.");
        }
        if (input.isActive && chapter.startPage && chapter.endPage) {
          const unresolved = (await listCurriculumSourcePageReviews([chapter.sourceId])).find((page) => (
            page.reviewStatus === "needs_review"
            && page.pageNumber >= chapter.startPage!
            && page.pageNumber <= chapter.endPage!
          ));
          if (unresolved) {
            throw new Error(`Page ${unresolved.pageNumber} still needs OCR review before ${chapter.title} can be restored for generation.`);
          }
        }
        const updated = await setCurriculumChapterGenerationAvailability({
          curriculumSetId: input.curriculumSetId,
          chapterId: input.chapterId,
          isActive: input.isActive ? 1 : 0,
        });
        if (!updated) throw new Error("The chapter availability could not be updated.");
        return updated;
      }),

    getActiveScopeCatalog: publicProcedure
      .input(programmeKeySchema)
      .query(async ({ input }) => {
        const { getActiveCurriculumScopeCatalog } = await import("./db");
        const { analyzeContent } = await import("./contentAnalyzer");
        const catalog = await getActiveCurriculumScopeCatalog(input);
        if (!catalog) return null;

        // Keep this estimate deterministic and source-bound. It is a teacher-facing
        // warning signal, not a generation quota: generation still validates the
        // actual concept/facet/answer inventory on the server.
        const estimateTopicCount = (contentText: string) => {
          const analysis = analyzeContent(contentText);
          return Math.max(1, analysis.keyTopics.length, analysis.sections.length);
        };

        return {
          curriculumSet: catalog.curriculumSet,
          chapters: catalog.chapters.map((chapter) => ({
            id: chapter.id,
            sequence: chapter.sequence,
            code: chapter.code,
            title: chapter.title,
            blockKey: chapter.blockKey,
            partKey: chapter.partKey,
            startPage: chapter.startPage,
            endPage: chapter.endPage,
            estimatedTopicCount: estimateTopicCount(chapter.contentText),
          })),
          segments: catalog.segments.map((segment) => ({
            id: segment.id,
            chapterId: segment.chapterId,
            sequence: segment.sequence,
            label: segment.label,
            startPage: segment.startPage,
            endPage: segment.endPage,
            estimatedTopicCount: estimateTopicCount(segment.contentText),
          })),
          templates: catalog.templates.map((template) => ({
            id: template.id,
            scopeKind: template.scopeKind,
            label: template.label,
            description: template.description,
          })),
          templateMemberships: catalog.templateMemberships,
        };
      }),
  }),

  assessment: router({
    getAvailability: publicProcedure
      .input(programmeKeySchema)
      .query(async ({ input }) => {
        const { getActiveCurriculumScopeCatalog, listActiveAssessmentPatternSources } = await import("./db");
        const [catalog, paperSources] = await Promise.all([
          getActiveCurriculumScopeCatalog(input),
          listActiveAssessmentPatternSources(input),
        ]);
        const textbookReady = Boolean(catalog);
        const paperPatternReady = paperSources.length > 0;
        return {
          textbookReady,
          paperPatternReady,
          supportedModes: {
            mcq: textbookReady,
            short: textbookReady,
            long: textbookReady,
            full_paper: textbookReady && paperPatternReady,
          },
          paperSources: paperSources.map((source) => ({
            id: source.id,
            sourceKind: source.sourceKind,
            academicYear: source.academicYear,
            originalFileName: source.originalFileName,
          })),
        };
      }),

    saveDraft: teacherProcedure
      .input(z.object({
          assessmentMode: z.enum(["mcq", "short", "long", "full_paper"]),
          scope: z.object({
          board: z.string().trim().min(2).max(50).default("FBISE"),
          grade: z.string().trim().min(1).max(20).default("10"),
          subject: z.string().trim().min(2).max(100),
          scopeType: z.enum(["single_chapter", "half_chapter", "multiple_chapters", "half_syllabus", "block"]),
          chapterIds: z.array(z.number().int().positive()).optional(),
          segmentIds: z.array(z.number().int().positive()).optional(),
          scopeTemplateId: z.number().int().positive().optional(),
        }),
        paperPatternSourceIds: z.array(z.number().int().positive()).default([]),
        payload: z.unknown(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { getActiveCurriculumScopeCatalog, listAssessmentPatternSourcesByIds, createAssessmentDraft } = await import("./db");
        const { resolveCurriculumScope } = await import("./curriculumScope");
        const { validateAssessmentDraftPayload } = await import("@shared/assessmentDraftContract");

        const catalogueKey = { board: input.scope.board, grade: input.scope.grade, subject: input.scope.subject };
        const catalog = await getActiveCurriculumScopeCatalog(catalogueKey);
        if (!catalog) {
          throw new Error("No active reviewed textbook source is available for the selected subject.");
        }
        const resolvedScope = resolveCurriculumScope(catalog, input.scope);
        const validation = validateAssessmentDraftPayload(input.payload, input.assessmentMode);
        if (!validation.valid) {
          throw new Error(`Assessment draft failed validation: ${validation.issues.join(" ")}`);
        }

        const patternSources = await listAssessmentPatternSourcesByIds(catalogueKey, input.paperPatternSourceIds);
        if (input.assessmentMode === "full_paper") {
          if (!input.paperPatternSourceIds.length || patternSources.length !== input.paperPatternSourceIds.length) {
            throw new Error("A full-paper draft requires active, extracted paper-pattern sources supplied for the selected subject.");
          }
        }

        const reviewWarnings = [
          "Draft only: Portal Admin review is required before publication or assignment.",
          "Verify every item source reference against the approved textbook scope before approval.",
          ...(input.assessmentMode === "full_paper"
            ? ["Verify the full-paper structure against the attached approved paper-pattern sources before approval."]
            : ["No examination-pattern claim is made unless an approved paper source is attached during review."]),
        ];

        const draft = await createAssessmentDraft({
          title: validation.payload.title,
          assessmentMode: input.assessmentMode,
          sourceState: "ready",
          curriculumSetId: catalog.curriculumSet.id,
          scopeSnapshot: JSON.stringify(resolvedScope.snapshot),
          paperPatternReferences: patternSources.length
            ? JSON.stringify(patternSources.map((source) => ({
              id: source.id,
              sourceKind: source.sourceKind,
              academicYear: source.academicYear,
              originalFileName: source.originalFileName,
            })))
            : undefined,
          draftPayload: JSON.stringify(validation.payload),
          totalMarks: validation.totalMarks,
          estimatedDurationMinutes: validation.payload.estimatedDurationMinutes,
          status: "draft",
          reviewWarnings: JSON.stringify(reviewWarnings),
          createdBy: ctx.user.id,
        });

        return { success: true, assessmentDraftId: draft.id, reviewWarnings };
      }),

    getDraft: teacherProcedure
      .input(z.object({ assessmentDraftId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const { getAssessmentDraft } = await import("./db");
        const draft = await getAssessmentDraft(input.assessmentDraftId);
        if (!draft || draft.createdBy !== ctx.user.id) {
          throw new Error("Assessment draft not found or unauthorized");
        }
        return draft;
      }),

    reviseDraft: teacherProcedure
      .input(z.object({
        assessmentDraftId: z.number().int().positive(),
        payload: z.unknown(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { getAssessmentDraft, updateAssessmentDraft } = await import("./db");
        const { validateAssessmentDraftPayload } = await import("@shared/assessmentDraftContract");
        const existing = await getAssessmentDraft(input.assessmentDraftId);
        if (!existing || existing.createdBy !== ctx.user.id) {
          throw new Error("Assessment draft not found or unauthorized");
        }
        const validation = validateAssessmentDraftPayload(input.payload, existing.assessmentMode);
        if (!validation.valid) {
          throw new Error(`Assessment draft failed validation: ${validation.issues.join(" ")}`);
        }
        const reviewWarnings = [
          "Draft revised: Portal Admin review is required before publication or assignment.",
          "Verify every item source reference against the original approved source snapshot before approval.",
          ...(existing.assessmentMode === "full_paper" ? ["Verify the revised paper structure against the preserved approved paper-pattern references."] : []),
        ];
        const draft = await updateAssessmentDraft(existing.id, {
          title: validation.payload.title,
          draftPayload: JSON.stringify(validation.payload),
          totalMarks: validation.totalMarks,
          estimatedDurationMinutes: validation.payload.estimatedDurationMinutes,
          status: "in_review",
          reviewWarnings: JSON.stringify(reviewWarnings),
          reviewedBy: ctx.user.id,
          reviewedAt: new Date(),
        });
        return { success: true, assessmentDraftId: draft?.id, reviewWarnings };
      }),
  }),

  printablePaper: router({
    renderMcqPaper: teacherProcedure.input(z.object({ title: z.string().min(1), mcqs: z.array(z.object({ question: z.string().min(1), options: z.object({ A: z.string().min(1), B: z.string().min(1), C: z.string().min(1), D: z.string().min(1) }), answer: z.enum(["A", "B", "C", "D"]), explanation: z.string().min(1), sourceReference: z.string().min(1), learningObjective: z.string().min(1) })).min(1) })).mutation(async ({ input }) => {
      const { renderMcqPaperPdf } = await import("./printablePaperExport");
      const pdf = await renderMcqPaperPdf(input.title, input.mcqs);
      return { fileName: `${input.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-mcq-paper.pdf`, data: pdf.toString("base64") };
    }),
    renderMcqSolutionKey: teacherProcedure.input(z.object({ title: z.string().min(1), mcqs: z.array(z.object({ question: z.string().min(1), options: z.object({ A: z.string().min(1), B: z.string().min(1), C: z.string().min(1), D: z.string().min(1) }), answer: z.enum(["A", "B", "C", "D"]), explanation: z.string().min(1), sourceReference: z.string().min(1), learningObjective: z.string().min(1) })).min(1) })).mutation(async ({ input }) => {
      const { renderMcqSolutionPdf } = await import("./printablePaperExport");
      const pdf = await renderMcqSolutionPdf(input.title, input.mcqs);
      return { fileName: `${input.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-mcq-solution-key.pdf`, data: pdf.toString("base64") };
    }),
    renderPaper: teacherProcedure
      .input(z.object({ payload: z.unknown() }))
      .mutation(async ({ input }) => {
        const { validateAssessmentDraftPayload } = await import("@shared/assessmentDraftContract");
        const { renderPrintablePaperPdf } = await import("./printablePaperExport");
        const validation = validateAssessmentDraftPayload(input.payload);
        if (!validation.valid || (validation.payload.mode !== "short" && validation.payload.mode !== "long")) {
          throw new Error("Only a valid short- or long-question printable draft can be exported.");
        }
        const pdf = await renderPrintablePaperPdf(validation.payload);
        return {
          fileName: `${validation.payload.title.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "assessment"}-paper.pdf`,
          data: pdf.toString("base64"),
        };
      }),
    renderSolutionKey: teacherProcedure
      .input(z.object({ payload: z.unknown() }))
      .mutation(async ({ input }) => {
        const { validateAssessmentDraftPayload } = await import("@shared/assessmentDraftContract");
        const { renderPrintableSolutionPdf } = await import("./printablePaperExport");
        const validation = validateAssessmentDraftPayload(input.payload);
        if (!validation.valid || (validation.payload.mode !== "short" && validation.payload.mode !== "long")) {
          throw new Error("Only a valid short- or long-question printable draft can have a solution key exported.");
        }
        const pdf = await renderPrintableSolutionPdf(validation.payload);
        return {
          fileName: `${validation.payload.title.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "assessment"}-solution-key.pdf`,
          data: pdf.toString("base64"),
        };
      }),
  }),

  aiAgent: router({
    generateMCQs: teacherProcedure
      .input(
        z.object({
          contentText: z.string().min(100, "Content must be at least 100 characters").optional(),
          numQuestions: z.number().int().min(1).max(100),
          difficulty: z.enum(["balanced", "easy", "medium", "hard"]).default("balanced"),
          patternProgramme: programmeKeySchema.optional(),
          patternSubject: z.string().trim().min(2).max(100).optional(),
          scope: z.object({
            board: z.string().trim().min(2).max(50).default("FBISE"),
            grade: z.string().trim().min(1).max(20).default("10"),
            subject: z.string().trim().min(2).max(100),
            scopeType: z.enum(["single_chapter", "half_chapter", "multiple_chapters", "half_syllabus", "block"]),
            chapterIds: z.array(z.number().int().positive()).optional(),
            segmentIds: z.array(z.number().int().positive()).optional(),
            scopeTemplateId: z.number().int().positive().optional(),
          }).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { generateMCQsFromContent } = await import("./aiAgent");
        let contentText = input.contentText;
        let sourceContext;

        if (input.scope) {
          const { getActiveCurriculumScopeCatalog, listActiveAssessmentPatternSources, listReviewedAssessmentPatternGuidance, listPriorGeneratedQuestionHistory } = await import("./db");
          const { resolveCurriculumScope } = await import("./curriculumScope");
          const [catalog, paperPatternSources, paperPatternGuidance] = await Promise.all([
            getActiveCurriculumScopeCatalog(input.scope),
            listActiveAssessmentPatternSources(input.scope),
            listReviewedAssessmentPatternGuidance(input.scope),
          ]);
          if (!catalog) {
            throw new Error("No active reviewed curriculum is available for the selected subject.");
          }
          const styleAnchor = await buildStyleAnchorForProgramme(input.scope, paperPatternGuidance);
          const resolvedScope = resolveCurriculumScope(catalog, input.scope);
          const priorQuestionHistory = await listPriorGeneratedQuestionHistory({
            userId: ctx.user.id,
            curriculumSetId: catalog.curriculumSet.id,
            scopeSnapshot: resolvedScope.snapshot,
          });
          contentText = resolvedScope.sourceText;
          sourceContext = {
            sourceType: "curriculum_scope" as const,
            sourceTitle: resolvedScope.displayLabel,
            styleAnchor,
            subject: catalog.curriculumSet.subject,
            classLevel: catalog.curriculumSet.grade,
            curriculumSetId: catalog.curriculumSet.id,
            scopeTemplateId: resolvedScope.scopeTemplateId,
            scopeType: resolvedScope.scopeType,
            selectedChapterIds: resolvedScope.chapterIds,
            selectedSegmentIds: resolvedScope.segmentIds,
            scopeSnapshot: resolvedScope.snapshot,
            paperPatternGuidance: paperPatternGuidance.length ? paperPatternGuidance : paperPatternSources.map((source) => ({ sourceKind: source.sourceKind, academicYear: source.academicYear })),
            priorQuestionHistory,
          };
        } else if (input.patternProgramme || input.patternSubject) {
          const { listActiveAssessmentPatternSources, listReviewedAssessmentPatternGuidance, listPriorGeneratedQuestionHistory } = await import("./db");
          const patternProgramme = input.patternProgramme ?? { board: "FBISE", grade: "10", subject: input.patternSubject! };
          const [paperPatternSources, paperPatternGuidance, priorQuestionHistory] = await Promise.all([
            listActiveAssessmentPatternSources(patternProgramme),
            listReviewedAssessmentPatternGuidance(patternProgramme),
            listPriorGeneratedQuestionHistory({ userId: ctx.user.id, contentText: input.contentText }),
          ]);
          const styleAnchor = await buildStyleAnchorForProgramme(patternProgramme, paperPatternGuidance);
          sourceContext = {
            sourceType: "raw_text" as const,
            sourceTitle: "Teacher-provided custom source",
            styleAnchor,
            subject: patternProgramme.subject,
            classLevel: patternProgramme.grade,
            paperPatternGuidance: paperPatternGuidance.length ? paperPatternGuidance : paperPatternSources.map((source) => ({ sourceKind: source.sourceKind, academicYear: source.academicYear })),
            priorQuestionHistory,
          };
        }

        if (!contentText) {
          throw new Error("Upload or paste at least 100 characters of material, or choose a reviewed curriculum scope.");
        }
        return generateMCQsFromContent(
          ctx.user.id,
          contentText,
          input.numQuestions,
          input.difficulty,
          sourceContext
        );
      }),

    generatePrintablePaper: teacherProcedure
      .input(z.object({
        paperType: z.enum(["short", "long"]),
        title: z.string().trim().min(3).max(160),
        contentText: z.string().min(100, "Content must be at least 100 characters").optional(),
        pairCount: z.number().int().min(1).max(30),
        difficulty: z.enum(["balanced", "easy", "medium", "hard"]).default("balanced"),
        patternProgramme: programmeKeySchema.optional(),
        scope: z.object({
          board: z.string().trim().min(2).max(50).default("FBISE"),
          grade: z.string().trim().min(1).max(20),
          subject: z.string().trim().min(2).max(100),
          scopeType: z.enum(["single_chapter", "half_chapter", "multiple_chapters", "half_syllabus", "block"]),
          chapterIds: z.array(z.number().int().positive()).optional(),
          segmentIds: z.array(z.number().int().positive()).optional(),
          scopeTemplateId: z.number().int().positive().optional(),
        }).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { generatePrintablePaperFromContent } = await import("./printablePaper");
        let contentText = input.contentText;
        let sourceContext: import("./aiAgent").GenerationSourceContext | undefined;
        if (input.scope) {
          const { getActiveCurriculumScopeCatalog, listActiveAssessmentPatternSources, listReviewedAssessmentPatternGuidance, listPriorGeneratedQuestionHistory } = await import("./db");
          const { resolveCurriculumScope } = await import("./curriculumScope");
          const [catalog, paperPatternSources, paperPatternGuidance] = await Promise.all([
            getActiveCurriculumScopeCatalog(input.scope),
            listActiveAssessmentPatternSources(input.scope),
            listReviewedAssessmentPatternGuidance(input.scope),
          ]);
          if (!catalog) throw new Error("No active reviewed textbook source is available for the selected subject.");
          const styleAnchor = await buildStyleAnchorForProgramme(input.scope, paperPatternGuidance);
          const resolvedScope = resolveCurriculumScope(catalog, input.scope);
          const priorQuestionHistory = await listPriorGeneratedQuestionHistory({
            userId: ctx.user.id,
            curriculumSetId: catalog.curriculumSet.id,
            scopeSnapshot: resolvedScope.snapshot,
          });
          contentText = resolvedScope.sourceText;
          sourceContext = {
            sourceType: "curriculum_scope",
            sourceTitle: resolvedScope.displayLabel,
            styleAnchor,
            subject: catalog.curriculumSet.subject,
            classLevel: catalog.curriculumSet.grade,
            curriculumSetId: catalog.curriculumSet.id,
            scopeTemplateId: resolvedScope.scopeTemplateId,
            scopeType: resolvedScope.scopeType,
            selectedChapterIds: resolvedScope.chapterIds,
            selectedSegmentIds: resolvedScope.segmentIds,
            scopeSnapshot: resolvedScope.snapshot,
            paperPatternGuidance: paperPatternGuidance.length ? paperPatternGuidance : paperPatternSources.map((source) => ({ sourceKind: source.sourceKind, academicYear: source.academicYear })),
            priorQuestionHistory,
          };
        } else if (input.patternProgramme) {
          const { listActiveAssessmentPatternSources, listReviewedAssessmentPatternGuidance, listPriorGeneratedQuestionHistory } = await import("./db");
          const [paperSources, paperPatternGuidance, priorQuestionHistory] = await Promise.all([
            listActiveAssessmentPatternSources(input.patternProgramme),
            listReviewedAssessmentPatternGuidance(input.patternProgramme),
            listPriorGeneratedQuestionHistory({ userId: ctx.user.id, contentText: input.contentText }),
          ]);
          const styleAnchor = await buildStyleAnchorForProgramme(input.patternProgramme, paperPatternGuidance);
          sourceContext = {
            sourceType: "raw_text",
            sourceTitle: "Teacher-provided custom source",
            styleAnchor,
            subject: input.patternProgramme.subject,
            classLevel: input.patternProgramme.grade,
            paperPatternGuidance: paperPatternGuidance.length ? paperPatternGuidance : paperSources.map((source) => ({ sourceKind: source.sourceKind, academicYear: source.academicYear })),
            priorQuestionHistory,
          };
        }
        if (!contentText || !sourceContext) throw new Error("Upload or paste at least 100 characters of material, or choose a reviewed curriculum scope.");
        const { getCachedGenerationResponse, putCachedGenerationResponse, createGenerationJob, updateGenerationJob } = await import("./db");
        const { buildGenerationRequestFingerprint } = await import("./generationOptimization");
        const requestFingerprint = buildGenerationRequestFingerprint({
          mode: input.paperType,
          sourceSnapshot: sourceContext.scopeSnapshot,
          contentText,
          difficulty: input.difficulty,
          requestedCount: input.pairCount,
          title: input.title,
          priorQuestionHistory: sourceContext.priorQuestionHistory,
          styleAnchorFingerprint: sourceContext.styleAnchor?.fingerprint,
        });
        const cached = await getCachedGenerationResponse(ctx.user.id, requestFingerprint);
        const generationJob = await createGenerationJob({
          userId: ctx.user.id,
          contentText,
          numQuestions: input.pairCount * 2,
          difficulty: input.difficulty,
          curriculumSetId: sourceContext.curriculumSetId,
          scopeTemplateId: sourceContext.scopeTemplateId ?? undefined,
          scopeType: sourceContext.scopeType ?? "ad_hoc",
          selectedChapterIds: sourceContext.selectedChapterIds?.length ? JSON.stringify(sourceContext.selectedChapterIds) : undefined,
          selectedSegmentIds: sourceContext.selectedSegmentIds?.length ? JSON.stringify(sourceContext.selectedSegmentIds) : undefined,
          sourceSnapshot: sourceContext.scopeSnapshot ? JSON.stringify(sourceContext.scopeSnapshot) : undefined,
          requestFingerprint,
          promptSourceChars: contentText.length,
          promptInputChars: Math.min(contentText.length, Math.max(3_000, input.pairCount * 3_000)) + (sourceContext.styleAnchor?.instruction.length ?? 0),
          generationMode: input.paperType,
          status: "processing",
          progress: 10,
        });
        let payload: import("@shared/assessmentDraftContract").ModeDraftPayload;
        let providerTelemetry: { provider: "managed_llm" | "gemini_byok" | "mixed"; fallbackUsed: boolean; primaryFailureType: string | null; managedRetryAttempts: number; geminiRetryAttempts: number; usage?: ProviderTokenUsage } = {
          provider: "managed_llm", fallbackUsed: false, primaryFailureType: null, managedRetryAttempts: 0, geminiRetryAttempts: 0,
        };
        let cacheReused = false;
        if (cached) {
          const cachedResult = JSON.parse(cached.payload) as { payload?: import("@shared/assessmentDraftContract").ModeDraftPayload; providerTelemetry?: typeof providerTelemetry } | import("@shared/assessmentDraftContract").ModeDraftPayload;
          if ("payload" in cachedResult && cachedResult.payload) {
            payload = cachedResult.payload;
            providerTelemetry = cachedResult.providerTelemetry ?? providerTelemetry;
          } else {
            payload = cachedResult as import("@shared/assessmentDraftContract").ModeDraftPayload;
          }
          cacheReused = true;
        } else {
          try {
            const generated = await generatePrintablePaperFromContent({
              paperType: input.paperType,
              title: input.title,
              contentText,
              pairCount: input.pairCount,
              difficulty: input.difficulty,
              sourceContext,
            });
            payload = generated.payload;
            providerTelemetry = generated.providerTelemetry;
            await putCachedGenerationResponse({
              userId: ctx.user.id,
              requestFingerprint,
              generationMode: input.paperType,
              payload: JSON.stringify({ payload, providerTelemetry }),
              expiresAt: new Date(Date.now() + 15 * 60_000),
            });
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            const { getProviderFailureEvidence } = await import("./generationProvider");
            const providerFailure = getProviderFailureEvidence(error);
            await updateGenerationJob(generationJob.id, {
              status: "failed",
              errorMessage: message,
              providerFailure: providerFailure ? JSON.stringify(providerFailure) : undefined,
              generationProvider: providerFailure?.provider,
              fallbackUsed: providerFailure?.provider === "gemini_byok" ? 1 : undefined,
              primaryFailureType: providerFailure?.primaryFailureType ?? undefined,
              managedRetryAttempts: providerFailure?.provider === "managed_llm" ? providerFailure.retryAttempts : undefined,
              geminiRetryAttempts: providerFailure?.provider === "gemini_byok" ? providerFailure.retryAttempts : undefined,
              retryAttempts: providerFailure?.retryAttempts ?? undefined,
            });
            throw error;
          }
        }
        let assessmentDraftId: number | undefined;
        if ((payload.mode === "short" || payload.mode === "long") && sourceContext.sourceType === "curriculum_scope" && sourceContext.curriculumSetId && sourceContext.scopeSnapshot) {
          const { createAssessmentDraft } = await import("./db");
          const attemptedMarks = new Map<number, number>();
          payload.items.forEach((item) => {
            const group = Number(item.orGroup ?? 0);
            if (group > 0 && !attemptedMarks.has(group)) attemptedMarks.set(group, item.marks);
          });
          const draft = await createAssessmentDraft({
            title: payload.title,
            assessmentMode: payload.mode,
            sourceState: "ready",
            curriculumSetId: sourceContext.curriculumSetId,
            scopeSnapshot: JSON.stringify(sourceContext.scopeSnapshot),
            paperPatternReferences: sourceContext.paperPatternGuidance?.length ? JSON.stringify(sourceContext.paperPatternGuidance) : undefined,
            draftPayload: JSON.stringify(payload),
            totalMarks: Array.from(attemptedMarks.values()).reduce((total, marks) => total + marks, 0),
            estimatedDurationMinutes: payload.estimatedDurationMinutes,
            status: "draft",
            reviewWarnings: JSON.stringify([
              "Generated draft: review is required before publication or issue.",
              "Concept keys are retained to prevent later papers from repeating this scope's underlying topics.",
            ]),
            createdBy: ctx.user.id,
          });
          assessmentDraftId = draft.id;
        }
        await updateGenerationJob(generationJob.id, {
          status: "completed",
          progress: 100,
          cacheHit: cacheReused ? 1 : 0,
          generationProvider: providerTelemetry.provider,
          fallbackUsed: providerTelemetry.fallbackUsed ? 1 : 0,
          primaryFailureType: providerTelemetry.primaryFailureType ?? undefined,
          managedRetryAttempts: providerTelemetry.managedRetryAttempts,
          geminiRetryAttempts: providerTelemetry.geminiRetryAttempts,
          retryAttempts: providerTelemetry.managedRetryAttempts + providerTelemetry.geminiRetryAttempts,
          providerInputTokens: providerTelemetry.usage?.inputTokens ?? undefined,
          providerOutputTokens: providerTelemetry.usage?.outputTokens ?? undefined,
          providerCachedTokens: providerTelemetry.usage?.cachedTokens ?? undefined,
          providerTotalTokens: providerTelemetry.usage?.totalTokens ?? undefined,
        });
        return { payload, assessmentDraftId, cacheReused, providerTelemetry, reviewWarning: cacheReused ? "Reused an exact recent draft; no new AI call was made. Portal Admin review and source verification are still required before issuing this paper." : "Draft only: Portal Admin review and source verification are required before issuing this paper." };
      }),

    startPrintableGeneration: teacherProcedure
      .input(printableGenerationInputSchema)
      .mutation(async ({ ctx, input }) => {
        const { contentText, sourceContext } = await resolvePrintableGenerationSource(ctx.user.id, input);
        const { buildGenerationRequestFingerprint } = await import("./generationOptimization");
        const { buildPrintablePairBatches } = await import("./printablePaper");
        const { createGenerationJob, getCachedGenerationResponse } = await import("./db");
        const requestFingerprint = buildGenerationRequestFingerprint({
          mode: input.paperType,
          sourceSnapshot: sourceContext.scopeSnapshot,
          contentText,
          difficulty: input.difficulty,
          requestedCount: input.pairCount,
          title: input.title,
          priorQuestionHistory: sourceContext.priorQuestionHistory,
          styleAnchorFingerprint: sourceContext.styleAnchor?.fingerprint,
        });
        const cached = await getCachedGenerationResponse(ctx.user.id, requestFingerprint);
        if (cached) {
          const cachedResult = JSON.parse(cached.payload) as { payload?: ModeDraftPayload } | ModeDraftPayload;
          const payload = "payload" in cachedResult && cachedResult.payload ? cachedResult.payload : cachedResult as ModeDraftPayload;
          const generationJob = await createGenerationJob({
            userId: ctx.user.id,
            contentText,
            numQuestions: input.pairCount * 2,
            difficulty: input.difficulty,
            curriculumSetId: sourceContext.curriculumSetId,
            scopeTemplateId: sourceContext.scopeTemplateId ?? undefined,
            scopeType: sourceContext.scopeType ?? "ad_hoc",
            selectedChapterIds: sourceContext.selectedChapterIds?.length ? JSON.stringify(sourceContext.selectedChapterIds) : undefined,
            selectedSegmentIds: sourceContext.selectedSegmentIds?.length ? JSON.stringify(sourceContext.selectedSegmentIds) : undefined,
            sourceSnapshot: sourceContext.scopeSnapshot ? JSON.stringify(sourceContext.scopeSnapshot) : undefined,
            requestFingerprint,
            promptSourceChars: contentText.length,
            promptInputChars: 0,
            generationMode: input.paperType,
            status: "completed",
            progress: 100,
            cacheHit: 1,
            printableState: JSON.stringify({
              version: 1,
              input: { paperType: input.paperType, title: input.title, pairCount: input.pairCount, difficulty: input.difficulty },
              sourceContext,
              batchPlan: buildPrintablePairBatches(input.pairCount),
              completedItems: payload.mode === "short" || payload.mode === "long" ? payload.items : [],
              providerTelemetry: emptyProgressivePrintableTelemetry(),
              final: { payload, cacheReused: true },
            } satisfies ProgressivePrintableState),
          });
          return {
            jobId: generationJob.id,
            status: "completed" as const,
            completedPairs: input.pairCount,
            totalPairs: input.pairCount,
            totalBatches: 0,
            progress: 100,
            cacheReused: true,
            payload,
          };
        }

        const batchPlan = buildPrintablePairBatches(input.pairCount);
        const state: ProgressivePrintableState = {
          version: 1,
          input: { paperType: input.paperType, title: input.title, pairCount: input.pairCount, difficulty: input.difficulty },
          sourceContext,
          batchPlan,
          completedItems: [],
          providerTelemetry: emptyProgressivePrintableTelemetry(),
        };
        const generationJob = await createGenerationJob({
          userId: ctx.user.id,
          contentText,
          numQuestions: input.pairCount * 2,
          difficulty: input.difficulty,
          curriculumSetId: sourceContext.curriculumSetId,
          scopeTemplateId: sourceContext.scopeTemplateId ?? undefined,
          scopeType: sourceContext.scopeType ?? "ad_hoc",
          selectedChapterIds: sourceContext.selectedChapterIds?.length ? JSON.stringify(sourceContext.selectedChapterIds) : undefined,
          selectedSegmentIds: sourceContext.selectedSegmentIds?.length ? JSON.stringify(sourceContext.selectedSegmentIds) : undefined,
          sourceSnapshot: sourceContext.scopeSnapshot ? JSON.stringify(sourceContext.scopeSnapshot) : undefined,
          requestFingerprint,
          promptSourceChars: contentText.length,
          promptInputChars: 0,
          generationMode: input.paperType,
          status: "pending",
          progress: 0,
          printableState: JSON.stringify(state),
        });
        return {
          jobId: generationJob.id,
          status: "pending" as const,
          completedPairs: 0,
          totalPairs: input.pairCount,
          totalBatches: batchPlan.length,
          progress: 0,
          cacheReused: false,
        };
      }),

    advancePrintableGeneration: teacherProcedure
      .input(z.object({ jobId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const { getGenerationJob, updateGenerationJob, putCachedGenerationResponse } = await import("./db");
        const job = await getGenerationJob(input.jobId);
        if (!job || job.userId !== ctx.user.id || (job.generationMode !== "short" && job.generationMode !== "long")) {
          throw new Error("Printable generation job not found or unauthorized.");
        }
        if (!job.printableState) throw new Error("This printable generation cannot be resumed because its batch state is unavailable. Please start a new paper.");
        let state: ProgressivePrintableState;
        try {
          state = JSON.parse(job.printableState) as ProgressivePrintableState;
        } catch {
          throw new Error("The printable generation state could not be read safely. Please start a new paper.");
        }
        if (state.version !== 1 || !state.batchPlan.length) throw new Error("This printable generation state is not supported. Please start a new paper.");
        if (state.final) {
          return {
            jobId: job.id,
            status: "completed" as const,
            completedPairs: state.input.pairCount,
            totalPairs: state.input.pairCount,
            totalBatches: state.batchPlan.length,
            progress: 100,
            cacheReused: state.final.cacheReused,
            payload: state.final.payload,
            assessmentDraftId: state.final.assessmentDraftId,
          };
        }
        const completedPairs = state.completedItems.length / 2;
        if (!Number.isInteger(completedPairs) || completedPairs < 0 || completedPairs >= state.input.pairCount) {
          throw new Error("The printable generation state has an invalid verified-pair count. Please start a new paper.");
        }
        const batchIndex = state.batchPlan.findIndex((batchPairs, index) => state.batchPlan.slice(0, index).reduce((total, count) => total + count, 0) === completedPairs);
        const batchPairs = state.batchPlan[batchIndex];
        if (!batchPairs) throw new Error("No remaining printable batch could be found. Please start a new paper.");
        await updateGenerationJob(job.id, { status: "processing", errorMessage: null, providerFailure: null, progress: Math.floor((completedPairs / state.input.pairCount) * 100) });
        try {
          const { generatePrintablePaperBatch } = await import("./printablePaper");
          const batch = await generatePrintablePaperBatch({
            paperType: state.input.paperType,
            title: state.input.title,
            contentText: job.contentText,
            pairCount: batchPairs,
            difficulty: state.input.difficulty,
            sourceContext: state.sourceContext,
            existingItems: state.completedItems as never,
            batchIndex,
            totalBatches: state.batchPlan.length,
          });
          state.completedItems.push(...batch.items.map((item, itemIndex) => ({
            ...item,
            orGroup: completedPairs + Math.floor(itemIndex / 2) + 1,
          })));
          state.providerTelemetry = mergeProgressivePrintableTelemetry(state.providerTelemetry, batch.providerTelemetry);
          const nextCompletedPairs = state.completedItems.length / 2;
          const progress = Math.floor((nextCompletedPairs / state.input.pairCount) * 100);
          if (nextCompletedPairs < state.input.pairCount) {
            await updateGenerationJob(job.id, {
              status: "pending",
              progress,
              printableState: JSON.stringify(state),
              generationProvider: resolveProgressivePrintableProvider(state.providerTelemetry),
              fallbackUsed: state.providerTelemetry.fallbackUsed ? 1 : 0,
              primaryFailureType: state.providerTelemetry.primaryFailureType ?? undefined,
              managedRetryAttempts: state.providerTelemetry.managedRetryAttempts,
              geminiRetryAttempts: state.providerTelemetry.geminiRetryAttempts,
              retryAttempts: state.providerTelemetry.managedRetryAttempts + state.providerTelemetry.geminiRetryAttempts,
              providerInputTokens: state.providerTelemetry.usage?.inputTokens ?? undefined,
              providerOutputTokens: state.providerTelemetry.usage?.outputTokens ?? undefined,
              providerCachedTokens: state.providerTelemetry.usage?.cachedTokens ?? undefined,
              providerTotalTokens: state.providerTelemetry.usage?.totalTokens ?? undefined,
            });
            return {
              jobId: job.id,
              status: "pending" as const,
              completedPairs: nextCompletedPairs,
              totalPairs: state.input.pairCount,
              totalBatches: state.batchPlan.length,
              progress,
              cacheReused: false,
              nextBatch: { index: batchIndex + 2, pairs: batchPairs, startPair: nextCompletedPairs + 1, endPair: nextCompletedPairs + state.batchPlan[batchIndex + 1]! },
            };
          }
          const { validateDistinctOrPairCoverage } = await import("./generationDiversity");
          const finalDiversity = validateDistinctOrPairCoverage(state.completedItems as never, state.sourceContext.priorQuestionHistory ?? []);
          if (!finalDiversity.valid) throw new Error(`The selected source does not provide enough distinct source-supported question targets without repetition. ${finalDiversity.issues[0] ?? ""}`);
          const payload = {
            mode: state.input.paperType,
            title: state.input.title,
            estimatedDurationMinutes: state.input.paperType === "short" ? state.input.pairCount * 6 : state.input.pairCount * 10,
            items: state.completedItems,
          } as ModeDraftPayload;
          const assessmentDraftId = await createProgressivePrintableAssessmentDraft(ctx.user.id, state, payload);
          const providerTelemetry = {
            provider: resolveProgressivePrintableProvider(state.providerTelemetry),
            fallbackUsed: state.providerTelemetry.fallbackUsed,
            primaryFailureType: state.providerTelemetry.primaryFailureType,
            managedRetryAttempts: state.providerTelemetry.managedRetryAttempts,
            geminiRetryAttempts: state.providerTelemetry.geminiRetryAttempts,
            usage: state.providerTelemetry.usage,
          };
          await putCachedGenerationResponse({
            userId: ctx.user.id,
            requestFingerprint: job.requestFingerprint!,
            generationMode: state.input.paperType,
            payload: JSON.stringify({ payload, providerTelemetry }),
            expiresAt: new Date(Date.now() + 15 * 60_000),
          });
          state.final = { payload, assessmentDraftId, cacheReused: false };
          await updateGenerationJob(job.id, {
            status: "completed",
            progress: 100,
            printableState: JSON.stringify(state),
            generationProvider: providerTelemetry.provider,
            fallbackUsed: providerTelemetry.fallbackUsed ? 1 : 0,
            primaryFailureType: providerTelemetry.primaryFailureType ?? undefined,
            managedRetryAttempts: providerTelemetry.managedRetryAttempts,
            geminiRetryAttempts: providerTelemetry.geminiRetryAttempts,
            retryAttempts: providerTelemetry.managedRetryAttempts + providerTelemetry.geminiRetryAttempts,
            providerInputTokens: providerTelemetry.usage?.inputTokens ?? undefined,
            providerOutputTokens: providerTelemetry.usage?.outputTokens ?? undefined,
            providerCachedTokens: providerTelemetry.usage?.cachedTokens ?? undefined,
            providerTotalTokens: providerTelemetry.usage?.totalTokens ?? undefined,
          });
          return {
            jobId: job.id,
            status: "completed" as const,
            completedPairs: nextCompletedPairs,
            totalPairs: state.input.pairCount,
            totalBatches: state.batchPlan.length,
            progress: 100,
            cacheReused: false,
            payload,
            assessmentDraftId,
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          const { getProviderFailureEvidence } = await import("./generationProvider");
          const providerFailure = getProviderFailureEvidence(error);
          await updateGenerationJob(job.id, {
            status: "failed",
            progress: Math.floor((completedPairs / state.input.pairCount) * 100),
            errorMessage: message,
            providerFailure: providerFailure ? JSON.stringify(providerFailure) : undefined,
            generationProvider: providerFailure?.provider ?? resolveProgressivePrintableProvider(state.providerTelemetry),
            fallbackUsed: providerFailure?.provider === "gemini_byok" || state.providerTelemetry.fallbackUsed ? 1 : 0,
            primaryFailureType: providerFailure?.primaryFailureType ?? state.providerTelemetry.primaryFailureType ?? undefined,
            managedRetryAttempts: state.providerTelemetry.managedRetryAttempts + (providerFailure?.provider === "managed_llm" ? providerFailure.retryAttempts : 0),
            geminiRetryAttempts: state.providerTelemetry.geminiRetryAttempts + (providerFailure?.provider === "gemini_byok" ? providerFailure.retryAttempts : 0),
            retryAttempts: state.providerTelemetry.managedRetryAttempts + state.providerTelemetry.geminiRetryAttempts + (providerFailure?.retryAttempts ?? 0),
          });
          throw error;
        }
      }),

    saveGeneratedQuiz: teacherProcedure
      .input(
        z.object({
          jobId: z.number(),
          quizTitle: z.string().min(1),
          mcqs: z.array(z.object({
            question: z.string(),
            options: z.object({
              A: z.string(),
              B: z.string(),
              C: z.string(),
              D: z.string(),
            }),
            answer: z.string(),
            explanation: z.string(),
            difficulty: z.string(),
            conceptKey: z.string().min(2),
            facetKey: z.string().min(2),
            answerTarget: z.string().min(2),
            sourceReference: z.string().min(1),
            learningObjective: z.string().min(1),
            sourceCitation: z.object({
              citationKey: z.string().min(1),
              curriculumSetId: z.number().int().positive(),
              chapterId: z.number().int().positive(),
              chapterCode: z.string().nullable(),
              chapterTitle: z.string().min(1),
              segmentId: z.number().int().positive().nullable(),
              segmentLabel: z.string().nullable(),
              startPage: z.number().int().positive().nullable(),
              endPage: z.number().int().positive().nullable(),
              textAnchor: z.string().min(1).max(220),
            }).nullable().optional(),
          })),
          difficulty: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { getGenerationJob } = await import("./db");
        const { saveGeneratedQuizToDatabase } = await import("./aiAgent");

        const job = await getGenerationJob(input.jobId);
        if (!job || job.userId !== ctx.user.id) {
          throw new Error("Job not found or unauthorized");
        }

        const quiz = await saveGeneratedQuizToDatabase(
          ctx.user.id,
          input.jobId,
          input.quizTitle,
          input.mcqs,
          input.difficulty
        );

        return { success: true, quizId: quiz.id };
      }),

    getGenerationStatus: protectedProcedure
      .input(z.object({ jobId: z.number() }))
      .query(async ({ ctx, input }) => {
        const { getGenerationJob } = await import("./db");
        const job = await getGenerationJob(input.jobId);

        if (!job || job.userId !== ctx.user.id) {
          throw new Error("Job not found or unauthorized");
        }

        return job;
      }),
  }),
});

export type AppRouter = typeof appRouter;
// Routers are added at the end

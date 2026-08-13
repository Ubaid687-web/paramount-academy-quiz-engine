import { z } from "zod";
import { createHash, randomUUID } from "node:crypto";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, publicProcedure, protectedProcedure, router } from "./_core/trpc";

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

  quiz: router({
    getAll: publicProcedure.query(async () => {
      const { getQuizzes } = await import("./db");
      return getQuizzes();
    }),

    getById: publicProcedure
      .input(z.object({ quizId: z.number() }))
      .query(async ({ input }) => {
        const { getQuizById } = await import("./db");
        return getQuizById(input.quizId);
      }),

    getQuestions: publicProcedure
      .input(z.object({ quizId: z.number(), shuffle: z.boolean().default(false) }))
      .query(async ({ input }) => {
        const { getQuestionsByQuizId } = await import("./db");
        return getQuestionsByQuizId(input.quizId, input.shuffle);
      }),

    submitAttempt: protectedProcedure
      .input(
        z.object({
          quizId: z.number(),
          answers: z.array(
            z.object({
              questionId: z.number(),
              selectedAnswer: z.string(),
              isCorrect: z.number(),
            })
          ),
          score: z.number(),
          totalQuestions: z.number(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { createQuizAttempt, saveUserAnswers } = await import("./db");
        const percentage = Math.round((input.score / input.totalQuestions) * 100);

        const attemptId = await createQuizAttempt({
          userId: ctx.user.id,
          quizId: input.quizId,
          score: input.score,
          totalQuestions: input.totalQuestions,
          percentage,
          startedAt: new Date(),
          completedAt: new Date(),
        });

        const userAnswersData = input.answers.map((answer) => ({
          attemptId,
          questionId: answer.questionId,
          selectedAnswer: answer.selectedAnswer,
          isCorrect: answer.isCorrect,
        }));

        await saveUserAnswers(userAnswersData);

        return { attemptId, score: input.score, percentage };
      }),

    getAttemptResults: publicProcedure
      .input(z.object({ attemptId: z.number() }))
      .query(async ({ input }) => {
        const { getAttemptWithAnswers } = await import("./db");
        return getAttemptWithAnswers(input.attemptId);
      }),

    getAttemptHistory: protectedProcedure.query(async ({ ctx }) => {
      const { getUserAttemptHistory } = await import("./db");
      return getUserAttemptHistory(ctx.user.id);
    }),

    deleteQuiz: protectedProcedure
      .input(z.object({ quizId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { deleteQuizAndRelated } = await import("./db");
        return deleteQuizAndRelated(input.quizId, ctx.user.id);
      }),
  }),

  pdfUpload: router({
    extractPdfText: publicProcedure
      .input(z.object({
        fileBuffer: z.string(), // Base64 encoded PDF
        fileName: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { extractTextFromPdf } = await import("./pdfProcessor");
        const buffer = Buffer.from(input.fileBuffer, 'base64');
        return extractTextFromPdf(buffer, input.fileName);
      }),
  }),

  curriculum: router({
    listSets: adminProcedure.query(async () => {
      const { listCurriculumSets } = await import("./db");
      return listCurriculumSets();
    }),

    getManagementDetails: adminProcedure
      .input(z.object({ curriculumSetId: z.number().int().positive() }))
      .query(async ({ input }) => {
        const { getCurriculumSet, listCurriculumSources, listCurriculumChapters, listChapterSegments, listScopeTemplates } = await import("./db");
        const curriculumSet = await getCurriculumSet(input.curriculumSetId);
        if (!curriculumSet) throw new Error("Curriculum set not found");
        const chapters = await listCurriculumChapters(input.curriculumSetId);
        const chapterSegments = await Promise.all(chapters.map(async (chapter) => ({
          chapterId: chapter.id,
          segments: await listChapterSegments(chapter.id),
        })));
        return {
          curriculumSet,
          sources: await listCurriculumSources(input.curriculumSetId),
          chapters,
          chapterSegments,
          scopeTemplates: await listScopeTemplates(input.curriculumSetId),
        };
      }),

    createSet: adminProcedure
      .input(z.object({
        subject: z.enum(["physics", "chemistry", "computer_science"]),
        label: z.string().min(3).max(255),
        editionLabel: z.string().max(255).optional(),
        replacesSetId: z.number().int().positive().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { createCurriculumSet } = await import("./db");
        return createCurriculumSet({
          grade: "10",
          subject: input.subject,
          label: input.label,
          editionLabel: input.editionLabel || null,
          replacesSetId: input.replacesSetId,
          createdBy: ctx.user.id,
          status: "draft",
        });
      }),

    ingestSource: adminProcedure
      .input(z.object({
        curriculumSetId: z.number().int().positive(),
        fileName: z.string().min(1).max(255),
        mimeType: z.enum(["application/pdf", "text/plain"]),
        fileBuffer: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const { getCurriculumSet, createCurriculumSource } = await import("./db");
        const { extractCurriculumSourceText } = await import("./curriculumIngestion");
        const { storagePut } = await import("./storage");
        const curriculumSet = await getCurriculumSet(input.curriculumSetId);
        if (!curriculumSet) throw new Error("Curriculum set not found");

        const fileBuffer = Buffer.from(input.fileBuffer, "base64");
        if (!fileBuffer.length || fileBuffer.length > 30 * 1024 * 1024) {
          throw new Error("Curriculum source must be between 1 byte and 30MB.");
        }
        const extracted = await extractCurriculumSourceText({ fileBuffer, fileName: input.fileName, mimeType: input.mimeType });
        const extension = input.mimeType === "application/pdf" ? "pdf" : "txt";
        const stored = await storagePut(
          `curricula/${input.curriculumSetId}/${randomUUID()}.${extension}`,
          fileBuffer,
          input.mimeType,
        );
        return createCurriculumSource({
          curriculumSetId: input.curriculumSetId,
          storageKey: stored.key,
          storageUrl: stored.url,
          originalFileName: input.fileName,
          mimeType: input.mimeType,
          contentHash: createHash("sha256").update(fileBuffer).digest("hex"),
          extractionStatus: "extracted",
          pageCount: extracted.pageCount,
          extractedText: extracted.text,
          uploadedBy: ctx.user.id,
          extractedAt: new Date(),
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

    getActiveScopeCatalog: publicProcedure
      .input(z.object({ subject: z.enum(["physics", "chemistry", "computer_science"]) }))
      .query(async ({ input }) => {
        const { getActiveCurriculumScopeCatalog } = await import("./db");
        const catalog = await getActiveCurriculumScopeCatalog(input.subject);
        if (!catalog) return null;

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
          })),
          segments: catalog.segments.map((segment) => ({
            id: segment.id,
            chapterId: segment.chapterId,
            sequence: segment.sequence,
            label: segment.label,
            startPage: segment.startPage,
            endPage: segment.endPage,
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
      .input(z.object({ subject: z.enum(["physics", "chemistry", "computer_science"]) }))
      .query(async ({ input }) => {
        const { getActiveCurriculumScopeCatalog, listActiveAssessmentPatternSources } = await import("./db");
        const [catalog, paperSources] = await Promise.all([
          getActiveCurriculumScopeCatalog(input.subject),
          listActiveAssessmentPatternSources(input.subject),
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

    saveDraft: adminProcedure
      .input(z.object({
        assessmentMode: z.enum(["mcq", "short", "long", "full_paper"]),
        scope: z.object({
          subject: z.enum(["physics", "chemistry", "computer_science"]),
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

        const catalog = await getActiveCurriculumScopeCatalog(input.scope.subject);
        if (!catalog) {
          throw new Error("No active reviewed textbook source is available for the selected subject.");
        }
        const resolvedScope = resolveCurriculumScope(catalog, input.scope);
        const validation = validateAssessmentDraftPayload(input.payload, input.assessmentMode);
        if (!validation.valid) {
          throw new Error(`Assessment draft failed validation: ${validation.issues.join(" ")}`);
        }

        const patternSources = await listAssessmentPatternSourcesByIds(input.scope.subject, input.paperPatternSourceIds);
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

    getDraft: adminProcedure
      .input(z.object({ assessmentDraftId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const { getAssessmentDraft } = await import("./db");
        const draft = await getAssessmentDraft(input.assessmentDraftId);
        if (!draft || draft.createdBy !== ctx.user.id) {
          throw new Error("Assessment draft not found or unauthorized");
        }
        return draft;
      }),

    reviseDraft: adminProcedure
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
    renderMcqPaper: adminProcedure.input(z.object({ title: z.string().min(1), mcqs: z.array(z.object({ question: z.string().min(1), options: z.object({ A: z.string().min(1), B: z.string().min(1), C: z.string().min(1), D: z.string().min(1) }), answer: z.enum(["A", "B", "C", "D"]), explanation: z.string().min(1), sourceReference: z.string().min(1), learningObjective: z.string().min(1) })).min(1) })).mutation(async ({ input }) => {
      const { renderMcqPaperPdf } = await import("./printablePaperExport");
      const pdf = await renderMcqPaperPdf(input.title, input.mcqs);
      return { fileName: `${input.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-mcq-paper.pdf`, data: pdf.toString("base64") };
    }),
    renderMcqSolutionKey: adminProcedure.input(z.object({ title: z.string().min(1), mcqs: z.array(z.object({ question: z.string().min(1), options: z.object({ A: z.string().min(1), B: z.string().min(1), C: z.string().min(1), D: z.string().min(1) }), answer: z.enum(["A", "B", "C", "D"]), explanation: z.string().min(1), sourceReference: z.string().min(1), learningObjective: z.string().min(1) })).min(1) })).mutation(async ({ input }) => {
      const { renderMcqSolutionPdf } = await import("./printablePaperExport");
      const pdf = await renderMcqSolutionPdf(input.title, input.mcqs);
      return { fileName: `${input.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-mcq-solution-key.pdf`, data: pdf.toString("base64") };
    }),
    renderPaper: adminProcedure
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
    renderSolutionKey: adminProcedure
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
    generateMCQs: adminProcedure
      .input(
        z.object({
          contentText: z.string().min(100, "Content must be at least 100 characters").optional(),
          numQuestions: z.number().min(5).max(100),
          difficulty: z.enum(["balanced", "easy", "medium", "hard"]).default("balanced"),
          patternSubject: z.enum(["physics", "chemistry", "computer_science"]).optional(),
          scope: z.object({
            subject: z.enum(["physics", "chemistry", "computer_science"]),
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
          const { getActiveCurriculumScopeCatalog, listActiveAssessmentPatternSources } = await import("./db");
          const { resolveCurriculumScope } = await import("./curriculumScope");
          const [catalog, paperPatternSources] = await Promise.all([
            getActiveCurriculumScopeCatalog(input.scope.subject),
            listActiveAssessmentPatternSources(input.scope.subject),
          ]);
          if (!catalog) {
            throw new Error("No active reviewed curriculum is available for the selected subject.");
          }
          const resolvedScope = resolveCurriculumScope(catalog, input.scope);
          contentText = resolvedScope.sourceText;
          sourceContext = {
            sourceType: "curriculum_scope" as const,
            sourceTitle: resolvedScope.displayLabel,
            subject: catalog.curriculumSet.subject,
            classLevel: catalog.curriculumSet.grade,
            curriculumSetId: catalog.curriculumSet.id,
            scopeTemplateId: resolvedScope.scopeTemplateId,
            scopeType: resolvedScope.scopeType,
            selectedChapterIds: resolvedScope.chapterIds,
            selectedSegmentIds: resolvedScope.segmentIds,
            scopeSnapshot: resolvedScope.snapshot,
            paperPatternGuidance: paperPatternSources.map((source) => ({ sourceKind: source.sourceKind, academicYear: source.academicYear })),
          };
        } else if (input.patternSubject) {
          const { listActiveAssessmentPatternSources } = await import("./db");
          const paperPatternSources = await listActiveAssessmentPatternSources(input.patternSubject);
          sourceContext = {
            sourceType: "raw_text" as const,
            sourceTitle: "Teacher-provided custom source",
            subject: input.patternSubject,
            paperPatternGuidance: paperPatternSources.map((source) => ({ sourceKind: source.sourceKind, academicYear: source.academicYear })),
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

    generatePrintablePaper: adminProcedure
      .input(z.object({
        paperType: z.enum(["short", "long"]),
        title: z.string().trim().min(3).max(160),
        contentText: z.string().min(100, "Content must be at least 100 characters").optional(),
        pairCount: z.number().int().min(1).max(10),
        difficulty: z.enum(["balanced", "easy", "medium", "hard"]).default("balanced"),
        patternSubject: z.enum(["physics", "chemistry", "computer_science"]).optional(),
        scope: z.object({
          subject: z.enum(["physics", "chemistry", "computer_science"]),
          scopeType: z.enum(["single_chapter", "half_chapter", "multiple_chapters", "half_syllabus", "block"]),
          chapterIds: z.array(z.number().int().positive()).optional(),
          segmentIds: z.array(z.number().int().positive()).optional(),
          scopeTemplateId: z.number().int().positive().optional(),
        }).optional(),
      }))
      .mutation(async ({ input }) => {
        const { generatePrintablePaperFromContent } = await import("./printablePaper");
        let contentText = input.contentText;
        let sourceContext: import("./aiAgent").GenerationSourceContext | undefined;
        if (input.scope) {
          const { getActiveCurriculumScopeCatalog, listActiveAssessmentPatternSources } = await import("./db");
          const { resolveCurriculumScope } = await import("./curriculumScope");
          const [catalog, paperPatternSources] = await Promise.all([
            getActiveCurriculumScopeCatalog(input.scope.subject),
            listActiveAssessmentPatternSources(input.scope.subject),
          ]);
          if (!catalog) throw new Error("No active reviewed textbook source is available for the selected subject.");
          const resolvedScope = resolveCurriculumScope(catalog, input.scope);
          contentText = resolvedScope.sourceText;
          sourceContext = {
            sourceType: "curriculum_scope",
            sourceTitle: resolvedScope.displayLabel,
            subject: catalog.curriculumSet.subject,
            classLevel: catalog.curriculumSet.grade,
            curriculumSetId: catalog.curriculumSet.id,
            scopeTemplateId: resolvedScope.scopeTemplateId,
            scopeType: resolvedScope.scopeType,
            selectedChapterIds: resolvedScope.chapterIds,
            selectedSegmentIds: resolvedScope.segmentIds,
            scopeSnapshot: resolvedScope.snapshot,
            paperPatternGuidance: paperPatternSources.map((source) => ({ sourceKind: source.sourceKind, academicYear: source.academicYear })),
          };
        } else if (input.patternSubject) {
          const { listActiveAssessmentPatternSources } = await import("./db");
          const paperSources = await listActiveAssessmentPatternSources(input.patternSubject);
          sourceContext = {
            sourceType: "raw_text",
            sourceTitle: "Teacher-provided custom source",
            subject: input.patternSubject,
            paperPatternGuidance: paperSources.map((source) => ({ sourceKind: source.sourceKind, academicYear: source.academicYear })),
          };
        }
        if (!contentText || !sourceContext) throw new Error("Upload or paste at least 100 characters of material, or choose a reviewed curriculum scope.");
        const payload = await generatePrintablePaperFromContent({
          paperType: input.paperType,
          title: input.title,
          contentText,
          pairCount: input.pairCount,
          difficulty: input.difficulty,
          sourceContext,
        });
        return { payload, reviewWarning: "Draft only: Portal Admin review and source verification are required before issuing this paper." };
      }),

    saveGeneratedQuiz: adminProcedure
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
            sourceReference: z.string().min(1),
            learningObjective: z.string().min(1),
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

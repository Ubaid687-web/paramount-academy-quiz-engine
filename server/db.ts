import { and, asc, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  InsertQuiz,
  InsertQuizAttempt,
  InsertUserAnswer,
  quizzes,
  questions,
  quizAttempts,
  userAnswers,
  generationJobs,
  InsertGenerationJob,
  GenerationJob,
  curriculumChapters,
  curriculumChapterSegments,
  curriculumScopeTemplateChapters,
  curriculumScopeTemplates,
  curriculumSets,
  curriculumSources,
  curriculumSourcePageReviews,
  InsertCurriculumSet,
  InsertCurriculumSource,
  InsertCurriculumChapter,
  InsertCurriculumChapterSegment,
  InsertCurriculumScopeTemplate,
  assessmentDrafts,
  assessmentPatternSources,
  assessmentPatternProfiles,
  programmeCatalogues,
  InsertAssessmentDraft,
  InsertAssessmentPatternSource,
  InsertAssessmentPatternProfile,
  InsertProgrammeCatalogue,
  AssessmentDraft,
} from "../drizzle/schema";
import type { FbiseSubject, ProgrammeKey, ScopeCatalog } from "./curriculumScope";
import { assertNoUnresolvedOcrPages } from "./ocrQuality";
import { ENV } from './_core/env';
import type { PriorQuestionHistory } from "./generationDiversity";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function createQuiz(quiz: InsertQuiz): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(quizzes).values(quiz);
  return result[0].insertId;
}

export async function getQuizzes() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.select().from(quizzes);
}

export async function getQuizById(quizId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.select().from(quizzes).where(eq(quizzes.id, quizId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getQuestionsByQuizId(quizId: number, shuffle: boolean = false) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const results = await db.select().from(questions).where(eq(questions.quizId, quizId));
  
  if (shuffle) {
    return results.sort(() => Math.random() - 0.5);
  }
  
  return results;
}

export async function listPriorGeneratedQuestionHistory(params: {
  userId: number;
  curriculumSetId?: number;
  scopeSnapshot?: unknown;
  contentText?: string;
}): Promise<PriorQuestionHistory[]> {
  const db = await getDb();
  if (!db) return [];

  const exactScope = params.scopeSnapshot ? JSON.stringify(params.scopeSnapshot) : undefined;
  const scopedQuizRows = params.curriculumSetId && exactScope
    ? await db.select().from(quizzes).where(and(
      eq(quizzes.isAiGenerated, 1),
      eq(quizzes.createdBy, params.userId),
      eq(quizzes.curriculumSetId, params.curriculumSetId),
      eq(quizzes.scopeSnapshot, exactScope),
    ))
    : params.contentText
      ? await db.select().from(quizzes).where(and(
        eq(quizzes.isAiGenerated, 1),
        eq(quizzes.createdBy, params.userId),
        eq(quizzes.sourceContent, params.contentText),
      ))
      : [];

  const history: PriorQuestionHistory[] = [];
  for (const quiz of scopedQuizRows) {
    try {
      const metadata = quiz.generationMetadata ? JSON.parse(quiz.generationMetadata) as { conceptHistory?: PriorQuestionHistory[] } : undefined;
      if (Array.isArray(metadata?.conceptHistory)) history.push(...metadata.conceptHistory);
    } catch {
      // Older records may not contain valid JSON metadata. Their question text remains usable below.
    }
    const questionRows = await getQuestionsByQuizId(quiz.id);
    history.push(...questionRows.map((question) => ({ question: question.questionText, assessmentMode: "mcq" as const })));
  }

  const scopedDraftRows = params.curriculumSetId && exactScope
    ? await db.select().from(assessmentDrafts).where(and(
      eq(assessmentDrafts.createdBy, params.userId),
      eq(assessmentDrafts.curriculumSetId, params.curriculumSetId),
      eq(assessmentDrafts.scopeSnapshot, exactScope),
    ))
    : [];
  for (const draft of scopedDraftRows) {
    try {
      const payload = JSON.parse(draft.draftPayload) as { mode?: "short" | "long"; items?: PriorQuestionHistory[] };
      if ((payload.mode === "short" || payload.mode === "long") && Array.isArray(payload.items)) {
        history.push(...payload.items.map((item) => ({ ...item, assessmentMode: payload.mode! })));
      }
    } catch {
      // A malformed historical draft must not block new source-grounded generation.
    }
  }

  return history;
}

export async function createQuizAttempt(attempt: InsertQuizAttempt): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(quizAttempts).values(attempt);
  return result[0].insertId;
}

export async function saveUserAnswers(answers: InsertUserAnswer[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.insert(userAnswers).values(answers);
}

export async function getAttemptWithAnswers(attemptId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const attempt = await db.select().from(quizAttempts).where(eq(quizAttempts.id, attemptId)).limit(1);
  if (attempt.length === 0) return undefined;
  
  const userAnswersList = await db.select().from(userAnswers).where(eq(userAnswers.attemptId, attemptId));
  
  // Fetch questions for each answer to include full question details
  const answersWithQuestions = await Promise.all(
    userAnswersList.map(async (answer) => {
      const q = await db.select().from(questions).where(eq(questions.id, answer.questionId)).limit(1);
      return {
        ...answer,
        question: q.length > 0 ? q[0] : null,
      };
    })
  );
  
  return { attempt: attempt[0], answers: answersWithQuestions };
}

export async function getUserAttemptHistory(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.select().from(quizAttempts).where(eq(quizAttempts.userId, userId));
}

// AI Agent Functions

export async function createGenerationJob(job: InsertGenerationJob): Promise<GenerationJob> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(generationJobs).values(job);
  const inserted = await db.select().from(generationJobs).where(eq(generationJobs.id, result[0].insertId as number)).limit(1);
  return inserted[0];
}

export async function getGenerationJob(jobId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.select().from(generationJobs).where(eq(generationJobs.id, jobId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateGenerationJob(jobId: number, updates: Partial<GenerationJob>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(generationJobs).set(updates).where(eq(generationJobs.id, jobId));
}

export async function getUserGenerationJobs(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.select().from(generationJobs).where(eq(generationJobs.userId, userId));
}

/**
 * Loads only the server-approved active curriculum catalog. Callers must resolve a scope through
 * this data instead of accepting browser-supplied chapter text.
 */
export async function listProgrammeCatalogues() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(programmeCatalogues).orderBy(asc(programmeCatalogues.board), asc(programmeCatalogues.grade), asc(programmeCatalogues.subject));
}

export async function listReadyProgrammes() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const catalogues = await db.select().from(programmeCatalogues).where(eq(programmeCatalogues.status, "ready")).orderBy(asc(programmeCatalogues.board), asc(programmeCatalogues.grade), asc(programmeCatalogues.subject));
  const readiness = await Promise.all(catalogues.map(async (programme) => ({
    programme,
    catalog: await getActiveCurriculumScopeCatalog({ board: programme.board, grade: programme.grade, subject: programme.subject }),
  })));
  return readiness.filter(({ catalog }) => Boolean(catalog?.chapters.length)).map(({ programme }) => programme);
}

export async function getProgrammeCatalogue(programmeId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.select().from(programmeCatalogues).where(eq(programmeCatalogues.id, programmeId)).limit(1);
  return rows[0];
}

export async function getProgrammeCatalogueByKey(programme: ProgrammeKey) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.select().from(programmeCatalogues).where(and(
    eq(programmeCatalogues.board, programme.board),
    eq(programmeCatalogues.grade, programme.grade),
    eq(programmeCatalogues.subject, programme.subject),
  )).limit(1);
  return rows[0];
}

export async function createProgrammeCatalogue(values: Pick<InsertProgrammeCatalogue, "board" | "grade" | "subject" | "teacherLabel" | "createdBy">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(programmeCatalogues).values({ ...values, status: "intake_only" });
  return getProgrammeCatalogue(result[0].insertId as number);
}

export async function activateProgrammeCatalogue(programmeId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const programme = await getProgrammeCatalogue(programmeId);
  if (!programme) throw new Error("Programme catalogue entry not found.");
  const activeSets = await db.select({ id: curriculumSets.id }).from(curriculumSets).where(and(
    eq(curriculumSets.board, programme.board),
    eq(curriculumSets.grade, programme.grade),
    eq(curriculumSets.subject, programme.subject),
    eq(curriculumSets.status, "active"),
  )).limit(1);
  if (!activeSets.length) {
    throw new Error("Activate a reviewed curriculum edition for this programme before making it available to teachers.");
  }
  await db.update(programmeCatalogues).set({ status: "ready", activatedAt: new Date() }).where(eq(programmeCatalogues.id, programmeId));
  return getProgrammeCatalogue(programmeId);
}

/**
 * Loads only a ready programme's active, server-approved curriculum catalog. Callers must resolve
 * a scope through this data instead of accepting browser-supplied chapter text.
 */
export async function getActiveCurriculumScopeCatalog(programme: ProgrammeKey): Promise<ScopeCatalog | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const readyProgramme = await getProgrammeCatalogueByKey(programme);
  if (readyProgramme?.status !== "ready") return undefined;

  const sets = await db.select().from(curriculumSets).where(and(
    eq(curriculumSets.board, programme.board),
    eq(curriculumSets.grade, programme.grade),
    eq(curriculumSets.subject, programme.subject),
    eq(curriculumSets.status, "active"),
  )).orderBy(asc(curriculumSets.id)).limit(1);
  const curriculumSet = sets[0];
  if (!curriculumSet) return undefined;

  const chapters = await db.select().from(curriculumChapters).where(and(
    eq(curriculumChapters.curriculumSetId, curriculumSet.id),
    eq(curriculumChapters.isActive, 1),
  )).orderBy(asc(curriculumChapters.sequence));
  const chapterIds = chapters.map((chapter) => chapter.id);
  const segments = chapterIds.length
    ? await db.select().from(curriculumChapterSegments).where(and(
      inArray(curriculumChapterSegments.chapterId, chapterIds),
      eq(curriculumChapterSegments.isActive, 1),
    )).orderBy(asc(curriculumChapterSegments.sequence))
    : [];
  const templates = await db.select().from(curriculumScopeTemplates).where(and(
    eq(curriculumScopeTemplates.curriculumSetId, curriculumSet.id),
    eq(curriculumScopeTemplates.isActive, 1),
  ));
  const templateIds = templates.map((template) => template.id);
  const templateMemberships = templateIds.length
    ? await db.select().from(curriculumScopeTemplateChapters).where(
      inArray(curriculumScopeTemplateChapters.scopeTemplateId, templateIds)
    ).orderBy(asc(curriculumScopeTemplateChapters.sequence))
    : [];

  return {
    curriculumSet: {
      id: curriculumSet.id,
      board: curriculumSet.board,
      grade: curriculumSet.grade,
      subject: curriculumSet.subject,
      label: curriculumSet.label,
      editionLabel: curriculumSet.editionLabel,
    },
    chapters,
    segments,
    templates,
    templateMemberships,
  };
}

export async function listCurriculumSets() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(curriculumSets).orderBy(asc(curriculumSets.subject), asc(curriculumSets.id));
}

export async function createCurriculumSet(values: InsertCurriculumSet) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(curriculumSets).values(values);
  const rows = await db.select().from(curriculumSets).where(eq(curriculumSets.id, result[0].insertId as number)).limit(1);
  return rows[0];
}

export async function getCurriculumSet(curriculumSetId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.select().from(curriculumSets).where(eq(curriculumSets.id, curriculumSetId)).limit(1);
  return rows[0];
}

export async function listCurriculumSources(curriculumSetId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(curriculumSources).where(eq(curriculumSources.curriculumSetId, curriculumSetId)).orderBy(asc(curriculumSources.id));
}

export async function getCurriculumSource(sourceId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.select().from(curriculumSources).where(eq(curriculumSources.id, sourceId)).limit(1);
  return rows[0];
}

export async function createCurriculumSource(values: InsertCurriculumSource) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(curriculumSources).values(values);
  const rows = await db.select().from(curriculumSources).where(eq(curriculumSources.id, result[0].insertId as number)).limit(1);
  return rows[0];
}

export async function replaceCurriculumSourcePageReviews(sourceId: number, pages: Array<{
  pageNumber: number;
  textCharacters: number;
  meaningfulWords: number;
  qualityScore: number;
  reviewStatus: "clear" | "needs_review";
  reviewReasons: string | null;
}>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(curriculumSourcePageReviews).where(eq(curriculumSourcePageReviews.sourceId, sourceId));
  if (pages.length) {
    await db.insert(curriculumSourcePageReviews).values(pages.map((page) => ({ ...page, sourceId })));
  }
  return listCurriculumSourcePageReviews([sourceId]);
}

export async function listCurriculumSourcePageReviews(sourceIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!sourceIds.length) return [];
  return db.select().from(curriculumSourcePageReviews).where(inArray(curriculumSourcePageReviews.sourceId, sourceIds)).orderBy(asc(curriculumSourcePageReviews.sourceId), asc(curriculumSourcePageReviews.pageNumber));
}

export async function markCurriculumSourcePageReviewed(sourceId: number, pageNumber: number, reviewedBy: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(curriculumSourcePageReviews).set({ reviewStatus: "reviewed", reviewedBy, reviewedAt: new Date() }).where(and(
    eq(curriculumSourcePageReviews.sourceId, sourceId),
    eq(curriculumSourcePageReviews.pageNumber, pageNumber),
  ));
  const rows = await db.select().from(curriculumSourcePageReviews).where(and(
    eq(curriculumSourcePageReviews.sourceId, sourceId),
    eq(curriculumSourcePageReviews.pageNumber, pageNumber),
  )).limit(1);
  return rows[0];
}

export async function listCurriculumSetPageReviews(curriculumSetId: number) {
  const sources = await listCurriculumSources(curriculumSetId);
  return listCurriculumSourcePageReviews(sources.map((source) => source.id));
}

export async function listCurriculumChapters(curriculumSetId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(curriculumChapters).where(eq(curriculumChapters.curriculumSetId, curriculumSetId)).orderBy(asc(curriculumChapters.sequence));
}

export async function createCurriculumChapter(values: InsertCurriculumChapter) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(curriculumChapters).values(values);
  const rows = await db.select().from(curriculumChapters).where(eq(curriculumChapters.id, result[0].insertId as number)).limit(1);
  return rows[0];
}

export async function replaceChapterSegments(chapterId: number, segments: Array<Omit<InsertCurriculumChapterSegment, "chapterId">>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(curriculumChapterSegments).set({ isActive: 0 }).where(eq(curriculumChapterSegments.chapterId, chapterId));
  if (!segments.length) return [];
  await db.insert(curriculumChapterSegments).values(segments.map((segment) => ({ ...segment, chapterId, isActive: 1 })));
  return db.select().from(curriculumChapterSegments).where(and(
    eq(curriculumChapterSegments.chapterId, chapterId),
    eq(curriculumChapterSegments.isActive, 1),
  )).orderBy(asc(curriculumChapterSegments.sequence));
}

export async function listChapterSegments(chapterId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(curriculumChapterSegments).where(and(
    eq(curriculumChapterSegments.chapterId, chapterId),
    eq(curriculumChapterSegments.isActive, 1),
  )).orderBy(asc(curriculumChapterSegments.sequence));
}

export async function listScopeTemplates(curriculumSetId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(curriculumScopeTemplates).where(eq(curriculumScopeTemplates.curriculumSetId, curriculumSetId)).orderBy(asc(curriculumScopeTemplates.id));
}

export async function createScopeTemplateWithChapters(
  values: InsertCurriculumScopeTemplate,
  chapterIds: number[],
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(curriculumScopeTemplates).values(values);
  const templateId = result[0].insertId as number;
  await db.insert(curriculumScopeTemplateChapters).values(chapterIds.map((chapterId, index) => ({
    scopeTemplateId: templateId,
    chapterId,
    sequence: index + 1,
  })));
  const rows = await db.select().from(curriculumScopeTemplates).where(eq(curriculumScopeTemplates.id, templateId)).limit(1);
  return rows[0];
}

export async function activateCurriculumSet(curriculumSetId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.select().from(curriculumSets).where(eq(curriculumSets.id, curriculumSetId)).limit(1);
  const set = rows[0];
  if (!set) throw new Error("Curriculum set not found");

  const chapters = await listCurriculumChapters(curriculumSetId);
  if (!chapters.some((chapter) => chapter.isActive === 1)) {
    throw new Error("Add at least one reviewed chapter before activating a curriculum set.");
  }

  assertNoUnresolvedOcrPages(await listCurriculumSetPageReviews(curriculumSetId));

  await db.update(curriculumSets).set({ status: "archived", archivedAt: new Date() }).where(and(
    eq(curriculumSets.subject, set.subject),
    eq(curriculumSets.grade, set.grade),
    eq(curriculumSets.status, "active"),
  ));
  await db.update(curriculumSets).set({ status: "active", activatedAt: new Date(), archivedAt: null }).where(eq(curriculumSets.id, curriculumSetId));
  const activated = await db.select().from(curriculumSets).where(eq(curriculumSets.id, curriculumSetId)).limit(1);
  return activated[0];
}

export async function createReplacementCurriculumSet(currentSetId: number, values: Pick<InsertCurriculumSet, "label" | "editionLabel" | "createdBy">) {
  const current = await getCurriculumSet(currentSetId);
  if (!current) throw new Error("The curriculum edition to replace was not found.");
  if (current.status !== "active") throw new Error("Only the active edition can be replaced. Select the currently active edition first.");
  return createCurriculumSet({
    grade: current.grade,
    subject: current.subject,
    board: current.board,
    label: values.label,
    editionLabel: values.editionLabel || null,
    status: "draft",
    replacesSetId: current.id,
    createdBy: values.createdBy,
  });
}

export async function listAssessmentPatternSources(programme: ProgrammeKey) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(assessmentPatternSources).where(and(
    eq(assessmentPatternSources.board, programme.board),
    eq(assessmentPatternSources.grade, programme.grade),
    eq(assessmentPatternSources.subject, programme.subject),
  )).orderBy(asc(assessmentPatternSources.id));
}

export async function createAssessmentPatternSource(values: InsertAssessmentPatternSource) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(assessmentPatternSources).values(values);
  const rows = await db.select().from(assessmentPatternSources).where(eq(assessmentPatternSources.id, result[0].insertId as number)).limit(1);
  return rows[0];
}

export async function getAssessmentPatternSource(sourceId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.select().from(assessmentPatternSources).where(eq(assessmentPatternSources.id, sourceId)).limit(1);
  return rows[0];
}

export async function listAssessmentPatternProfilesBySourceIds(patternSourceIds: number[]) {
  if (!patternSourceIds.length) return [];
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(assessmentPatternProfiles).where(inArray(assessmentPatternProfiles.patternSourceId, patternSourceIds));
}

export async function saveAssessmentPatternProfile(values: Omit<InsertAssessmentPatternProfile, "id" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(assessmentPatternProfiles).where(eq(assessmentPatternProfiles.patternSourceId, values.patternSourceId)).limit(1);
  if (existing[0]) {
    await db.update(assessmentPatternProfiles).set(values).where(eq(assessmentPatternProfiles.patternSourceId, values.patternSourceId));
    const updated = await db.select().from(assessmentPatternProfiles).where(eq(assessmentPatternProfiles.patternSourceId, values.patternSourceId)).limit(1);
    return updated[0];
  }
  const result = await db.insert(assessmentPatternProfiles).values(values);
  const created = await db.select().from(assessmentPatternProfiles).where(eq(assessmentPatternProfiles.id, result[0].insertId as number)).limit(1);
  return created[0];
}

export async function activateAssessmentPatternSource(sourceId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.select().from(assessmentPatternSources).where(eq(assessmentPatternSources.id, sourceId)).limit(1);
  const source = rows[0];
  if (!source) throw new Error("Paper-pattern source not found.");
  if (source.extractionStatus !== "extracted" || !source.extractedText?.trim()) {
    throw new Error("Only successfully extracted paper-pattern sources can be activated.");
  }
  const profiles = await db.select().from(assessmentPatternProfiles).where(eq(assessmentPatternProfiles.patternSourceId, sourceId)).limit(1);
  if (profiles[0]?.reviewStatus !== "reviewed") {
    throw new Error("Review and confirm the paper-pattern profile before activating this source.");
  }
  await db.update(assessmentPatternSources).set({ status: "active", activatedAt: new Date() }).where(eq(assessmentPatternSources.id, sourceId));
  const activated = await db.select().from(assessmentPatternSources).where(eq(assessmentPatternSources.id, sourceId)).limit(1);
  return activated[0];
}

export async function listActiveAssessmentPatternSources(programme: ProgrammeKey) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(assessmentPatternSources).where(and(
    eq(assessmentPatternSources.board, programme.board),
    eq(assessmentPatternSources.grade, programme.grade),
    eq(assessmentPatternSources.subject, programme.subject),
    eq(assessmentPatternSources.status, "active"),
    eq(assessmentPatternSources.extractionStatus, "extracted"),
  )).orderBy(asc(assessmentPatternSources.id));
}

export async function listReviewedAssessmentPatternGuidance(programme: ProgrammeKey) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select({
    sourceKind: assessmentPatternSources.sourceKind,
    academicYear: assessmentPatternSources.academicYear,
    sectionAInstruction: assessmentPatternProfiles.sectionAInstruction,
    sectionBInstruction: assessmentPatternProfiles.sectionBInstruction,
    sectionCInstruction: assessmentPatternProfiles.sectionCInstruction,
    orRule: assessmentPatternProfiles.orRule,
    profileEvidenceNotes: assessmentPatternProfiles.profileEvidenceNotes,
  }).from(assessmentPatternSources).innerJoin(
    assessmentPatternProfiles,
    eq(assessmentPatternProfiles.patternSourceId, assessmentPatternSources.id),
  ).where(and(
    eq(assessmentPatternSources.board, programme.board),
    eq(assessmentPatternSources.grade, programme.grade),
    eq(assessmentPatternSources.subject, programme.subject),
    eq(assessmentPatternSources.status, "active"),
    eq(assessmentPatternSources.extractionStatus, "extracted"),
    eq(assessmentPatternProfiles.reviewStatus, "reviewed"),
  )).orderBy(asc(assessmentPatternSources.id));
}

export async function listAssessmentPatternSourcesByIds(programme: ProgrammeKey, sourceIds: number[]) {
  if (!sourceIds.length) return [];
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(assessmentPatternSources).where(and(
    eq(assessmentPatternSources.board, programme.board),
    eq(assessmentPatternSources.grade, programme.grade),
    eq(assessmentPatternSources.subject, programme.subject),
    eq(assessmentPatternSources.status, "active"),
    eq(assessmentPatternSources.extractionStatus, "extracted"),
    inArray(assessmentPatternSources.id, sourceIds),
  ));
}

export async function createAssessmentDraft(values: InsertAssessmentDraft) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(assessmentDrafts).values(values);
  const rows = await db.select().from(assessmentDrafts).where(eq(assessmentDrafts.id, result[0].insertId as number)).limit(1);
  return rows[0];
}

export async function getAssessmentDraft(assessmentDraftId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.select().from(assessmentDrafts).where(eq(assessmentDrafts.id, assessmentDraftId)).limit(1);
  return rows[0];
}

export async function updateAssessmentDraft(assessmentDraftId: number, updates: Partial<AssessmentDraft>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(assessmentDrafts).set(updates).where(eq(assessmentDrafts.id, assessmentDraftId));
  return getAssessmentDraft(assessmentDraftId);
}

export async function createAiGeneratedQuiz(quiz: InsertQuiz) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(quizzes).values(quiz);
  const inserted = await db.select().from(quizzes).where(eq(quizzes.id, result[0].insertId as number)).limit(1);
  return inserted[0];
}

export async function addQuestionsToQuiz(quizId: number, questionsList: any[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const questionsToInsert = questionsList.map((q, idx) => ({
    quizId,
    questionNumber: idx + 1,
    questionText: q.question,
    optionA: q.options.A,
    optionB: q.options.B,
    optionC: q.options.C,
    optionD: q.options.D,
    correctAnswer: q.answer,
  }));
  
  return db.insert(questions).values(questionsToInsert);
}

export async function deleteQuizAndRelated(quizId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Verify quiz ownership (only creator can delete)
  const quiz = await getQuizById(quizId);
  if (!quiz) throw new Error("Quiz not found");
  
  // Delete user answers for all attempts of this quiz
  const attempts = await db.select().from(quizAttempts).where(eq(quizAttempts.quizId, quizId));
  for (const attempt of attempts) {
    await db.delete(userAnswers).where(eq(userAnswers.attemptId, attempt.id));
  }
  
  // Delete quiz attempts
  await db.delete(quizAttempts).where(eq(quizAttempts.quizId, quizId));
  
  // Delete questions
  await db.delete(questions).where(eq(questions.quizId, quizId));
  
  // Delete quiz
  await db.delete(quizzes).where(eq(quizzes.id, quizId));
  
  return { success: true, message: "Quiz deleted successfully" };
}

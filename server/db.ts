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
  InsertCurriculumSet,
  InsertCurriculumSource,
  InsertCurriculumChapter,
  InsertCurriculumChapterSegment,
  InsertCurriculumScopeTemplate,
  assessmentDrafts,
  assessmentPatternSources,
  InsertAssessmentDraft,
  InsertAssessmentPatternSource,
  AssessmentDraft,
} from "../drizzle/schema";
import type { FbiseSubject, ScopeCatalog } from "./curriculumScope";
import { ENV } from './_core/env';

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
export async function getActiveCurriculumScopeCatalog(subject: FbiseSubject): Promise<ScopeCatalog | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const sets = await db.select().from(curriculumSets).where(and(
    eq(curriculumSets.grade, "10"),
    eq(curriculumSets.subject, subject),
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

export async function listAssessmentPatternSources(subject: FbiseSubject) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(assessmentPatternSources).where(and(
    eq(assessmentPatternSources.grade, "10"),
    eq(assessmentPatternSources.subject, subject),
  )).orderBy(asc(assessmentPatternSources.id));
}

export async function createAssessmentPatternSource(values: InsertAssessmentPatternSource) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(assessmentPatternSources).values(values);
  const rows = await db.select().from(assessmentPatternSources).where(eq(assessmentPatternSources.id, result[0].insertId as number)).limit(1);
  return rows[0];
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
  await db.update(assessmentPatternSources).set({ status: "active", activatedAt: new Date() }).where(eq(assessmentPatternSources.id, sourceId));
  const activated = await db.select().from(assessmentPatternSources).where(eq(assessmentPatternSources.id, sourceId)).limit(1);
  return activated[0];
}

export async function listActiveAssessmentPatternSources(subject: FbiseSubject) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(assessmentPatternSources).where(and(
    eq(assessmentPatternSources.grade, "10"),
    eq(assessmentPatternSources.subject, subject),
    eq(assessmentPatternSources.status, "active"),
    eq(assessmentPatternSources.extractionStatus, "extracted"),
  )).orderBy(asc(assessmentPatternSources.id));
}

export async function listAssessmentPatternSourcesByIds(subject: FbiseSubject, sourceIds: number[]) {
  if (!sourceIds.length) return [];
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(assessmentPatternSources).where(and(
    eq(assessmentPatternSources.grade, "10"),
    eq(assessmentPatternSources.subject, subject),
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

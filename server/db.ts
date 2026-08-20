import { and, asc, desc, eq, gte, inArray, lt, lte, or, sql } from "drizzle-orm";
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
  generationResponseCaches,
  generationCircuitStates,
  GenerationResponseCache,
  GenerationCircuitState,
  ocrExtractionJobs,
  ocrSchedulerStates,
  InsertOcrExtractionJob,
  teacherProvisionRules,
  generationProviderSettings,
  generationStyleAnchorExamples,
} from "../drizzle/schema";
import type { FbiseSubject, ProgrammeKey, ScopeCatalog } from "./curriculumScope";
import { assertNoUnresolvedOcrPages } from "./ocrQuality";
import { ENV } from './_core/env';
import type { PriorQuestionHistory } from "./generationDiversity";
import type { GenerationMode } from "./generationOptimization";
import { normalizeProvisionEmail, selectAutomaticSignInRole } from "./staffProvisioning";

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
    } else {
      const normalizedEmail = normalizeProvisionEmail(user.email);
      const approvedRule = normalizedEmail
        ? await db.select({ id: teacherProvisionRules.id }).from(teacherProvisionRules).where(eq(teacherProvisionRules.email, normalizedEmail)).limit(1)
        : [];
      const automaticRole = selectAutomaticSignInRole({
        openId: user.openId,
        ownerOpenId: ENV.ownerOpenId,
        email: normalizedEmail,
        emailIsTeacherApproved: approvedRule.length > 0,
      });
      if (automaticRole) {
        values.role = automaticRole;
        if (automaticRole === "admin") updateSet.role = automaticRole;
      }
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

export async function promoteApprovedTeacherOnSignIn(openId: string, email: string | null | undefined) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (openId === ENV.ownerOpenId) return false;
  const normalizedEmail = normalizeProvisionEmail(email);
  if (!normalizedEmail) return false;
  const approvedRule = await db.select({ id: teacherProvisionRules.id }).from(teacherProvisionRules).where(eq(teacherProvisionRules.email, normalizedEmail)).limit(1);
  if (approvedRule.length === 0) return false;
  const result = await db.update(users).set({ role: "teacher" }).where(and(eq(users.openId, openId), eq(users.role, "user")));
  return result[0].affectedRows > 0;
}

export type StaffRole = "teacher" | "admin";

export async function listStaffRoleDirectory() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    role: users.role,
    lastSignedIn: users.lastSignedIn,
  }).from(users).orderBy(asc(users.name), asc(users.id));
}

export async function getStaffMemberById(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return rows[0];
}

export async function updateStaffRole(userId: number, role: StaffRole) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

export async function listTeacherProvisionRules() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(teacherProvisionRules).orderBy(asc(teacherProvisionRules.email));
}

export async function createTeacherProvisionRule(email: string, addedBy: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const normalizedEmail = normalizeProvisionEmail(email);
  if (!normalizedEmail) throw new Error("A teacher email is required.");
  await db.insert(teacherProvisionRules).values({ email: normalizedEmail, addedBy }).onDuplicateKeyUpdate({ set: { email: normalizedEmail } });
  const rules = await db.select().from(teacherProvisionRules).where(eq(teacherProvisionRules.email, normalizedEmail)).limit(1);
  return rules[0];
}

export async function removeTeacherProvisionRule(ruleId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(teacherProvisionRules).where(eq(teacherProvisionRules.id, ruleId));
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

/** A learner may see published quizzes plus their own drafts; Portal Admin keeps operational visibility. */
export async function getQuizzesVisibleToUser(userId: number, isAdmin: boolean = false) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (isAdmin) return db.select().from(quizzes);
  return db.select().from(quizzes).where(or(
    eq(quizzes.createdBy, userId),
    eq(quizzes.publicationStatus, "published"),
  ));
}

export async function getQuizById(quizId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.select().from(quizzes).where(eq(quizzes.id, quizId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getQuizVisibleToUser(quizId: number, userId: number, isAdmin: boolean = false) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const access = isAdmin
    ? eq(quizzes.id, quizId)
    : and(eq(quizzes.id, quizId), or(eq(quizzes.createdBy, userId), eq(quizzes.publicationStatus, "published")));
  const rows = await db.select().from(quizzes).where(access).limit(1);
  return rows[0];
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

export async function getPracticeQuestionsByQuizId(quizId: number, shuffle: boolean = false) {
  const results = await getQuestionsByQuizId(quizId, shuffle);
  return results.map(({ correctAnswer: _correctAnswer, sourceCitation: _sourceCitation, ...question }) => question);
}

export async function getQuestionForQuiz(quizId: number, questionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.select().from(questions).where(and(
    eq(questions.quizId, quizId),
    eq(questions.id, questionId),
  )).limit(1);
  return rows[0];
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

export async function getAttemptWithAnswersForUser(attemptId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const attempt = await db.select().from(quizAttempts).where(and(
    eq(quizAttempts.id, attemptId),
    eq(quizAttempts.userId, userId),
  )).limit(1);
  if (!attempt.length) return undefined;
  return getAttemptWithAnswers(attemptId);
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

/** Claims one resumable printable job so repeated taps cannot produce duplicate provider batches. */
export async function claimPrintableGenerationJob(jobId: number, userId: number, progress: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.update(generationJobs).set({
    status: "processing",
    errorMessage: null,
    providerFailure: null,
    progress,
  }).where(and(
    eq(generationJobs.id, jobId),
    eq(generationJobs.userId, userId),
    inArray(generationJobs.status, ["pending", "failed"]),
  ));
  return result[0].affectedRows > 0;
}

export async function getUserGenerationJobs(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.select().from(generationJobs).where(eq(generationJobs.userId, userId));
}

export async function getGenerationProviderSettings() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(generationProviderSettings).where(eq(generationProviderSettings.id, 1)).limit(1);
  if (existing[0]) return existing[0];
  await db.insert(generationProviderSettings).values({ id: 1, geminiFallbackEnabled: 0 });
  const created = await db.select().from(generationProviderSettings).where(eq(generationProviderSettings.id, 1)).limit(1);
  return created[0]!;
}

export async function setGeminiFallbackEnabled(enabled: boolean, updatedBy: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(generationProviderSettings).values({ id: 1, geminiFallbackEnabled: enabled ? 1 : 0, updatedBy }).onDuplicateKeyUpdate({
    set: { geminiFallbackEnabled: enabled ? 1 : 0, updatedBy },
  });
  return getGenerationProviderSettings();
}

export async function listAdminGenerationHistory(limit = 30) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select({
    id: generationJobs.id,
    status: generationJobs.status,
    createdAt: generationJobs.createdAt,
    completedAt: generationJobs.completedAt,
    generationProvider: generationJobs.generationProvider,
    fallbackUsed: generationJobs.fallbackUsed,
    primaryFailureType: generationJobs.primaryFailureType,
    retryAttempts: generationJobs.retryAttempts,
    managedRetryAttempts: generationJobs.managedRetryAttempts,
    geminiRetryAttempts: generationJobs.geminiRetryAttempts,
    cacheHit: generationJobs.cacheHit,
    promptSourceChars: generationJobs.promptSourceChars,
    promptInputChars: generationJobs.promptInputChars,
    providerInputTokens: generationJobs.providerInputTokens,
    providerOutputTokens: generationJobs.providerOutputTokens,
    providerCachedTokens: generationJobs.providerCachedTokens,
    providerTotalTokens: generationJobs.providerTotalTokens,
    generationMode: generationJobs.generationMode,
    errorMessage: generationJobs.errorMessage,
    providerFailure: generationJobs.providerFailure,
    sourceTitle: generationJobs.scopeType,
    staffName: users.name,
    staffEmail: users.email,
  }).from(generationJobs).leftJoin(users, eq(users.id, generationJobs.userId)).orderBy(generationJobs.id).limit(Math.min(Math.max(limit, 1), 100));
}

export async function getCachedGenerationResponse(userId: number, requestFingerprint: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(generationResponseCaches).where(and(
    eq(generationResponseCaches.userId, userId),
    eq(generationResponseCaches.requestFingerprint, requestFingerprint),
  )).limit(1);
  const cached = rows[0];
  if (!cached) return undefined;
  if (cached.expiresAt.getTime() <= Date.now()) {
    await db.delete(generationResponseCaches).where(eq(generationResponseCaches.id, cached.id));
    return undefined;
  }
  await db.update(generationResponseCaches).set({ hitCount: cached.hitCount + 1 }).where(eq(generationResponseCaches.id, cached.id));
  return cached;
}

export async function putCachedGenerationResponse(values: {
  userId: number;
  requestFingerprint: string;
  generationMode: GenerationMode;
  payload: string;
  expiresAt: Date;
}) {
  const db = await getDb();
  if (!db) return undefined;
  const existing = await db.select().from(generationResponseCaches).where(and(
    eq(generationResponseCaches.userId, values.userId),
    eq(generationResponseCaches.requestFingerprint, values.requestFingerprint),
  )).limit(1);
  if (existing[0]) {
    await db.update(generationResponseCaches).set({
      generationMode: values.generationMode,
      payload: values.payload,
      expiresAt: values.expiresAt,
      hitCount: 0,
    }).where(eq(generationResponseCaches.id, existing[0].id));
    return existing[0];
  }
  const result = await db.insert(generationResponseCaches).values(values);
  const created = await db.select().from(generationResponseCaches).where(eq(generationResponseCaches.id, result[0].insertId as number)).limit(1);
  return created[0];
}

export async function getOpenGenerationCircuit(serviceKey = "managed_llm") {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(generationCircuitStates).where(eq(generationCircuitStates.serviceKey, serviceKey)).limit(1);
  const circuit = rows[0];
  if (!circuit || circuit.state !== "open" || !circuit.openUntil) return undefined;
  if (circuit.openUntil.getTime() > Date.now()) return circuit;
  await db.update(generationCircuitStates).set({ state: "closed", failureType: null, openUntil: null }).where(eq(generationCircuitStates.id, circuit.id));
  return undefined;
}

export async function openGenerationCircuit(params: { failureType: string; holdMinutes: number; serviceKey?: string }) {
  const db = await getDb();
  if (!db) return undefined;
  const serviceKey = params.serviceKey ?? "managed_llm";
  const openUntil = new Date(Date.now() + params.holdMinutes * 60_000);
  const existing = await db.select().from(generationCircuitStates).where(eq(generationCircuitStates.serviceKey, serviceKey)).limit(1);
  if (existing[0]) {
    await db.update(generationCircuitStates).set({ state: "open", failureType: params.failureType, openUntil, lastFailureAt: new Date() }).where(eq(generationCircuitStates.id, existing[0].id));
  } else {
    await db.insert(generationCircuitStates).values({ serviceKey, state: "open", failureType: params.failureType, openUntil, lastFailureAt: new Date() });
  }
  return { serviceKey, failureType: params.failureType, openUntil };
}

export async function closeGenerationCircuit(serviceKey = "managed_llm") {
  const db = await getDb();
  if (!db) return;
  await db.update(generationCircuitStates).set({ state: "closed", failureType: null, openUntil: null }).where(eq(generationCircuitStates.serviceKey, serviceKey));
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
  const existing = await getProgrammeCatalogueByKey(values);
  if (existing) return existing;

  try {
    const result = await db.insert(programmeCatalogues).values({ ...values, status: "intake_only" });
    return getProgrammeCatalogue(result[0].insertId as number);
  } catch (error) {
    // The unique board/grade/subject index remains the concurrency guard. If another Portal Admin
    // request won the race, recover the existing intake record instead of exposing SQL details.
    const concurrentProgramme = await getProgrammeCatalogueByKey(values);
    if (concurrentProgramme) return concurrentProgramme;
    throw error;
  }
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
  const configuredTemplates = await db.select().from(curriculumScopeTemplates).where(and(
    eq(curriculumScopeTemplates.curriculumSetId, curriculumSet.id),
    eq(curriculumScopeTemplates.isActive, 1),
  ));
  const configuredTemplateIds = configuredTemplates.map((template) => template.id);
  const configuredMemberships = configuredTemplateIds.length
    ? await db.select().from(curriculumScopeTemplateChapters).where(
      inArray(curriculumScopeTemplateChapters.scopeTemplateId, configuredTemplateIds)
    ).orderBy(asc(curriculumScopeTemplateChapters.sequence))
    : [];
  const activeChapterIds = new Set(chapterIds);
  const eligibleTemplateIds = new Set(configuredTemplates
    .filter((template) => {
      const members = configuredMemberships.filter((membership) => membership.scopeTemplateId === template.id);
      return members.length > 0 && members.every((membership) => activeChapterIds.has(membership.chapterId));
    })
    .map((template) => template.id));
  const templates = configuredTemplates.filter((template) => eligibleTemplateIds.has(template.id));
  const templateMemberships = configuredMemberships.filter((membership) => eligibleTemplateIds.has(membership.scopeTemplateId));

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

export async function updateCurriculumSourceExtraction(sourceId: number, values: Pick<InsertCurriculumSource, "extractionStatus"> & Partial<Pick<InsertCurriculumSource, "extractedText" | "extractionError" | "extractedAt">>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(curriculumSources).set(values).where(eq(curriculumSources.id, sourceId));
  return getCurriculumSource(sourceId);
}

export async function createOcrExtractionJob(values: InsertOcrExtractionJob) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(ocrExtractionJobs).values(values);
  const rows = await db.select().from(ocrExtractionJobs).where(eq(ocrExtractionJobs.id, result[0].insertId as number)).limit(1);
  return rows[0];
}

export async function getOcrExtractionJobForSource(sourceId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.select().from(ocrExtractionJobs).where(eq(ocrExtractionJobs.sourceId, sourceId)).limit(1);
  return rows[0];
}

export async function listOcrExtractionJobsForSources(sourceIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!sourceIds.length) return [];
  return db.select().from(ocrExtractionJobs).where(inArray(ocrExtractionJobs.sourceId, sourceIds)).orderBy(asc(ocrExtractionJobs.createdAt));
}

export async function claimNextOcrExtractionJob() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const candidates = await db.select().from(ocrExtractionJobs)
    .where(eq(ocrExtractionJobs.status, "pending"))
    .orderBy(asc(ocrExtractionJobs.createdAt), asc(ocrExtractionJobs.id))
    .limit(5);

  for (const candidate of candidates) {
    const result = await db.update(ocrExtractionJobs).set({
      status: "processing",
      startedAt: candidate.startedAt ?? new Date(),
      attemptCount: sql`${ocrExtractionJobs.attemptCount} + 1`,
    }).where(and(
      eq(ocrExtractionJobs.id, candidate.id),
      eq(ocrExtractionJobs.status, "pending"),
    ));
    if (result[0].affectedRows) {
      const rows = await db.select().from(ocrExtractionJobs).where(eq(ocrExtractionJobs.id, candidate.id)).limit(1);
      return rows[0];
    }
  }
  return null;
}

export async function requeueStaleOcrExtractionJobs() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const staleBefore = new Date(Date.now() - 10 * 60 * 1000);
  await db.update(ocrExtractionJobs).set({ status: "pending", errorMessage: "OCR worker restarted after an interrupted batch." }).where(and(
    eq(ocrExtractionJobs.status, "processing"),
    lt(ocrExtractionJobs.updatedAt, staleBefore),
  ));
}

export async function updateOcrExtractionJob(jobId: number, values: Partial<Pick<InsertOcrExtractionJob, "status" | "nextPage" | "errorMessage" | "completedAt">>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(ocrExtractionJobs).set(values).where(eq(ocrExtractionJobs.id, jobId));
  const rows = await db.select().from(ocrExtractionJobs).where(eq(ocrExtractionJobs.id, jobId)).limit(1);
  return rows[0];
}

export async function getOcrSchedulerState() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.select().from(ocrSchedulerStates).where(eq(ocrSchedulerStates.id, 1)).limit(1);
  return rows[0];
}

export async function saveOcrSchedulerState(taskUid: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(ocrSchedulerStates).values({ id: 1, taskUid }).onDuplicateKeyUpdate({ set: { taskUid } });
  return getOcrSchedulerState();
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

function replaceMarkedChapterPageText(contentText: string, pageNumber: number, correctedText: string) {
  const marker = `--- PAGE ${pageNumber} ---`;
  const markerIndex = contentText.indexOf(marker);
  if (markerIndex < 0) return null;
  const textStart = markerIndex + marker.length;
  const nextMarker = /\n--- PAGE \d+ ---/g;
  nextMarker.lastIndex = textStart;
  const next = nextMarker.exec(contentText);
  const textEnd = next?.index ?? contentText.length;
  return `${contentText.slice(0, textStart)}\n${correctedText.trim()}${contentText.slice(textEnd)}`;
}

export async function saveCorrectedCurriculumSourcePage(input: {
  sourceId: number;
  pageNumber: number;
  correctedTranscript: string;
  correctedText: string;
  reviewedBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.transaction(async (tx) => {
    const sourceRows = await tx.select().from(curriculumSources).where(eq(curriculumSources.id, input.sourceId)).limit(1);
    const source = sourceRows[0];
    if (!source) throw new Error("The selected source was not found.");

    await tx.update(curriculumSources).set({ extractedText: input.correctedTranscript, extractedAt: new Date() }).where(eq(curriculumSources.id, input.sourceId));
    const originalReviewRows = await tx.select().from(curriculumSourcePageReviews).where(and(
      eq(curriculumSourcePageReviews.sourceId, input.sourceId),
      eq(curriculumSourcePageReviews.pageNumber, input.pageNumber),
    )).limit(1);
    const originalReview = originalReviewRows[0];
    if (!originalReview) throw new Error("The selected OCR page quality record was not found.");

    const meaningfulWords = input.correctedText.trim().split(/\s+/).filter(Boolean).length;
    await tx.update(curriculumSourcePageReviews).set({
      textCharacters: input.correctedText.length,
      meaningfulWords,
      reviewStatus: "reviewed",
      reviewReasons: `Manually corrected and reviewed by Portal Admin. Original OCR signal: ${originalReview.reviewReasons ?? `quality ${originalReview.qualityScore}/100`}.`,
      reviewedBy: input.reviewedBy,
      reviewedAt: new Date(),
    }).where(and(
      eq(curriculumSourcePageReviews.sourceId, input.sourceId),
      eq(curriculumSourcePageReviews.pageNumber, input.pageNumber),
    ));

    const affectedChapters = await tx.select().from(curriculumChapters).where(and(
      eq(curriculumChapters.sourceId, input.sourceId),
      lte(curriculumChapters.startPage, input.pageNumber),
      gte(curriculumChapters.endPage, input.pageNumber),
    ));
    const updatedChapterIds: number[] = [];
    for (const chapter of affectedChapters) {
      const updatedText = replaceMarkedChapterPageText(chapter.contentText, input.pageNumber, input.correctedText);
      if (!updatedText) continue;
      await tx.update(curriculumChapters).set({ contentText: updatedText }).where(eq(curriculumChapters.id, chapter.id));
      updatedChapterIds.push(chapter.id);
    }

    const reviewRows = await tx.select().from(curriculumSourcePageReviews).where(and(
      eq(curriculumSourcePageReviews.sourceId, input.sourceId),
      eq(curriculumSourcePageReviews.pageNumber, input.pageNumber),
    )).limit(1);
    return { pageReview: reviewRows[0], updatedChapterIds };
  });
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

export async function getCurriculumChapter(chapterId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.select().from(curriculumChapters).where(eq(curriculumChapters.id, chapterId)).limit(1);
  return rows[0];
}

export async function setCurriculumChapterGenerationAvailability(input: { curriculumSetId: number; chapterId: number; isActive: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(curriculumChapters).set({ isActive: input.isActive }).where(and(
    eq(curriculumChapters.id, input.chapterId),
    eq(curriculumChapters.curriculumSetId, input.curriculumSetId),
  ));
  return getCurriculumChapter(input.chapterId);
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

  const sources = await listCurriculumSources(curriculumSetId);
  const pendingSource = sources.find((source) => source.extractionStatus === "pending");
  if (pendingSource) {
    throw new Error(`Complete OCR extraction for ${pendingSource.originalFileName} before activating this curriculum edition.`);
  }
  const failedSource = sources.find((source) => source.extractionStatus === "failed");
  if (failedSource) {
    throw new Error(`Resolve the failed extraction for ${failedSource.originalFileName} before activating this curriculum edition.`);
  }

  assertNoUnresolvedOcrPages(await listCurriculumSetPageReviews(curriculumSetId));

  const activatedAt = new Date();
  await db.transaction(async (tx) => {
    await tx.update(curriculumSets).set({ status: "archived", archivedAt: activatedAt }).where(and(
      eq(curriculumSets.board, set.board),
      eq(curriculumSets.subject, set.subject),
      eq(curriculumSets.grade, set.grade),
      eq(curriculumSets.status, "active"),
    ));
    await tx.update(curriculumSets).set({ status: "active", activatedAt, archivedAt: null }).where(eq(curriculumSets.id, curriculumSetId));
  });
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

export type StyleAnchorQuestion = {
  questionId: number;
  quizId: number;
  quizTitle: string;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
};

function hasStructuredTextbookCitation(rawCitation: string | null) {
  if (!rawCitation) return false;
  try {
    const citation = JSON.parse(rawCitation) as { curriculumSetId?: unknown; chapterId?: unknown; textAnchor?: unknown };
    return typeof citation.curriculumSetId === "number" && typeof citation.chapterId === "number" && typeof citation.textAnchor === "string" && citation.textAnchor.trim().length > 0;
  } catch {
    return false;
  }
}

/** Published, textbook-cited questions are eligible for explicit Portal Admin style-only approval. */
export async function listEligibleStyleAnchorQuestions(programme: ProgrammeKey): Promise<StyleAnchorQuestion[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.select({
    questionId: questions.id,
    quizId: quizzes.id,
    quizTitle: quizzes.title,
    questionText: questions.questionText,
    optionA: questions.optionA,
    optionB: questions.optionB,
    optionC: questions.optionC,
    optionD: questions.optionD,
    sourceCitation: questions.sourceCitation,
  }).from(questions).innerJoin(quizzes, eq(questions.quizId, quizzes.id)).innerJoin(
    curriculumSets,
    eq(quizzes.curriculumSetId, curriculumSets.id),
  ).where(and(
    eq(curriculumSets.board, programme.board),
    eq(curriculumSets.grade, programme.grade),
    eq(curriculumSets.subject, programme.subject),
    eq(quizzes.isAiGenerated, 1),
    eq(quizzes.publicationStatus, "published"),
  )).orderBy(desc(questions.id)).limit(60);
  return rows.filter((row) => hasStructuredTextbookCitation(row.sourceCitation)).map(({ sourceCitation: _sourceCitation, ...question }) => question);
}

export async function listApprovedStyleAnchorExamples(programme: ProgrammeKey): Promise<StyleAnchorQuestion[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.select({
    questionId: questions.id,
    quizId: quizzes.id,
    quizTitle: quizzes.title,
    questionText: questions.questionText,
    optionA: questions.optionA,
    optionB: questions.optionB,
    optionC: questions.optionC,
    optionD: questions.optionD,
    sourceCitation: questions.sourceCitation,
  }).from(generationStyleAnchorExamples).innerJoin(
    questions,
    eq(generationStyleAnchorExamples.questionId, questions.id),
  ).innerJoin(quizzes, eq(questions.quizId, quizzes.id)).innerJoin(
    curriculumSets,
    eq(quizzes.curriculumSetId, curriculumSets.id),
  ).where(and(
    eq(generationStyleAnchorExamples.board, programme.board),
    eq(generationStyleAnchorExamples.grade, programme.grade),
    eq(generationStyleAnchorExamples.subject, programme.subject),
    eq(quizzes.publicationStatus, "published"),
  )).orderBy(asc(generationStyleAnchorExamples.id));
  return rows.filter((row) => hasStructuredTextbookCitation(row.sourceCitation)).slice(0, 4).map(({ sourceCitation: _sourceCitation, ...question }) => question);
}

export async function approveStyleAnchorExample(programme: ProgrammeKey, questionId: number, approvedBy: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [eligible, approved] = await Promise.all([
    listEligibleStyleAnchorQuestions(programme),
    listApprovedStyleAnchorExamples(programme),
  ]);
  if (!eligible.some((question) => question.questionId === questionId)) throw new Error("Only published, textbook-cited questions from this exact FBISE grade and subject can be approved as style examples.");
  if (approved.some((question) => question.questionId === questionId)) return approved;
  if (approved.length >= 4) throw new Error("A programme can use at most four approved style examples. Remove one before approving another.");
  await db.insert(generationStyleAnchorExamples).values({ board: programme.board, grade: programme.grade, subject: programme.subject, questionId, approvedBy });
  return listApprovedStyleAnchorExamples(programme);
}

export async function removeStyleAnchorExample(programme: ProgrammeKey, questionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(generationStyleAnchorExamples).where(and(
    eq(generationStyleAnchorExamples.board, programme.board),
    eq(generationStyleAnchorExamples.grade, programme.grade),
    eq(generationStyleAnchorExamples.subject, programme.subject),
    eq(generationStyleAnchorExamples.questionId, questionId),
  ));
  return listApprovedStyleAnchorExamples(programme);
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
    sourceCitation: q.sourceCitation ? JSON.stringify(q.sourceCitation) : null,
  }));
  
  return db.insert(questions).values(questionsToInsert);
}

export async function deleteQuizAndRelated(quizId: number, userId: number, isAdmin: boolean = false) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const quiz = await getQuizById(quizId);
  if (!quiz) throw new Error("Quiz not found");
  if (!isAdmin && quiz.createdBy !== userId) throw new Error("Only the quiz creator can remove this quiz.");
  
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

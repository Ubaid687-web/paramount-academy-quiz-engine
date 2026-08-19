import { int, longtext, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const quizzes = mysqlTable("quizzes", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  totalQuestions: int("totalQuestions").notNull(),
  isAiGenerated: int("isAiGenerated").default(0).notNull(), // 0 or 1
  createdBy: int("createdBy"), // userId for AI-generated quizzes
  sourceContent: longtext("sourceContent"), // Original content used for generation
  generationMetadata: text("generationMetadata"), // JSON: {difficulty, numQuestions, model, etc.}
  curriculumSetId: int("curriculumSetId"),
  scopeSnapshot: longtext("scopeSnapshot"), // Immutable JSON snapshot of source chapters/segments used for this quiz.
  difficultyProfile: varchar("difficultyProfile", { length: 50 }),
  publicationStatus: mysqlEnum("publicationStatus", ["draft", "in_review", "published", "archived"]).default("draft").notNull(),
  reviewedBy: int("reviewedBy"),
  reviewedAt: timestamp("reviewedAt"),
  publishedAt: timestamp("publishedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Quiz = typeof quizzes.$inferSelect;
export type InsertQuiz = typeof quizzes.$inferInsert;

export const questions = mysqlTable("questions", {
  id: int("id").autoincrement().primaryKey(),
  quizId: int("quizId").notNull(),
  questionNumber: int("questionNumber").notNull(),
  questionText: text("questionText").notNull(),
  optionA: text("optionA").notNull(),
  optionB: text("optionB").notNull(),
  optionC: text("optionC").notNull(),
  optionD: text("optionD").notNull(),
  correctAnswer: varchar("correctAnswer", { length: 1 }).notNull(), // A, B, C, or D
  sourceCitation: longtext("sourceCitation"), // Structured server-verified textbook citation JSON for generated questions.
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Question = typeof questions.$inferSelect;
export type InsertQuestion = typeof questions.$inferInsert;

export const quizAttempts = mysqlTable("quizAttempts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  quizId: int("quizId").notNull(),
  score: int("score").notNull(),
  totalQuestions: int("totalQuestions").notNull(),
  percentage: int("percentage").notNull(),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt").defaultNow().notNull(),
});

export type QuizAttempt = typeof quizAttempts.$inferSelect;
export type InsertQuizAttempt = typeof quizAttempts.$inferInsert;

export const userAnswers = mysqlTable("userAnswers", {
  id: int("id").autoincrement().primaryKey(),
  attemptId: int("attemptId").notNull(),
  questionId: int("questionId").notNull(),
  selectedAnswer: varchar("selectedAnswer", { length: 1 }).notNull(), // A, B, C, or D
  isCorrect: int("isCorrect").notNull(), // 0 or 1
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type UserAnswer = typeof userAnswers.$inferSelect;
export type InsertUserAnswer = typeof userAnswers.$inferInsert;

export const generationJobs = mysqlTable("generationJobs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  status: mysqlEnum("status", ["pending", "processing", "completed", "failed"]).default("pending").notNull(),
  contentText: longtext("contentText").notNull(),
  numQuestions: int("numQuestions").notNull(),
  difficulty: varchar("difficulty", { length: 50 }).default("balanced").notNull(), // balanced, easy, medium, hard
  curriculumSetId: int("curriculumSetId"),
  scopeTemplateId: int("scopeTemplateId"),
  scopeType: mysqlEnum("scopeType", ["ad_hoc", "single_chapter", "half_chapter", "multiple_chapters", "half_syllabus", "block"]).default("ad_hoc").notNull(),
  selectedChapterIds: text("selectedChapterIds"), // JSON array of selected chapter IDs.
  selectedSegmentIds: text("selectedSegmentIds"), // JSON array of selected chapter-segment IDs.
  sourceSnapshot: longtext("sourceSnapshot"), // Immutable JSON source snapshot created server-side.
  generatedQuizId: int("generatedQuizId"), // Reference to created quiz
  errorMessage: text("errorMessage"),
  progress: int("progress").default(0).notNull(), // 0-100
  retryAttempts: int("retryAttempts").default(0).notNull(),
  requestFingerprint: varchar("requestFingerprint", { length: 64 }),
  cacheHit: int("cacheHit").default(0).notNull(),
  promptSourceChars: int("promptSourceChars").default(0).notNull(),
  promptInputChars: int("promptInputChars").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type GenerationJob = typeof generationJobs.$inferSelect;
export type InsertGenerationJob = typeof generationJobs.$inferInsert;

// Private exact-request cache. Payloads never cross user boundaries and expire quickly so a
// teacher can recover an interrupted/repeated request without treating a prior paper as a new one.
export const generationResponseCaches = mysqlTable("generationResponseCaches", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  requestFingerprint: varchar("requestFingerprint", { length: 64 }).notNull(),
  generationMode: mysqlEnum("generationMode", ["mcq", "short", "long"]).notNull(),
  payload: longtext("payload").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  hitCount: int("hitCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("generationResponseCaches_user_request_unique").on(table.userId, table.requestFingerprint),
]);

export type GenerationResponseCache = typeof generationResponseCaches.$inferSelect;
export type InsertGenerationResponseCache = typeof generationResponseCaches.$inferInsert;

// Provider-level state is persisted because autoscaled instances cannot safely share in-memory
// circuit state. It suppresses known-wasteful calls during provider quota or rate-limit outages.
export const generationCircuitStates = mysqlTable("generationCircuitStates", {
  id: int("id").autoincrement().primaryKey(),
  serviceKey: varchar("serviceKey", { length: 100 }).notNull().unique(),
  state: mysqlEnum("state", ["closed", "open"]).default("closed").notNull(),
  failureType: varchar("failureType", { length: 80 }),
  openUntil: timestamp("openUntil"),
  lastFailureAt: timestamp("lastFailureAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type GenerationCircuitState = typeof generationCircuitStates.$inferSelect;
export type InsertGenerationCircuitState = typeof generationCircuitStates.$inferInsert;

// Assessment drafts support all approved question modes while keeping their source and paper-pattern
// provenance separate from the legacy MCQ-only quiz-attempt tables.
export const assessmentDrafts = mysqlTable("assessmentDrafts", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  assessmentMode: mysqlEnum("assessmentMode", ["mcq", "short", "long", "full_paper"]).notNull(),
  sourceState: mysqlEnum("sourceState", ["ready", "blocked"]).default("blocked").notNull(),
  curriculumSetId: int("curriculumSetId"),
  scopeSnapshot: longtext("scopeSnapshot"),
  paperPatternReferences: longtext("paperPatternReferences"),
  draftPayload: longtext("draftPayload").notNull(),
  totalMarks: int("totalMarks").notNull(),
  estimatedDurationMinutes: int("estimatedDurationMinutes"),
  status: mysqlEnum("status", ["draft", "in_review", "published", "archived"]).default("draft").notNull(),
  reviewWarnings: longtext("reviewWarnings"),
  createdBy: int("createdBy").notNull(),
  reviewedBy: int("reviewedBy"),
  reviewedAt: timestamp("reviewedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AssessmentDraft = typeof assessmentDrafts.$inferSelect;
export type InsertAssessmentDraft = typeof assessmentDrafts.$inferInsert;

// Programme Catalogue is the controlled entry point for every board / grade / subject combination.
// New programmes remain intake-only until a reviewed active curriculum edition exists and an
// administrator explicitly marks the programme ready for teacher use.
export const programmeCatalogues = mysqlTable("programmeCatalogues", {
  id: int("id").autoincrement().primaryKey(),
  board: varchar("board", { length: 50 }).notNull(),
  grade: varchar("grade", { length: 20 }).notNull(),
  subject: varchar("subject", { length: 100 }).notNull(),
  teacherLabel: varchar("teacherLabel", { length: 255 }).notNull(),
  status: mysqlEnum("status", ["intake_only", "ready"]).default("intake_only").notNull(),
  createdBy: int("createdBy").notNull(),
  activatedAt: timestamp("activatedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("programmeCatalogues_board_grade_subject_unique").on(table.board, table.grade, table.subject),
]);

export type ProgrammeCatalogue = typeof programmeCatalogues.$inferSelect;
export type InsertProgrammeCatalogue = typeof programmeCatalogues.$inferInsert;

// Paper sources are stored independently from textbooks. A paper-pattern claim can be used only
// after its specific user-supplied file has been extracted and activated here.
export const assessmentPatternSources = mysqlTable("assessmentPatternSources", {
  id: int("id").autoincrement().primaryKey(),
  board: varchar("board", { length: 50 }).default("FBISE").notNull(),
  grade: varchar("grade", { length: 20 }).notNull(),
  subject: varchar("subject", { length: 100 }).notNull(),
  sourceKind: mysqlEnum("sourceKind", ["model_paper", "past_paper"]).notNull(),
  academicYear: varchar("academicYear", { length: 20 }),
  storageKey: varchar("storageKey", { length: 512 }).notNull(),
  storageUrl: text("storageUrl").notNull(),
  originalFileName: varchar("originalFileName", { length: 255 }).notNull(),
  mimeType: varchar("mimeType", { length: 100 }).notNull(),
  extractedText: longtext("extractedText"),
  extractionStatus: mysqlEnum("extractionStatus", ["pending", "extracted", "needs_review", "failed"]).default("pending").notNull(),
  status: mysqlEnum("status", ["draft", "active", "archived"]).default("draft").notNull(),
  uploadedBy: int("uploadedBy").notNull(),
  activatedAt: timestamp("activatedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AssessmentPatternSource = typeof assessmentPatternSources.$inferSelect;
export type InsertAssessmentPatternSource = typeof assessmentPatternSources.$inferInsert;

// A reviewed profile records only the structure that an administrator confirmed from one exact
// user-supplied pattern-paper file. It is intentionally separate from the paper's extracted text:
// the profile guides assessment shape, while textbook sources remain the only question-content evidence.
export const assessmentPatternProfiles = mysqlTable("assessmentPatternProfiles", {
  id: int("id").autoincrement().primaryKey(),
  patternSourceId: int("patternSourceId").notNull().unique(),
  sectionAInstruction: text("sectionAInstruction"),
  sectionBInstruction: text("sectionBInstruction"),
  sectionCInstruction: text("sectionCInstruction"),
  mcqCount: int("mcqCount"),
  mcqMarksEach: int("mcqMarksEach"),
  shortOrPairCount: int("shortOrPairCount"),
  shortMarksEach: int("shortMarksEach"),
  longOrPairCount: int("longOrPairCount"),
  longMarksEach: int("longMarksEach"),
  totalMarks: int("totalMarks"),
  durationMinutes: int("durationMinutes"),
  orRule: text("orRule"),
  profileEvidenceNotes: longtext("profileEvidenceNotes"),
  reviewStatus: mysqlEnum("reviewStatus", ["draft", "reviewed", "needs_revision"]).default("draft").notNull(),
  reviewedBy: int("reviewedBy"),
  reviewedAt: timestamp("reviewedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AssessmentPatternProfile = typeof assessmentPatternProfiles.$inferSelect;
export type InsertAssessmentPatternProfile = typeof assessmentPatternProfiles.$inferInsert;

// Versioned FBISE curriculum material. A replacement textbook is represented by a new set;
// historical quiz drafts retain their curriculum and source snapshots.
export const curriculumSets = mysqlTable("curriculumSets", {
  id: int("id").autoincrement().primaryKey(),
  grade: varchar("grade", { length: 20 }).notNull(),
  subject: varchar("subject", { length: 100 }).notNull(),
  board: varchar("board", { length: 50 }).default("FBISE").notNull(),
  label: varchar("label", { length: 255 }).notNull(),
  editionLabel: varchar("editionLabel", { length: 255 }),
  status: mysqlEnum("status", ["draft", "active", "archived"]).default("draft").notNull(),
  replacesSetId: int("replacesSetId"),
  createdBy: int("createdBy").notNull(),
  activatedAt: timestamp("activatedAt"),
  archivedAt: timestamp("archivedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CurriculumSet = typeof curriculumSets.$inferSelect;
export type InsertCurriculumSet = typeof curriculumSets.$inferInsert;

// One uploaded source file. The binary belongs in managed object storage; extracted text is kept
// only so admins can review/segment it and the server can ground a draft in the selected evidence.
export const curriculumSources = mysqlTable("curriculumSources", {
  id: int("id").autoincrement().primaryKey(),
  curriculumSetId: int("curriculumSetId").notNull(),
  storageKey: varchar("storageKey", { length: 512 }).notNull(),
  storageUrl: text("storageUrl").notNull(),
  originalFileName: varchar("originalFileName", { length: 255 }).notNull(),
  mimeType: varchar("mimeType", { length: 100 }).notNull(),
  contentHash: varchar("contentHash", { length: 64 }),
  extractionStatus: mysqlEnum("extractionStatus", ["pending", "extracted", "needs_review", "failed"]).default("pending").notNull(),
  pageCount: int("pageCount"),
  extractedText: longtext("extractedText"),
  extractionError: text("extractionError"),
  uploadedBy: int("uploadedBy").notNull(),
  extractedAt: timestamp("extractedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CurriculumSource = typeof curriculumSources.$inferSelect;
export type InsertCurriculumSource = typeof curriculumSources.$inferInsert;

// Each extracted PDF page receives a deterministic text-quality assessment. Pages that appear
// weak remain visible to Portal Admin and must be explicitly reviewed before a draft edition
// can be activated. The page text itself remains in the source transcript; this table stores
// only quality signals and the human review decision.
export const curriculumSourcePageReviews = mysqlTable("curriculumSourcePageReviews", {
  id: int("id").autoincrement().primaryKey(),
  sourceId: int("sourceId").notNull(),
  pageNumber: int("pageNumber").notNull(),
  textCharacters: int("textCharacters").notNull(),
  meaningfulWords: int("meaningfulWords").notNull(),
  qualityScore: int("qualityScore").notNull(),
  reviewStatus: mysqlEnum("reviewStatus", ["clear", "needs_review", "reviewed"]).notNull(),
  reviewReasons: text("reviewReasons"),
  reviewedBy: int("reviewedBy"),
  reviewedAt: timestamp("reviewedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("curriculumSourcePageReviews_source_page_unique").on(table.sourceId, table.pageNumber),
]);

export type CurriculumSourcePageReview = typeof curriculumSourcePageReviews.$inferSelect;
export type InsertCurriculumSourcePageReview = typeof curriculumSourcePageReviews.$inferInsert;

// Scanned textbooks are processed in small, scheduled batches so an upload request is not held
// open while every page is rasterised and read. The source remains unavailable for chapter work
// until the linked job completes successfully.
export const ocrExtractionJobs = mysqlTable("ocrExtractionJobs", {
  id: int("id").autoincrement().primaryKey(),
  sourceId: int("sourceId").notNull().unique(),
  status: mysqlEnum("status", ["pending", "processing", "completed", "failed"]).default("pending").notNull(),
  nextPage: int("nextPage").default(1).notNull(),
  totalPages: int("totalPages").notNull(),
  attemptCount: int("attemptCount").default(0).notNull(),
  errorMessage: text("errorMessage"),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type OcrExtractionJob = typeof ocrExtractionJobs.$inferSelect;
export type InsertOcrExtractionJob = typeof ocrExtractionJobs.$inferInsert;

// One project-level heartbeat consumes queued OCR work. Its task UID is verified on every call;
// the worker never trusts a request body to select a source job.
export const ocrSchedulerStates = mysqlTable("ocrSchedulerStates", {
  id: int("id").primaryKey(),
  taskUid: varchar("taskUid", { length: 65 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type OcrSchedulerState = typeof ocrSchedulerStates.$inferSelect;

// Admin-reviewed chapter evidence, ordered within a versioned curriculum set.
export const curriculumChapters = mysqlTable("curriculumChapters", {
  id: int("id").autoincrement().primaryKey(),
  curriculumSetId: int("curriculumSetId").notNull(),
  sourceId: int("sourceId").notNull(),
  sequence: int("sequence").notNull(),
  code: varchar("code", { length: 50 }),
  title: varchar("title", { length: 255 }).notNull(),
  blockKey: varchar("blockKey", { length: 100 }),
  partKey: varchar("partKey", { length: 100 }),
  startPage: int("startPage"),
  endPage: int("endPage"),
  contentText: longtext("contentText").notNull(),
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CurriculumChapter = typeof curriculumChapters.$inferSelect;
export type InsertCurriculumChapter = typeof curriculumChapters.$inferInsert;

// A chapter can be split into two administrator-confirmed segments for half-chapter drafts.
export const curriculumChapterSegments = mysqlTable("curriculumChapterSegments", {
  id: int("id").autoincrement().primaryKey(),
  chapterId: int("chapterId").notNull(),
  sequence: int("sequence").notNull(),
  label: varchar("label", { length: 100 }).notNull(),
  startPage: int("startPage"),
  endPage: int("endPage"),
  startOffset: int("startOffset"),
  endOffset: int("endOffset"),
  contentText: longtext("contentText").notNull(),
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CurriculumChapterSegment = typeof curriculumChapterSegments.$inferSelect;
export type InsertCurriculumChapterSegment = typeof curriculumChapterSegments.$inferInsert;

// Reusable scope definitions for half-syllabus and full-block generation.
export const curriculumScopeTemplates = mysqlTable("curriculumScopeTemplates", {
  id: int("id").autoincrement().primaryKey(),
  curriculumSetId: int("curriculumSetId").notNull(),
  scopeKind: mysqlEnum("scopeKind", ["half_syllabus", "block"]).notNull(),
  label: varchar("label", { length: 255 }).notNull(),
  description: text("description"),
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CurriculumScopeTemplate = typeof curriculumScopeTemplates.$inferSelect;
export type InsertCurriculumScopeTemplate = typeof curriculumScopeTemplates.$inferInsert;

export const curriculumScopeTemplateChapters = mysqlTable("curriculumScopeTemplateChapters", {
  id: int("id").autoincrement().primaryKey(),
  scopeTemplateId: int("scopeTemplateId").notNull(),
  chapterId: int("chapterId").notNull(),
  sequence: int("sequence").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CurriculumScopeTemplateChapter = typeof curriculumScopeTemplateChapters.$inferSelect;
export type InsertCurriculumScopeTemplateChapter = typeof curriculumScopeTemplateChapters.$inferInsert;

// Quiz Sharing & Collaboration Tables
export const quizShares = mysqlTable("quizShares", {
  id: int("id").autoincrement().primaryKey(),
  quizId: int("quizId").notNull(),
  shareToken: varchar("shareToken", { length: 64 }).notNull().unique(), // Unique token for sharing
  createdBy: int("createdBy").notNull(), // User who created the share
  expiresAt: timestamp("expiresAt"), // Optional expiration
  maxUses: int("maxUses"), // Optional usage limit
  currentUses: int("currentUses").default(0).notNull(), // Track current uses
  isActive: int("isActive").default(1).notNull(), // 0 or 1
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type QuizShare = typeof quizShares.$inferSelect;
export type InsertQuizShare = typeof quizShares.$inferInsert;

export const quizCollaborators = mysqlTable("quizCollaborators", {
  id: int("id").autoincrement().primaryKey(),
  quizId: int("quizId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["viewer", "editor", "admin"]).default("viewer").notNull(),
  addedBy: int("addedBy").notNull(), // User who added collaborator
  addedAt: timestamp("addedAt").defaultNow().notNull(),
});

export type QuizCollaborator = typeof quizCollaborators.$inferSelect;
export type InsertQuizCollaborator = typeof quizCollaborators.$inferInsert;

export const sharedQuizAttempts = mysqlTable("sharedQuizAttempts", {
  id: int("id").autoincrement().primaryKey(),
  shareTokenId: int("shareTokenId").notNull(),
  userId: int("userId"), // Null if anonymous
  attemptId: int("attemptId").notNull(),
  accessedAt: timestamp("accessedAt").defaultNow().notNull(),
});

export type SharedQuizAttempt = typeof sharedQuizAttempts.$inferSelect;
export type InsertSharedQuizAttempt = typeof sharedQuizAttempts.$inferInsert;

// Spaced Repetition Tables
export const reviewSchedules = mysqlTable("reviewSchedules", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  quizId: int("quizId").notNull(),
  nextReviewDate: timestamp("nextReviewDate").notNull(),
  interval: int("interval").default(1).notNull(), // Days until next review
  easeFactor: int("easeFactor").default(2500).notNull(), // SM-2 ease factor (stored as int * 1000)
  repetitions: int("repetitions").default(0).notNull(), // Number of successful reviews
  lastReviewDate: timestamp("lastReviewDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ReviewSchedule = typeof reviewSchedules.$inferSelect;
export type InsertReviewSchedule = typeof reviewSchedules.$inferInsert;

export const reviewHistory = mysqlTable("reviewHistory", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  questionId: int("questionId").notNull(),
  reviewDate: timestamp("reviewDate").defaultNow().notNull(),
  result: mysqlEnum("result", ["again", "hard", "good", "easy"]).notNull(), // SM-2 ratings
  difficulty: int("difficulty").notNull(), // 1-5 user rating
  timeSpent: int("timeSpent"), // Milliseconds spent on question
});

export type ReviewHistory = typeof reviewHistory.$inferSelect;
export type InsertReviewHistory = typeof reviewHistory.$inferInsert;

export const userQuestionStats = mysqlTable("userQuestionStats", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  questionId: int("questionId").notNull(),
  correctCount: int("correctCount").default(0).notNull(),
  incorrectCount: int("incorrectCount").default(0).notNull(),
  lastReviewDate: timestamp("lastReviewDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserQuestionStats = typeof userQuestionStats.$inferSelect;
export type InsertUserQuestionStats = typeof userQuestionStats.$inferInsert;

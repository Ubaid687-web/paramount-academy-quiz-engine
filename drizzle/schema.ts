import { integer, pgTable, serial, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";

/**
 * Shared helper for "updatedAt" columns. MySQL's ON UPDATE CURRENT_TIMESTAMP has no Postgres
 * equivalent, so Drizzle updates the value in the application layer on every write.
 */
const updatedAtColumn = () =>
  timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date());

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = pgTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: serial("id").primaryKey(),
  /** OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: text("role").$type<"user" | "teacher" | "admin">().default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: updatedAtColumn(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Server-side session registry. The browser holds only a signed session token containing a random
 * session identifier; this table stores its non-reversible SHA-256 digest so logout and expiry are
 * enforceable without retaining a bearer token in the database.
 */
export const appSessions = pgTable("appSessions", {
  id: serial("id").primaryKey(),
  sessionIdHash: varchar("sessionIdHash", { length: 64 }).notNull().unique(),
  openId: varchar("openId", { length: 64 }).notNull(),
  appId: varchar("appId", { length: 128 }).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  revokedAt: timestamp("revokedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  lastSeenAt: updatedAtColumn(),
});

export type AppSession = typeof appSessions.$inferSelect;
export type InsertAppSession = typeof appSessions.$inferInsert;

/** Explicit Portal Admin-approved email addresses that receive Teacher access at first successful sign-in. */
export const teacherProvisionRules = pgTable("teacherProvisionRules", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  addedBy: integer("addedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TeacherProvisionRule = typeof teacherProvisionRules.$inferSelect;
export type InsertTeacherProvisionRule = typeof teacherProvisionRules.$inferInsert;

/** Portal Admin controls for optional secondary AI generation routing. This table has one row (id=1). */
export const generationProviderSettings = pgTable("generationProviderSettings", {
  id: integer("id").primaryKey(),
  geminiFallbackEnabled: integer("geminiFallbackEnabled").default(0).notNull(),
  updatedBy: integer("updatedBy"),
  updatedAt: updatedAtColumn(),
});

export type GenerationProviderSettings = typeof generationProviderSettings.$inferSelect;
export type InsertGenerationProviderSettings = typeof generationProviderSettings.$inferInsert;

/**
 * Explicit Portal Admin selections of previously published, textbook-cited questions that may
 * guide phrasing and layout only for one FBISE programme. The question itself remains separate
 * so an example never becomes new factual source material.
 */
export const generationStyleAnchorExamples = pgTable("generationStyleAnchorExamples", {
  id: serial("id").primaryKey(),
  board: varchar("board", { length: 50 }).default("FBISE").notNull(),
  grade: varchar("grade", { length: 20 }).notNull(),
  subject: varchar("subject", { length: 100 }).notNull(),
  questionId: integer("questionId").notNull().unique(),
  approvedBy: integer("approvedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type GenerationStyleAnchorExample = typeof generationStyleAnchorExamples.$inferSelect;
export type InsertGenerationStyleAnchorExample = typeof generationStyleAnchorExamples.$inferInsert;

export const quizzes = pgTable("quizzes", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  totalQuestions: integer("totalQuestions").notNull(),
  isAiGenerated: integer("isAiGenerated").default(0).notNull(), // 0 or 1
  createdBy: integer("createdBy"), // userId for AI-generated quizzes
  sourceContent: text("sourceContent"), // Original content used for generation
  generationMetadata: text("generationMetadata"), // JSON: {difficulty, numQuestions, model, etc.}
  curriculumSetId: integer("curriculumSetId"),
  scopeSnapshot: text("scopeSnapshot"), // Immutable JSON snapshot of source chapters/segments used for this quiz.
  difficultyProfile: varchar("difficultyProfile", { length: 50 }),
  publicationStatus: text("publicationStatus")
    .$type<"draft" | "in_review" | "published" | "archived">()
    .default("draft")
    .notNull(),
  reviewedBy: integer("reviewedBy"),
  reviewedAt: timestamp("reviewedAt"),
  publishedAt: timestamp("publishedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: updatedAtColumn(),
});

export type Quiz = typeof quizzes.$inferSelect;
export type InsertQuiz = typeof quizzes.$inferInsert;

export const questions = pgTable("questions", {
  id: serial("id").primaryKey(),
  quizId: integer("quizId").notNull(),
  questionNumber: integer("questionNumber").notNull(),
  questionText: text("questionText").notNull(),
  optionA: text("optionA").notNull(),
  optionB: text("optionB").notNull(),
  optionC: text("optionC").notNull(),
  optionD: text("optionD").notNull(),
  correctAnswer: varchar("correctAnswer", { length: 1 }).notNull(), // A, B, C, or D
  sourceCitation: text("sourceCitation"), // Structured server-verified textbook citation JSON for generated questions.
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Question = typeof questions.$inferSelect;
export type InsertQuestion = typeof questions.$inferInsert;

export const quizAttempts = pgTable("quizAttempts", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  quizId: integer("quizId").notNull(),
  score: integer("score").notNull(),
  totalQuestions: integer("totalQuestions").notNull(),
  percentage: integer("percentage").notNull(),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt").defaultNow().notNull(),
});

export type QuizAttempt = typeof quizAttempts.$inferSelect;
export type InsertQuizAttempt = typeof quizAttempts.$inferInsert;

export const userAnswers = pgTable("userAnswers", {
  id: serial("id").primaryKey(),
  attemptId: integer("attemptId").notNull(),
  questionId: integer("questionId").notNull(),
  selectedAnswer: varchar("selectedAnswer", { length: 1 }).notNull(), // A, B, C, or D
  isCorrect: integer("isCorrect").notNull(), // 0 or 1
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type UserAnswer = typeof userAnswers.$inferSelect;
export type InsertUserAnswer = typeof userAnswers.$inferInsert;

export const generationJobs = pgTable("generationJobs", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  status: text("status")
    .$type<"pending" | "processing" | "completed" | "failed">()
    .default("pending")
    .notNull(),
  contentText: text("contentText").notNull(),
  numQuestions: integer("numQuestions").notNull(),
  difficulty: varchar("difficulty", { length: 50 }).default("balanced").notNull(), // balanced, easy, medium, hard
  curriculumSetId: integer("curriculumSetId"),
  scopeTemplateId: integer("scopeTemplateId"),
  scopeType: text("scopeType")
    .$type<"ad_hoc" | "single_chapter" | "half_chapter" | "multiple_chapters" | "half_syllabus" | "block">()
    .default("ad_hoc")
    .notNull(),
  selectedChapterIds: text("selectedChapterIds"), // JSON array of selected chapter IDs.
  selectedSegmentIds: text("selectedSegmentIds"), // JSON array of selected chapter-segment IDs.
  sourceSnapshot: text("sourceSnapshot"), // Immutable JSON source snapshot created server-side.
  generatedQuizId: integer("generatedQuizId"), // Reference to created quiz
  quizSaveClaim: varchar("quizSaveClaim", { length: 64 }), // Short-lived server-side claim preventing duplicate quiz saves for one generation job.
  quizSaveClaimedAt: timestamp("quizSaveClaimedAt"),
  errorMessage: text("errorMessage"),
  progress: integer("progress").default(0).notNull(), // 0-100
  retryAttempts: integer("retryAttempts").default(0).notNull(),
  generationProvider: varchar("generationProvider", { length: 64 }).default("managed_llm").notNull(),
  fallbackUsed: integer("fallbackUsed").default(0).notNull(),
  primaryFailureType: varchar("primaryFailureType", { length: 80 }),
  managedRetryAttempts: integer("managedRetryAttempts").default(0).notNull(),
  geminiRetryAttempts: integer("geminiRetryAttempts").default(0).notNull(),
  requestFingerprint: varchar("requestFingerprint", { length: 64 }),
  cacheHit: integer("cacheHit").default(0).notNull(),
  promptSourceChars: integer("promptSourceChars").default(0).notNull(),
  promptInputChars: integer("promptInputChars").default(0).notNull(),
  providerInputTokens: integer("providerInputTokens"),
  providerOutputTokens: integer("providerOutputTokens"),
  providerCachedTokens: integer("providerCachedTokens"),
  providerTotalTokens: integer("providerTotalTokens"),
  generationMode: text("generationMode").$type<"mcq" | "short" | "long">(),
  resultPayload: text("resultPayload"), // Server-validated generation result used for safe saving and PDF export.
  providerFailure: text("providerFailure"), // Private JSON: provider, status, classification, retry/circuit facts. Never shown to teachers.
  printableState: text("printableState"), // Private resumable printable-batch state. Never exposed as a completed paper.
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
  retentionExpiresAt: timestamp("retentionExpiresAt"), // Transient request artifacts are redacted after the documented retention window.
});

export type GenerationJob = typeof generationJobs.$inferSelect;
export type InsertGenerationJob = typeof generationJobs.$inferInsert;

// Private exact-request cache. Payloads never cross user boundaries and expire quickly so a
// teacher can recover an interrupted/repeated request without treating a prior paper as a new one.
export const generationResponseCaches = pgTable("generationResponseCaches", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  requestFingerprint: varchar("requestFingerprint", { length: 64 }).notNull(),
  generationMode: text("generationMode").$type<"mcq" | "short" | "long">().notNull(),
  payload: text("payload").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  hitCount: integer("hitCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: updatedAtColumn(),
}, (table) => [
  uniqueIndex("generationResponseCaches_user_request_unique").on(table.userId, table.requestFingerprint),
]);

export type GenerationResponseCache = typeof generationResponseCaches.$inferSelect;
export type InsertGenerationResponseCache = typeof generationResponseCaches.$inferInsert;

// Provider-level state is persisted because autoscaled instances cannot safely share in-memory
// circuit state. It suppresses known-wasteful calls during provider quota or rate-limit outages.
export const generationCircuitStates = pgTable("generationCircuitStates", {
  id: serial("id").primaryKey(),
  serviceKey: varchar("serviceKey", { length: 100 }).notNull().unique(),
  state: text("state").$type<"closed" | "open">().default("closed").notNull(),
  failureType: varchar("failureType", { length: 80 }),
  openUntil: timestamp("openUntil"),
  lastFailureAt: timestamp("lastFailureAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: updatedAtColumn(),
});

export type GenerationCircuitState = typeof generationCircuitStates.$inferSelect;
export type InsertGenerationCircuitState = typeof generationCircuitStates.$inferInsert;

// Assessment drafts support all approved question modes while keeping their source and paper-pattern
// provenance separate from the legacy MCQ-only quiz-attempt tables.
export const assessmentDrafts = pgTable("assessmentDrafts", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  assessmentMode: text("assessmentMode").$type<"mcq" | "short" | "long" | "full_paper">().notNull(),
  sourceState: text("sourceState").$type<"ready" | "blocked">().default("blocked").notNull(),
  curriculumSetId: integer("curriculumSetId"),
  scopeSnapshot: text("scopeSnapshot"),
  paperPatternReferences: text("paperPatternReferences"),
  draftPayload: text("draftPayload").notNull(),
  totalMarks: integer("totalMarks").notNull(),
  estimatedDurationMinutes: integer("estimatedDurationMinutes"),
  status: text("status")
    .$type<"draft" | "in_review" | "published" | "archived">()
    .default("draft")
    .notNull(),
  reviewWarnings: text("reviewWarnings"),
  createdBy: integer("createdBy").notNull(),
  reviewedBy: integer("reviewedBy"),
  reviewedAt: timestamp("reviewedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: updatedAtColumn(),
});

export type AssessmentDraft = typeof assessmentDrafts.$inferSelect;
export type InsertAssessmentDraft = typeof assessmentDrafts.$inferInsert;

// Programme Catalogue is the controlled entry point for every board / grade / subject combination.
// New programmes remain intake-only until a reviewed active curriculum edition exists and an
// administrator explicitly marks the programme ready for teacher use.
export const programmeCatalogues = pgTable("programmeCatalogues", {
  id: serial("id").primaryKey(),
  board: varchar("board", { length: 50 }).notNull(),
  grade: varchar("grade", { length: 20 }).notNull(),
  subject: varchar("subject", { length: 100 }).notNull(),
  teacherLabel: varchar("teacherLabel", { length: 255 }).notNull(),
  status: text("status").$type<"intake_only" | "ready">().default("intake_only").notNull(),
  createdBy: integer("createdBy").notNull(),
  activatedAt: timestamp("activatedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: updatedAtColumn(),
}, (table) => [
  uniqueIndex("programmeCatalogues_board_grade_subject_unique").on(table.board, table.grade, table.subject),
]);

export type ProgrammeCatalogue = typeof programmeCatalogues.$inferSelect;
export type InsertProgrammeCatalogue = typeof programmeCatalogues.$inferInsert;

// Paper sources are stored independently from textbooks. A paper-pattern claim can be used only
// after its specific user-supplied file has been extracted and activated here.
export const assessmentPatternSources = pgTable("assessmentPatternSources", {
  id: serial("id").primaryKey(),
  board: varchar("board", { length: 50 }).default("FBISE").notNull(),
  grade: varchar("grade", { length: 20 }).notNull(),
  subject: varchar("subject", { length: 100 }).notNull(),
  sourceKind: text("sourceKind").$type<"model_paper" | "past_paper">().notNull(),
  academicYear: varchar("academicYear", { length: 20 }),
  timelineOrder: integer("timelineOrder"), // Required for past papers by the application; lowest value is the oldest supplied reference.
  timelineLabel: varchar("timelineLabel", { length: 255 }), // Optional supplied session, shift, or paper label; never inferred.
  storageKey: varchar("storageKey", { length: 512 }).notNull(),
  storageUrl: text("storageUrl").notNull(),
  originalFileName: varchar("originalFileName", { length: 255 }).notNull(),
  mimeType: varchar("mimeType", { length: 100 }).notNull(),
  extractedText: text("extractedText"),
  extractionStatus: text("extractionStatus")
    .$type<"pending" | "extracted" | "needs_review" | "failed">()
    .default("pending")
    .notNull(),
  status: text("status").$type<"draft" | "active" | "archived">().default("draft").notNull(),
  // Student access is an independent Portal Admin publication decision. An active source can guide
  // generation without being downloadable by learners.
  studentLibraryStatus: text("studentLibraryStatus")
    .$type<"hidden" | "published">()
    .default("hidden")
    .notNull(),
  studentPublishedBy: integer("studentPublishedBy"),
  studentPublishedAt: timestamp("studentPublishedAt"),
  uploadedBy: integer("uploadedBy").notNull(),
  activatedAt: timestamp("activatedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: updatedAtColumn(),
}, (table) => [
  uniqueIndex("assessmentPatternSources_programme_timeline_unique").on(table.board, table.grade, table.subject, table.timelineOrder),
]);

export type AssessmentPatternSource = typeof assessmentPatternSources.$inferSelect;
export type InsertAssessmentPatternSource = typeof assessmentPatternSources.$inferInsert;

// A reviewed profile records only the structure that an administrator confirmed from one exact
// user-supplied pattern-paper file. It is intentionally separate from the paper's extracted text:
// the profile guides assessment shape, while textbook sources remain the only question-content evidence.
export const assessmentPatternProfiles = pgTable("assessmentPatternProfiles", {
  id: serial("id").primaryKey(),
  patternSourceId: integer("patternSourceId").notNull().unique(),
  sectionAInstruction: text("sectionAInstruction"),
  sectionBInstruction: text("sectionBInstruction"),
  sectionCInstruction: text("sectionCInstruction"),
  mcqCount: integer("mcqCount"),
  mcqMarksEach: integer("mcqMarksEach"),
  shortOrPairCount: integer("shortOrPairCount"),
  shortMarksEach: integer("shortMarksEach"),
  longOrPairCount: integer("longOrPairCount"),
  longMarksEach: integer("longMarksEach"),
  totalMarks: integer("totalMarks"),
  durationMinutes: integer("durationMinutes"),
  orRule: text("orRule"),
  profileEvidenceNotes: text("profileEvidenceNotes"),
  reviewStatus: text("reviewStatus")
    .$type<"draft" | "reviewed" | "needs_revision">()
    .default("draft")
    .notNull(),
  reviewedBy: integer("reviewedBy"),
  reviewedAt: timestamp("reviewedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: updatedAtColumn(),
});

export type AssessmentPatternProfile = typeof assessmentPatternProfiles.$inferSelect;
export type InsertAssessmentPatternProfile = typeof assessmentPatternProfiles.$inferInsert;

// Versioned FBISE curriculum material. A replacement textbook is represented by a new set;
// historical quiz drafts retain their curriculum and source snapshots.
export const curriculumSets = pgTable("curriculumSets", {
  id: serial("id").primaryKey(),
  grade: varchar("grade", { length: 20 }).notNull(),
  subject: varchar("subject", { length: 100 }).notNull(),
  board: varchar("board", { length: 50 }).default("FBISE").notNull(),
  label: varchar("label", { length: 255 }).notNull(),
  editionLabel: varchar("editionLabel", { length: 255 }),
  status: text("status").$type<"draft" | "active" | "archived">().default("draft").notNull(),
  replacesSetId: integer("replacesSetId"),
  createdBy: integer("createdBy").notNull(),
  activatedAt: timestamp("activatedAt"),
  archivedAt: timestamp("archivedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: updatedAtColumn(),
});

export type CurriculumSet = typeof curriculumSets.$inferSelect;
export type InsertCurriculumSet = typeof curriculumSets.$inferInsert;

// One uploaded source file. The binary belongs in managed object storage; extracted text is kept
// only so admins can review/segment it and the server can ground a draft in the selected evidence.
export const curriculumSources = pgTable("curriculumSources", {
  id: serial("id").primaryKey(),
  curriculumSetId: integer("curriculumSetId").notNull(),
  storageKey: varchar("storageKey", { length: 512 }).notNull(),
  storageUrl: text("storageUrl").notNull(),
  originalFileName: varchar("originalFileName", { length: 255 }).notNull(),
  mimeType: varchar("mimeType", { length: 100 }).notNull(),
  contentHash: varchar("contentHash", { length: 64 }),
  extractionStatus: text("extractionStatus")
    .$type<"pending" | "extracted" | "needs_review" | "failed">()
    .default("pending")
    .notNull(),
  pageCount: integer("pageCount"),
  extractedText: text("extractedText"),
  extractionError: text("extractionError"),
  uploadedBy: integer("uploadedBy").notNull(),
  extractedAt: timestamp("extractedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: updatedAtColumn(),
});

export type CurriculumSource = typeof curriculumSources.$inferSelect;
export type InsertCurriculumSource = typeof curriculumSources.$inferInsert;

/**
 * Database-backed completion claim for a signed resumable textbook transfer. Chunk bytes and their
 * browser-recovery state remain in managed storage; this compact record supplies the atomic state
 * transition that object storage alone cannot guarantee across autoscaled application instances.
 */
export const curriculumUploadClaims = pgTable("curriculumUploadClaims", {
  id: serial("id").primaryKey(),
  uploadId: varchar("uploadId", { length: 36 }).notNull().unique(),
  userId: integer("userId").notNull(),
  curriculumSetId: integer("curriculumSetId").notNull(),
  status: text("status").$type<"open" | "processing" | "completed">().default("open").notNull(),
  sourceId: integer("sourceId"),
  expiresAt: timestamp("expiresAt").notNull(),
  claimedAt: timestamp("claimedAt"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: updatedAtColumn(),
});

export type CurriculumUploadClaim = typeof curriculumUploadClaims.$inferSelect;

/**
 * Server-authoritative cursor for a protected resumable textbook transfer. It stores transfer
 * metadata only; the textbook bytes remain in managed storage under the receipt keys below.
 */
export const curriculumUploadSessions = pgTable("curriculumUploadSessions", {
  id: serial("id").primaryKey(),
  uploadId: varchar("uploadId", { length: 36 }).notNull().unique(),
  userId: integer("userId").notNull(),
  curriculumSetId: integer("curriculumSetId").notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileSize: integer("fileSize").notNull(),
  status: text("status")
    .$type<"active" | "finalizing" | "completed" | "retired">()
    .default("active")
    .notNull(),
  receivedBytes: integer("receivedBytes").default(0).notNull(),
  nextChunkIndex: integer("nextChunkIndex").default(0).notNull(),
  revision: integer("revision").default(0).notNull(),
  sourceId: integer("sourceId"),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: updatedAtColumn(),
});

export type CurriculumUploadSession = typeof curriculumUploadSessions.$inferSelect;

/**
 * One immutable receipt per chunk index. A unique receipt makes duplicate delivery harmless and
 * prevents conflicting bytes from being committed for the same position.
 */
export const curriculumUploadChunkReceipts = pgTable("curriculumUploadChunkReceipts", {
  id: serial("id").primaryKey(),
  uploadId: varchar("uploadId", { length: 36 }).notNull(),
  chunkIndex: integer("chunkIndex").notNull(),
  sha256: varchar("sha256", { length: 64 }).notNull(),
  byteLength: integer("byteLength").notNull(),
  storageKey: varchar("storageKey", { length: 512 }).notNull(),
  status: text("status").$type<"pending" | "committed">().default("pending").notNull(),
  leaseExpiresAt: timestamp("leaseExpiresAt").notNull(),
  committedAt: timestamp("committedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: updatedAtColumn(),
}, (table) => [
  uniqueIndex("curriculumUploadChunkReceipts_upload_chunk_unique").on(table.uploadId, table.chunkIndex),
]);

export type CurriculumUploadChunkReceipt = typeof curriculumUploadChunkReceipts.$inferSelect;

// Each extracted PDF page receives a deterministic text-quality assessment. Pages that appear
// weak remain visible to Portal Admin and must be explicitly reviewed before a draft edition
// can be activated. The page text itself remains in the source transcript; this table stores
// only quality signals and the human review decision.
export const curriculumSourcePageReviews = pgTable("curriculumSourcePageReviews", {
  id: serial("id").primaryKey(),
  sourceId: integer("sourceId").notNull(),
  pageNumber: integer("pageNumber").notNull(),
  textCharacters: integer("textCharacters").notNull(),
  meaningfulWords: integer("meaningfulWords").notNull(),
  qualityScore: integer("qualityScore").notNull(),
  reviewStatus: text("reviewStatus").$type<"clear" | "needs_review" | "reviewed">().notNull(),
  reviewReasons: text("reviewReasons"),
  reviewedBy: integer("reviewedBy"),
  reviewedAt: timestamp("reviewedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: updatedAtColumn(),
}, (table) => [
  uniqueIndex("curriculumSourcePageReviews_source_page_unique").on(table.sourceId, table.pageNumber),
]);

export type CurriculumSourcePageReview = typeof curriculumSourcePageReviews.$inferSelect;
export type InsertCurriculumSourcePageReview = typeof curriculumSourcePageReviews.$inferInsert;

// Scanned textbooks are processed in small, scheduled batches so an upload request is not held
// open while every page is rasterised and read. The source remains unavailable for chapter work
// until the linked job completes successfully.
export const ocrExtractionJobs = pgTable("ocrExtractionJobs", {
  id: serial("id").primaryKey(),
  sourceId: integer("sourceId").notNull().unique(),
  status: text("status")
    .$type<"pending" | "processing" | "completed" | "failed">()
    .default("pending")
    .notNull(),
  nextPage: integer("nextPage").default(1).notNull(),
  totalPages: integer("totalPages").notNull(),
  attemptCount: integer("attemptCount").default(0).notNull(),
  errorMessage: text("errorMessage"),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: updatedAtColumn(),
});

export type OcrExtractionJob = typeof ocrExtractionJobs.$inferSelect;
export type InsertOcrExtractionJob = typeof ocrExtractionJobs.$inferInsert;

// One project-level heartbeat consumes queued OCR work. Its task UID is verified on every call;
// the worker never trusts a request body to select a source job.
export const ocrSchedulerStates = pgTable("ocrSchedulerStates", {
  id: integer("id").primaryKey(),
  taskUid: varchar("taskUid", { length: 65 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: updatedAtColumn(),
});

export type OcrSchedulerState = typeof ocrSchedulerStates.$inferSelect;

// Admin-reviewed chapter evidence, ordered within a versioned curriculum set.
export const curriculumChapters = pgTable("curriculumChapters", {
  id: serial("id").primaryKey(),
  curriculumSetId: integer("curriculumSetId").notNull(),
  sourceId: integer("sourceId").notNull(),
  sequence: integer("sequence").notNull(),
  code: varchar("code", { length: 50 }),
  title: varchar("title", { length: 255 }).notNull(),
  blockKey: varchar("blockKey", { length: 100 }),
  partKey: varchar("partKey", { length: 100 }),
  startPage: integer("startPage"),
  endPage: integer("endPage"),
  contentText: text("contentText").notNull(),
  isActive: integer("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: updatedAtColumn(),
});

export type CurriculumChapter = typeof curriculumChapters.$inferSelect;
export type InsertCurriculumChapter = typeof curriculumChapters.$inferInsert;

// A chapter can be split into two administrator-confirmed segments for half-chapter drafts.
export const curriculumChapterSegments = pgTable("curriculumChapterSegments", {
  id: serial("id").primaryKey(),
  chapterId: integer("chapterId").notNull(),
  sequence: integer("sequence").notNull(),
  label: varchar("label", { length: 100 }).notNull(),
  startPage: integer("startPage"),
  endPage: integer("endPage"),
  startOffset: integer("startOffset"),
  endOffset: integer("endOffset"),
  contentText: text("contentText").notNull(),
  isActive: integer("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: updatedAtColumn(),
});

export type CurriculumChapterSegment = typeof curriculumChapterSegments.$inferSelect;
export type InsertCurriculumChapterSegment = typeof curriculumChapterSegments.$inferInsert;

// Reusable scope definitions for half-syllabus and full-block generation.
export const curriculumScopeTemplates = pgTable("curriculumScopeTemplates", {
  id: serial("id").primaryKey(),
  curriculumSetId: integer("curriculumSetId").notNull(),
  scopeKind: text("scopeKind").$type<"half_syllabus" | "block">().notNull(),
  label: varchar("label", { length: 255 }).notNull(),
  description: text("description"),
  isActive: integer("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: updatedAtColumn(),
});

export type CurriculumScopeTemplate = typeof curriculumScopeTemplates.$inferSelect;
export type InsertCurriculumScopeTemplate = typeof curriculumScopeTemplates.$inferInsert;

export const curriculumScopeTemplateChapters = pgTable("curriculumScopeTemplateChapters", {
  id: serial("id").primaryKey(),
  scopeTemplateId: integer("scopeTemplateId").notNull(),
  chapterId: integer("chapterId").notNull(),
  sequence: integer("sequence").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CurriculumScopeTemplateChapter = typeof curriculumScopeTemplateChapters.$inferSelect;
export type InsertCurriculumScopeTemplateChapter = typeof curriculumScopeTemplateChapters.$inferInsert;

// Quiz Sharing & Collaboration Tables
export const quizShares = pgTable("quizShares", {
  id: serial("id").primaryKey(),
  quizId: integer("quizId").notNull(),
  shareToken: varchar("shareToken", { length: 64 }).notNull().unique(), // Unique token for sharing
  createdBy: integer("createdBy").notNull(), // User who created the share
  expiresAt: timestamp("expiresAt"), // Optional expiration
  maxUses: integer("maxUses"), // Optional usage limit
  currentUses: integer("currentUses").default(0).notNull(), // Track current uses
  isActive: integer("isActive").default(1).notNull(), // 0 or 1
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type QuizShare = typeof quizShares.$inferSelect;
export type InsertQuizShare = typeof quizShares.$inferInsert;

export const quizCollaborators = pgTable("quizCollaborators", {
  id: serial("id").primaryKey(),
  quizId: integer("quizId").notNull(),
  userId: integer("userId").notNull(),
  role: text("role").$type<"viewer" | "editor" | "admin">().default("viewer").notNull(),
  addedBy: integer("addedBy").notNull(), // User who added collaborator
  addedAt: timestamp("addedAt").defaultNow().notNull(),
});

export type QuizCollaborator = typeof quizCollaborators.$inferSelect;
export type InsertQuizCollaborator = typeof quizCollaborators.$inferInsert;

export const sharedQuizAttempts = pgTable("sharedQuizAttempts", {
  id: serial("id").primaryKey(),
  shareTokenId: integer("shareTokenId").notNull(),
  userId: integer("userId"), // Null if anonymous
  attemptId: integer("attemptId").notNull(),
  accessedAt: timestamp("accessedAt").defaultNow().notNull(),
});

export type SharedQuizAttempt = typeof sharedQuizAttempts.$inferSelect;
export type InsertSharedQuizAttempt = typeof sharedQuizAttempts.$inferInsert;

// Spaced Repetition Tables
export const reviewSchedules = pgTable("reviewSchedules", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  quizId: integer("quizId").notNull(),
  nextReviewDate: timestamp("nextReviewDate").notNull(),
  interval: integer("interval").default(1).notNull(), // Days until next review
  easeFactor: integer("easeFactor").default(2500).notNull(), // SM-2 ease factor (stored as int * 1000)
  repetitions: integer("repetitions").default(0).notNull(), // Number of successful reviews
  lastReviewDate: timestamp("lastReviewDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: updatedAtColumn(),
});

export type ReviewSchedule = typeof reviewSchedules.$inferSelect;
export type InsertReviewSchedule = typeof reviewSchedules.$inferInsert;

export const reviewHistory = pgTable("reviewHistory", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  questionId: integer("questionId").notNull(),
  reviewDate: timestamp("reviewDate").defaultNow().notNull(),
  result: text("result").$type<"again" | "hard" | "good" | "easy">().notNull(), // SM-2 ratings
  difficulty: integer("difficulty").notNull(), // 1-5 user rating
  timeSpent: integer("timeSpent"), // Milliseconds spent on question
});

export type ReviewHistory = typeof reviewHistory.$inferSelect;
export type InsertReviewHistory = typeof reviewHistory.$inferInsert;

export const userQuestionStats = pgTable("userQuestionStats", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  questionId: integer("questionId").notNull(),
  correctCount: integer("correctCount").default(0).notNull(),
  incorrectCount: integer("incorrectCount").default(0).notNull(),
  lastReviewDate: timestamp("lastReviewDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: updatedAtColumn(),
});

export type UserQuestionStats = typeof userQuestionStats.$inferSelect;
export type InsertUserQuestionStats = typeof userQuestionStats.$inferInsert;

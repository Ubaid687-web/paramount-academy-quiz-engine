import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

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
  sourceContent: text("sourceContent"), // Original content used for generation
  generationMetadata: text("generationMetadata"), // JSON: {difficulty, numQuestions, model, etc.}
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
  contentText: text("contentText").notNull(),
  numQuestions: int("numQuestions").notNull(),
  difficulty: varchar("difficulty", { length: 50 }).default("balanced").notNull(), // balanced, easy, medium, hard
  generatedQuizId: int("generatedQuizId"), // Reference to created quiz
  errorMessage: text("errorMessage"),
  progress: int("progress").default(0).notNull(), // 0-100
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type GenerationJob = typeof generationJobs.$inferSelect;
export type InsertGenerationJob = typeof generationJobs.$inferInsert;

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
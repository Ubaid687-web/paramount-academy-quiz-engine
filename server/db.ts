import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, InsertQuiz, InsertQuizAttempt, InsertUserAnswer, quizzes, questions, quizAttempts, userAnswers, generationJobs, InsertGenerationJob, GenerationJob } from "../drizzle/schema";
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

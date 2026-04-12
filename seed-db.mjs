import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load MCQs from JSON
const mcqsPath = '/tmp/mcqs_parsed.json';
const mcqsData = JSON.parse(fs.readFileSync(mcqsPath, 'utf-8'));

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

async function seedDatabase() {
  try {
    // Parse the database URL
    const url = new URL(dbUrl);
    const connection = await mysql.createConnection({
      host: url.hostname,
      user: url.username,
      password: url.password,
      database: url.pathname.slice(1),
      port: url.port || 3306,
      ssl: { rejectUnauthorized: false },
    });

    console.log('Connected to database');

    // Create a quiz
    const quizTitle = 'AI Fundamentals - Complete MCQ Collection';
    const quizDescription = 'Comprehensive MCQ collection covering AI basics, Turing Test, thinking approaches, foundations, history, types, capabilities, and applications.';
    
    const [quizResult] = await connection.execute(
      'INSERT INTO quizzes (title, description, totalQuestions) VALUES (?, ?, ?)',
      [quizTitle, quizDescription, mcqsData.length]
    );
    
    const quizId = quizResult.insertId;
    console.log(`Created quiz with ID: ${quizId}`);

    // Insert questions
    let insertedCount = 0;
    for (const mcq of mcqsData) {
      await connection.execute(
        'INSERT INTO questions (quizId, questionNumber, questionText, optionA, optionB, optionC, optionD, correctAnswer) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          quizId,
          mcq.id,
          mcq.question,
          mcq.options.A,
          mcq.options.B,
          mcq.options.C,
          mcq.options.D,
          mcq.correctAnswer,
        ]
      );
      insertedCount++;
      if (insertedCount % 50 === 0) {
        console.log(`Inserted ${insertedCount}/${mcqsData.length} questions`);
      }
    }

    console.log(`Successfully inserted all ${insertedCount} questions`);
    await connection.end();
    console.log('Database seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();

import { z } from "zod";
import { invokeLLM } from "./_core/llm";
import { createGenerationJob, updateGenerationJob, createAiGeneratedQuiz, addQuestionsToQuiz } from "./db";
import type { InsertGenerationJob } from "../drizzle/schema";

const MCQ_GENERATION_PROMPT = `You are an advanced academic assessment designer. Generate high-quality multiple-choice questions based on the provided content.

CRITICAL GUIDELINES:
1. Create CONCEPTUAL questions that test understanding, not memory
2. Avoid "According to the passage..." style questions
3. Make questions analytical, application-based, and scenario-based where possible
4. Use realistic distractors based on common misconceptions
5. Ensure each question requires genuine thinking to answer

DIFFICULTY DISTRIBUTION:
- 30% Easy (basic understanding)
- 40% Medium (conceptual + application)
- 30% Hard (analytical, tricky, multi-step reasoning)

For each question, provide:
- Clear, professional wording
- 4 plausible options (A, B, C, D)
- Correct answer
- Brief explanation of why it's correct

Return ONLY valid JSON in this exact format:
{
  "mcqs": [
    {
      "question": "...",
      "options": {
        "A": "...",
        "B": "...",
        "C": "...",
        "D": "..."
      },
      "answer": "A",
      "explanation": "...",
      "difficulty": "easy|medium|hard"
    }
  ]
}`;

interface GeneratedMCQ {
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  answer: "A" | "B" | "C" | "D";
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
}

export async function generateMCQsFromContent(
  userId: number,
  contentText: string,
  numQuestions: number = 10,
  difficulty: "balanced" | "easy" | "medium" | "hard" = "balanced"
): Promise<{ jobId: number; mcqs: GeneratedMCQ[] }> {
  // Create a generation job record
  const job = await createGenerationJob({
    userId,
    contentText,
    numQuestions,
    difficulty,
    status: "processing",
    progress: 10,
  });

  try {
    // Update progress
    await updateGenerationJob(job.id, { progress: 20 });

    // Build the prompt with difficulty instructions
    let difficultyInstruction = "";
    if (difficulty === "easy") {
      difficultyInstruction = "\nFocus on EASY questions (70% easy, 20% medium, 10% hard).";
    } else if (difficulty === "medium") {
      difficultyInstruction = "\nFocus on MEDIUM questions (20% easy, 60% medium, 20% hard).";
    } else if (difficulty === "hard") {
      difficultyInstruction = "\nFocus on HARD questions (10% easy, 20% medium, 70% hard).";
    }

    const systemPrompt = MCQ_GENERATION_PROMPT + difficultyInstruction;

    const userPrompt = `Generate exactly ${numQuestions} high-quality MCQs based on this content:

${contentText}

Remember:
- Each question must require thinking and understanding
- Use realistic, plausible distractors
- Cover different parts of the content
- No repeated concepts
- Professional, exam-ready language`;

    // Call LLM to generate MCQs
    await updateGenerationJob(job.id, { progress: 40 });

    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "mcq_generation",
          strict: true,
          schema: {
            type: "object",
            properties: {
              mcqs: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    question: { type: "string" },
                    options: {
                      type: "object",
                      properties: {
                        A: { type: "string" },
                        B: { type: "string" },
                        C: { type: "string" },
                        D: { type: "string" },
                      },
                      required: ["A", "B", "C", "D"],
                    },
                    answer: { type: "string", enum: ["A", "B", "C", "D"] },
                    explanation: { type: "string" },
                    difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
                  },
                  required: ["question", "options", "answer", "explanation", "difficulty"],
                },
              },
            },
            required: ["mcqs"],
          },
        },
      },
    });

    await updateGenerationJob(job.id, { progress: 80 });

    // Parse the response
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No content in LLM response");
    }

    const parsed = JSON.parse(typeof content === "string" ? content : JSON.stringify(content));
    const mcqs: GeneratedMCQ[] = parsed.mcqs || [];

    // Validate MCQs
    if (!Array.isArray(mcqs) || mcqs.length === 0) {
      throw new Error("No MCQs generated");
    }

    // Ensure we have the right number of questions
    const finalMcqs = mcqs.slice(0, numQuestions);

    await updateGenerationJob(job.id, { progress: 100, status: "completed" });

    return {
      jobId: job.id,
      mcqs: finalMcqs,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    await updateGenerationJob(job.id, {
      status: "failed",
      errorMessage,
    });
    throw error;
  }
}

export async function saveGeneratedQuizToDatabase(
  userId: number,
  jobId: number,
  quizTitle: string,
  mcqs: any[],
  sourceContent: string,
  difficulty: string
) {
  try {
    // Create the quiz
    const quiz = await createAiGeneratedQuiz({
      title: quizTitle,
      description: `AI-generated quiz with ${mcqs.length} questions`,
      totalQuestions: mcqs.length,
      isAiGenerated: 1,
      createdBy: userId,
      sourceContent,
      generationMetadata: JSON.stringify({
        difficulty,
        numQuestions: mcqs.length,
        model: "gpt-4",
        generatedAt: new Date().toISOString(),
      }),
    });

    // Add questions to the quiz
    await addQuestionsToQuiz(quiz.id, mcqs);

    // Update the generation job with the quiz ID
    await updateGenerationJob(jobId, { generatedQuizId: quiz.id });

    return quiz;
  } catch (error) {
    await updateGenerationJob(jobId, {
      status: "failed",
      errorMessage: error instanceof Error ? error.message : "Failed to save quiz",
    });
    throw error;
  }
}

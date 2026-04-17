import { z } from "zod";
import { invokeLLM } from "./_core/llm";
import { createGenerationJob, updateGenerationJob, createAiGeneratedQuiz, addQuestionsToQuiz } from "./db";
import { analyzeContent, chunkContent } from "./contentAnalyzer";
import type { InsertGenerationJob } from "../drizzle/schema";

const MCQ_GENERATION_PROMPT = `You are an advanced academic assessment designer and subject-matter expert. Your task is to generate high-quality multiple-choice questions that test deep understanding and conceptual mastery, NOT surface-level recall.

=== CRITICAL PRINCIPLES ===

1. AVOID REFERENCE-BASED QUESTIONS:
   - Do NOT ask: "According to the passage...", "The text states...", "Which of the following is mentioned..."
   - Instead: Test understanding of concepts, principles, and applications
   - Use content as context for understanding, not as direct answer source

2. FOCUS ON CONCEPTUAL UNDERSTANDING:
   - Ask WHY things work, not WHAT they are
   - Test application of concepts to new situations
   - Require synthesis and analysis, not recall
   - Create questions that reveal true understanding

3. CREATE SCENARIO-BASED QUESTIONS:
   - Present realistic situations where concepts apply
   - Ask students to identify correct application or prediction
   - Include multi-step reasoning where appropriate
   - Make distractors represent common misconceptions

4. REALISTIC DISTRACTORS:
   - Each wrong option must be plausible to someone with partial understanding
   - Represent common mistakes or misconceptions
   - Avoid obviously wrong answers
   - Use similar terminology to create confusion only for those who lack understanding

5. ENSURE GENUINE THINKING:
   - Every question must require understanding to answer correctly
   - Cannot be answered by guessing or pattern matching
   - Requires application of knowledge, not memorization

=== DIFFICULTY DISTRIBUTION ===
- 30% Easy: Basic understanding, straightforward application
- 40% Medium: Conceptual understanding, application to similar contexts
- 30% Hard: Analytical thinking, application to novel situations, multi-step reasoning

=== QUESTION TYPES TO INCLUDE ===
1. Concept application: "If X happens, what would be the result?"
2. Scenario-based: "In this situation, which principle applies?"
3. Comparative: "How do X and Y differ in their effects?"
4. Problem-solving: "To achieve Y, which approach would be best?"
5. Analysis: "What is the underlying reason for X?"

=== OUTPUT FORMAT ===
Return ONLY valid JSON:
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
  numQuestions?: number,
  difficulty: "balanced" | "easy" | "medium" | "hard" = "balanced"
): Promise<{ jobId: number; mcqs: GeneratedMCQ[]; analysis: any }> {
  // Analyze content to determine optimal MCQ count
  const analysis = analyzeContent(contentText);
  const finalNumQuestions = numQuestions || analysis.recommendedQuestions.optimal;

  // Create a generation job record
  const job = await createGenerationJob({
    userId,
    contentText,
    numQuestions: finalNumQuestions,
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

    const userPrompt = `Generate exactly ${finalNumQuestions} high-quality MCQs based on this content. Analyze the ENTIRE content thoroughly to extract key concepts and principles.

CONTENT ANALYSIS:
- Total Words: ${analysis.totalWords}
- Complexity: ${analysis.complexity}
- Key Topics: ${analysis.keyTopics.join(", ")}
- Estimated Reading Time: ${analysis.estimatedReadingTime} minutes

CONTENT:
${contentText}

REQUIREMENTS:
- Each question must require genuine understanding and thinking
- Use realistic, plausible distractors based on common misconceptions
- Cover different parts and aspects of the content
- Ensure comprehensive coverage of all key topics and sections
- No repeated concepts or similar questions
- Professional, exam-ready language
- Focus on conceptual understanding, NOT direct recall
- Include scenario-based and application questions where appropriate
- Generate questions that span the entire content, not just the beginning`;

    // Call LLM to generate MCQs
    // Chunk content for better analysis
    const chunks = chunkContent(contentText, Math.min(5, Math.ceil(finalNumQuestions / 10)));
    
    await updateGenerationJob(job.id, { progress: 40 });

    // Add chunk information to prompt for better coverage
    const chunkInfo = chunks.map((chunk, i) => `[Section ${i + 1}]: ${chunk.substring(0, 500)}...`).join("\n\n");
    const enhancedPrompt = userPrompt + `\n\nCONTENT SECTIONS FOR COVERAGE:\n${chunkInfo}`;

    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: enhancedPrompt },
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
    const finalMcqs = mcqs.slice(0, finalNumQuestions);

    await updateGenerationJob(job.id, { progress: 100, status: "completed" });

    return {
      jobId: job.id,
      mcqs: finalMcqs,
      analysis: {
        totalWords: analysis.totalWords,
        complexity: analysis.complexity,
        recommendedQuestions: analysis.recommendedQuestions,
        generatedQuestions: finalNumQuestions,
        keyTopics: analysis.keyTopics,
      },
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

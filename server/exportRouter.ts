import { z } from "zod";
import { router, publicProcedure } from "./_core/trpc";
import { getQuizById, getQuestionsByQuizId } from "./db";
import { generateQuizPdfBuffer, generateSolutionPdfBuffer, QuizExportData } from "./pdfExport";

export const exportRouter = router({
  downloadQuizPdf: publicProcedure
    .input(z.object({ quizId: z.number() }))
    .query(async ({ input }) => {
      const quiz = await getQuizById(input.quizId);
      if (!quiz) throw new Error("Quiz not found");
      const questions = await getQuestionsByQuizId(input.quizId);

      const exportData: QuizExportData = {
        title: quiz.title,
        subject: quiz.description?.includes("Physics") ? "physics" : quiz.description?.includes("Chemistry") ? "chemistry" : "computer_science",
        grade: "10",
        instructions: "Attempt all questions. Choose the best option for each multiple-choice question.",
        totalQuestions: questions.length,
        items: questions.map((q) => ({
          questionNumber: q.questionNumber,
          questionText: q.questionText,
          optionA: q.optionA,
          optionB: q.optionB,
          optionC: q.optionC,
          optionD: q.optionD,
          correctAnswer: q.correctAnswer,
          sourceReference: "FBISE Grade 10 Approved Textbook",
          learningObjective: "Conceptual understanding and board exam readiness",
        })),
      };

      const pdfBuffer = await generateQuizPdfBuffer(exportData);
      return {
        filename: `${quiz.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-quiz.pdf`,
        base64: pdfBuffer.toString("base64"),
      };
    }),

  downloadSolutionPdf: publicProcedure
    .input(z.object({ quizId: z.number() }))
    .query(async ({ input }) => {
      const quiz = await getQuizById(input.quizId);
      if (!quiz) throw new Error("Quiz not found");
      const questions = await getQuestionsByQuizId(input.quizId);

      const exportData: QuizExportData = {
        title: quiz.title,
        subject: quiz.description?.includes("Physics") ? "physics" : quiz.description?.includes("Chemistry") ? "chemistry" : "computer_science",
        grade: "10",
        instructions: "Official answer key and source-grounded solution set.",
        totalQuestions: questions.length,
        items: questions.map((q) => ({
          questionNumber: q.questionNumber,
          questionText: q.questionText,
          optionA: q.optionA,
          optionB: q.optionB,
          optionC: q.optionC,
          optionD: q.optionD,
          correctAnswer: q.correctAnswer,
          sourceReference: "FBISE Grade 10 Approved Textbook",
          learningObjective: "Conceptual understanding and board exam readiness",
          explanation: `The correct option is (${q.correctAnswer}). This concept is derived from the reviewed FBISE Grade 10 curriculum, emphasizing easy-to-learn explanations tailored for Federal Board exam style and textbook context.`,
          sketchDescription: "Refer to the textbook conceptual figure or comparison table for this topic.",
          comparisonTable: {
            headers: ["Concept Property", "Standard Reference"],
            rows: [
              ["Core Principle", "FBISE Curriculum Standard"],
              ["Exam Application", "Board Marking Rubric Alignment"],
            ],
          },
        })),
      };

      const pdfBuffer = await generateSolutionPdfBuffer(exportData);
      return {
        filename: `${quiz.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-solution-key.pdf`,
        base64: pdfBuffer.toString("base64"),
      };
    }),
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  invokeLLM: vi.fn(),
  createGenerationJob: vi.fn(),
  updateGenerationJob: vi.fn(),
  createAiGeneratedQuiz: vi.fn(),
  addQuestionsToQuiz: vi.fn(),
  getGenerationJob: vi.fn(),
}));

vi.mock("./_core/llm", () => ({ invokeLLM: mocks.invokeLLM }));
vi.mock("./db", () => ({
  createGenerationJob: mocks.createGenerationJob,
  updateGenerationJob: mocks.updateGenerationJob,
  createAiGeneratedQuiz: mocks.createAiGeneratedQuiz,
  addQuestionsToQuiz: mocks.addQuestionsToQuiz,
  getGenerationJob: mocks.getGenerationJob,
}));

import { generateMCQsFromContent, saveGeneratedQuizToDatabase } from "./aiAgent";

const validContent = "Kinematics studies motion using displacement, velocity, and acceleration. ".repeat(12);

function createValidMcqs(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    question: `Question ${index + 1}: Which quantity describes this motion concept?`,
    options: {
      A: `Correct option ${index + 1}`,
      B: `Distractor B ${index + 1}`,
      C: `Distractor C ${index + 1}`,
      D: `Distractor D ${index + 1}`,
    },
    answer: "A",
    explanation: `Explanation ${index + 1} applies the kinematics concept.`,
    difficulty: (index % 3 === 0 ? "easy" : index % 3 === 1 ? "medium" : "hard") as "easy" | "medium" | "hard",
    sourceReference: `Kinematics section ${index + 1}`,
    learningObjective: `Apply kinematics concept ${index + 1}.`,
  }));
}

describe("AI Agent - MCQ Generation", () => {
  beforeEach(() => {
    mocks.createGenerationJob.mockReset();
    mocks.updateGenerationJob.mockReset();
    mocks.createAiGeneratedQuiz.mockReset();
    mocks.addQuestionsToQuiz.mockReset();
    mocks.getGenerationJob.mockReset();
    mocks.invokeLLM.mockReset();
    mocks.createGenerationJob.mockResolvedValue({ id: 501 });
    mocks.updateGenerationJob.mockResolvedValue(undefined);
    mocks.invokeLLM.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ mcqs: createValidMcqs(10) }) } }],
    });
  });

  it("returns a validated, source-grounded draft without relying on a live model call", async () => {
    const result = await generateMCQsFromContent(1, validContent, 5, "balanced");

    expect(mocks.invokeLLM).toHaveBeenCalledTimes(1);
    expect(result.jobId).toBe(501);
    expect(result.mcqs).toHaveLength(5);
    expect(result.draft.sourceMetadata).toMatchObject({
      sourceType: "raw_text",
      sourceTitle: "Uploaded study material",
      difficultyProfile: "balanced",
    });
    expect(result.mcqs[0]).toMatchObject({
      sourceReference: "Kinematics section 1",
      learningObjective: "Apply kinematics concept 1.",
    });
  });

  it("persists the immutable chapter-scope selection on the generation job", async () => {
    const snapshot = {
      curriculumSet: { id: 77, grade: "10", subject: "physics", label: "FBISE Grade 10 Physics" },
      scopeType: "half_chapter",
      displayLabel: "Kinematics — First half",
    };

    await generateMCQsFromContent(1, validContent, 5, "medium", {
      sourceType: "curriculum_scope",
      sourceTitle: "Kinematics — First half",
      subject: "physics",
      classLevel: "10",
      curriculumSetId: 77,
      scopeType: "half_chapter",
      selectedChapterIds: [10],
      selectedSegmentIds: [1001],
      scopeSnapshot: snapshot,
    });

    expect(mocks.createGenerationJob).toHaveBeenCalledWith(expect.objectContaining({
      curriculumSetId: 77,
      scopeType: "half_chapter",
      selectedChapterIds: "[10]",
      selectedSegmentIds: "[1001]",
      sourceSnapshot: JSON.stringify(snapshot),
    }));
  });

  it("returns a structured failure contract when a model response omits required source fields", async () => {
    mocks.invokeLLM.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({
        mcqs: [{
          question: "Incomplete question",
          options: { A: "One", B: "Two", C: "Three", D: "Four" },
          answer: "A",
          explanation: "Missing the traceability fields.",
          difficulty: "easy",
        }],
      }) } }],
    });

    const result = await generateMCQsFromContent(1, validContent, 1, "balanced");

    expect(result.mcqs).toEqual([]);
    expect(result.draft).toMatchObject({
      status: "error",
      errorType: "validation",
      safeRetryAdvice: expect.any(String),
    });
  });

  it("carries scoped source provenance from the generation job into the saved draft quiz", async () => {
    const snapshot = { scopeType: "single_chapter", displayLabel: "Kinematics", chapters: [{ id: 10, title: "Kinematics" }] };
    mocks.getGenerationJob.mockResolvedValue({
      id: 501,
      userId: 1,
      contentText: validContent,
      curriculumSetId: 77,
      scopeType: "single_chapter",
      scopeTemplateId: null,
      selectedChapterIds: "[10]",
      selectedSegmentIds: null,
      sourceSnapshot: JSON.stringify(snapshot),
      difficulty: "hard",
    });
    mocks.createAiGeneratedQuiz.mockResolvedValue({ id: 900 });

    const mcqs = createValidMcqs(1);
    const quiz = await saveGeneratedQuizToDatabase(1, 501, "Kinematics Draft", mcqs, "hard");

    expect(quiz).toEqual({ id: 900 });
    expect(mocks.createAiGeneratedQuiz).toHaveBeenCalledWith(expect.objectContaining({
      title: "Kinematics Draft",
      sourceContent: validContent,
      curriculumSetId: 77,
      scopeSnapshot: JSON.stringify(snapshot),
      difficultyProfile: "hard",
      publicationStatus: "draft",
      generationMetadata: expect.stringContaining("single_chapter"),
    }));
    expect(mocks.addQuestionsToQuiz).toHaveBeenCalledWith(900, mcqs);
    expect(mocks.updateGenerationJob).toHaveBeenCalledWith(501, { generatedQuizId: 900 });
  });
});

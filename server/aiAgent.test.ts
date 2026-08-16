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
  const concepts = ["displacement", "velocity", "acceleration", "distance", "time", "speed", "momentum", "force", "mass", "inertia"];
  const facets = ["definition", "formula", "application", "unit", "relationship", "calculation", "comparison", "function", "measurement", "inference"];
  return Array.from({ length: count }, (_, index) => ({
    question: `Question ${index + 1}: Which statement best describes ${concepts[index]} in motion?`,
    options: {
      A: `Correct option ${index + 1}`,
      B: `Distractor B ${index + 1}`,
      C: `Distractor C ${index + 1}`,
      D: `Distractor D ${index + 1}`,
    },
    answer: "A",
    explanation: `Explanation ${index + 1} applies the textbook meaning of ${concepts[index]}.`,
    difficulty: (index % 3 === 0 ? "easy" : index % 3 === 1 ? "medium" : "hard") as "easy" | "medium" | "hard",
    conceptKey: concepts[index],
    facetKey: facets[index],
    answerTarget: `${concepts[index]} textbook outcome`,
    sourceReference: `Kinematics — ${concepts[index]}`,
    learningObjective: `Explain the textbook meaning of ${concepts[index]}.`,
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
      conceptKey: "displacement",
      facetKey: "definition",
      answerTarget: "displacement textbook outcome",
      sourceReference: "Kinematics — displacement",
      learningObjective: "Explain the textbook meaning of displacement.",
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

  it("uses verified paper metadata only for FBISE-style guidance while keeping textbook material as factual evidence", async () => {
    await generateMCQsFromContent(1, validContent, 5, "balanced", {
      sourceType: "curriculum_scope",
      sourceTitle: "Kinematics",
      subject: "physics",
      paperPatternGuidance: [
        { sourceKind: "model_paper", academicYear: null },
        { sourceKind: "past_paper", academicYear: "2025" },
      ],
    });

    const systemPrompt = mocks.invokeLLM.mock.calls[0][0].messages[0].content as string;
    const prompt = mocks.invokeLLM.mock.calls[0][0].messages[1].content as string;
    expect(prompt).toContain("VERIFIED BOARD-PATTERN GUIDANCE");
    expect(prompt).toContain("model paper");
    expect(prompt).toContain("past paper 2025");
    expect(prompt).toContain("only examinable content boundary");
    expect(prompt).toContain("Do not use any analysis note as factual evidence");
    expect(prompt).toContain("concise FBISE-style wording");
    expect(systemPrompt).toMatch(/direct paper-ready/i);
    expect(systemPrompt).toContain("answer-shaped");
    expect(systemPrompt).toContain("four narrow option columns");
    expect(prompt).toContain("Do not write answer options as sentences of explanation");
    expect(prompt).toContain("conceptKey");
    expect(prompt).toContain("VERIFIED STYLE AND STRUCTURE EVIDENCE");
  });

  it("rejects a draft that rewords the same underlying concept within one paper", async () => {
    const repeated = createValidMcqs(2);
    repeated[1] = {
      ...repeated[1],
      conceptKey: "displacement",
      facetKey: "definition",
      answerTarget: "displacement textbook outcome",
      sourceReference: "Kinematics — displacement",
      learningObjective: "Explain the textbook meaning of displacement.",
    };
    mocks.invokeLLM.mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ mcqs: repeated }) } }] });

    const result = await generateMCQsFromContent(1, validContent, 2, "balanced");

    expect(result.draft).toMatchObject({ status: "error", errorType: "validation" });
    expect(result.draft.message).toMatch(/repeats an answer target|assessable facet/i);
  });

  it("rejects a new draft that collides with a concept saved for the same source scope", async () => {
    const result = await generateMCQsFromContent(1, validContent, 1, "balanced", {
      sourceType: "curriculum_scope",
      sourceTitle: "Kinematics",
      priorQuestionHistory: [{
        conceptKey: "displacement",
        facetKey: "definition",
        answerTarget: "displacement textbook outcome",
        question: "Which quantity describes this motion concept?",
        sourceReference: "Kinematics — displacement",
        learningObjective: "Explain the textbook meaning of displacement.",
        assessmentMode: "mcq",
      }],
    });

    expect(result.draft).toMatchObject({ status: "error", errorType: "validation" });
    expect(result.draft.message).toMatch(/earlier saved paper/i);
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

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  invokeLLM: vi.fn(),
  invokeGenerationProvider: vi.fn(),
  createGenerationJob: vi.fn(),
  updateGenerationJob: vi.fn(),
  createAiGeneratedQuiz: vi.fn(),
  addQuestionsToQuiz: vi.fn(),
  getGenerationJob: vi.fn(),
  getCachedGenerationResponse: vi.fn(),
  putCachedGenerationResponse: vi.fn(),
}));

vi.mock("./_core/llm", () => ({ invokeLLM: mocks.invokeLLM }));
vi.mock("./generationProvider", () => ({ invokeGenerationProvider: mocks.invokeGenerationProvider }));
vi.mock("./db", () => ({
  createGenerationJob: mocks.createGenerationJob,
  updateGenerationJob: mocks.updateGenerationJob,
  createAiGeneratedQuiz: mocks.createAiGeneratedQuiz,
  addQuestionsToQuiz: mocks.addQuestionsToQuiz,
  getGenerationJob: mocks.getGenerationJob,
  getCachedGenerationResponse: mocks.getCachedGenerationResponse,
  putCachedGenerationResponse: mocks.putCachedGenerationResponse,
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
    mocks.getCachedGenerationResponse.mockReset();
    mocks.putCachedGenerationResponse.mockReset();
    mocks.invokeLLM.mockReset();
    mocks.invokeGenerationProvider.mockReset();
    mocks.createGenerationJob.mockResolvedValue({ id: 501 });
    mocks.updateGenerationJob.mockResolvedValue(undefined);
    mocks.getCachedGenerationResponse.mockResolvedValue(undefined);
    mocks.putCachedGenerationResponse.mockResolvedValue(undefined);
    mocks.invokeLLM.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ mcqs: createValidMcqs(10) }) } }],
    });
    mocks.invokeGenerationProvider.mockResolvedValue({
      response: { choices: [{ message: { content: JSON.stringify({ mcqs: createValidMcqs(10) }) } }] },
      telemetry: { provider: "managed_llm", fallbackUsed: false, primaryFailureType: null, managedRetryAttempts: 0, geminiRetryAttempts: 0 },
    });
  });

  it("returns a validated, source-grounded draft without relying on a live model call", async () => {
    const result = await generateMCQsFromContent(1, validContent, 5, "balanced");

    expect(mocks.invokeGenerationProvider).toHaveBeenCalledTimes(1);
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

  it("passes the same source-safe style anchor into the provider-neutral generation request", async () => {
    await generateMCQsFromContent(1, validContent, 2, "balanced", {
      sourceType: "raw_text",
      sourceTitle: "Teacher material",
      styleAnchor: { fingerprint: "style-v1", approvedExampleCount: 0, instruction: "\n\nSHARED FBISE STYLE ANCHOR — FORMAT ONLY\nNever copy an example." },
    });

    const request = mocks.invokeGenerationProvider.mock.calls[0]?.[0];
    expect(request.messages[0].content).toContain("SHARED FBISE STYLE ANCHOR");
    expect(request.messages[0].content).toContain("Never copy an example");
  });

  it("reuses an exact recent private draft without calling the model again", async () => {
    mocks.getCachedGenerationResponse.mockResolvedValue({
      payload: JSON.stringify({
        mcqs: createValidMcqs(2),
        analysis: { totalWords: 20, complexity: "moderate", recommendedQuestions: { minimum: 1, optimal: 2, maximum: 5 }, generatedQuestions: 2, keyTopics: ["motion"] },
        draft: { status: "success", quiz: { title: "Cached draft" }, qualityChecks: {} },
      }),
    });
    mocks.createGenerationJob.mockResolvedValue({ id: 502 });

    const result = await generateMCQsFromContent(1, validContent, 2, "balanced");

    expect(result.jobId).toBe(502);
    expect(result.mcqs).toHaveLength(2);
    expect(result.draft.cache).toMatchObject({ reused: true });
    expect(mocks.invokeGenerationProvider).not.toHaveBeenCalled();
  });

  it("delegates an open managed quota circuit to the provider router so Gemini can take over", async () => {
    mocks.createGenerationJob.mockResolvedValue({ id: 503 });
    mocks.invokeGenerationProvider.mockResolvedValue({
      response: { choices: [{ message: { content: JSON.stringify({ mcqs: createValidMcqs(10) }) } }] },
      telemetry: { provider: "gemini_byok", fallbackUsed: true, primaryFailureType: "quota_exhaustion", managedRetryAttempts: 0, geminiRetryAttempts: 0 },
    });

    const result = await generateMCQsFromContent(1, validContent, 5, "balanced");

    expect(result.jobId).toBe(503);
    expect(result.draft.status).toBe("success");
    expect(result.providerTelemetry).toMatchObject({ provider: "gemini_byok", fallbackUsed: true, primaryFailureType: "quota_exhaustion" });
    expect(mocks.invokeGenerationProvider).toHaveBeenCalledTimes(1);
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

  it("hydrates every approved-scope MCQ with a server-verified textbook citation", async () => {
    mocks.invokeGenerationProvider.mockResolvedValue({ response: {
      choices: [{ message: { content: JSON.stringify({
        mcqs: createValidMcqs(5).map((mcq) => ({
          ...mcq,
          sourceCitation: { citationKey: "chapter:10", textAnchor: "displacement, velocity, and acceleration" },
        })),
      }) } }],
    }, telemetry: { provider: "managed_llm", fallbackUsed: false, primaryFailureType: null, managedRetryAttempts: 0, geminiRetryAttempts: 0 } });

    const result = await generateMCQsFromContent(1, validContent, 5, "balanced", {
      sourceType: "curriculum_scope",
      sourceTitle: "Kinematics",
      curriculumSetId: 77,
      scopeType: "single_chapter",
      scopeSnapshot: {
        curriculumSet: { id: 77 },
        chapters: [{ id: 10, code: "Unit 1", title: "Kinematics", startPage: 1, endPage: 14 }],
        segments: [],
      },
    });

    expect(result.mcqs[0].sourceCitation).toMatchObject({
      citationKey: "chapter:10",
      curriculumSetId: 77,
      chapterId: 10,
      chapterTitle: "Kinematics",
      startPage: 1,
      endPage: 14,
      textAnchor: "displacement, velocity, and acceleration",
    });
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

    const systemPrompt = mocks.invokeGenerationProvider.mock.calls[0][0].messages[0].content as string;
    const prompt = mocks.invokeGenerationProvider.mock.calls[0][0].messages[1].content as string;
    expect(systemPrompt).toContain("SHARED FBISE STYLE ANCHOR");
    expect(systemPrompt).toContain("model paper");
    expect(systemPrompt).toContain("past paper 2025");
    expect(systemPrompt).toContain("sole authority for every answer");
    expect(systemPrompt).toContain("Never copy or paraphrase an example");
    expect(systemPrompt).toMatch(/direct paper-ready/i);
    expect(systemPrompt).toContain("answer-shaped");
    expect(systemPrompt).toContain("four narrow option columns");
    expect(prompt).toContain("Do not write answer options as sentences of explanation");
    expect(prompt).toContain("conceptKey");
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
    mocks.invokeGenerationProvider.mockResolvedValue({ response: { choices: [{ message: { content: JSON.stringify({ mcqs: repeated }) } }] }, telemetry: { provider: "managed_llm", fallbackUsed: false, primaryFailureType: null, managedRetryAttempts: 0, geminiRetryAttempts: 0 } });

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
    mocks.invokeGenerationProvider.mockResolvedValue({ response: {
      choices: [{ message: { content: JSON.stringify({
        mcqs: [{
          question: "Incomplete question",
          options: { A: "One", B: "Two", C: "Three", D: "Four" },
          answer: "A",
          explanation: "Missing the traceability fields.",
          difficulty: "easy",
        }],
      }) } }],
    }, telemetry: { provider: "managed_llm", fallbackUsed: false, primaryFailureType: null, managedRetryAttempts: 0, geminiRetryAttempts: 0 } });

    const result = await generateMCQsFromContent(1, validContent, 1, "balanced");

    expect(result.mcqs).toEqual([]);
    expect(result.draft).toMatchObject({
      status: "error",
      errorType: "validation",
      safeRetryAdvice: expect.any(String),
    });
  });

  it("carries scoped source provenance from the generation job into the saved draft quiz", async () => {
    const snapshot = {
      curriculumSet: { id: 77 },
      scopeType: "single_chapter",
      displayLabel: "Kinematics",
      chapters: [{ id: 10, code: "Unit 1", title: "Kinematics", startPage: 1, endPage: 14 }],
      segments: [],
    };
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

    const mcqs = createValidMcqs(1).map((mcq) => ({
      ...mcq,
      sourceCitation: {
        citationKey: "chapter:10",
        curriculumSetId: 77,
        chapterId: 10,
        chapterCode: "Unit 1",
        chapterTitle: "Kinematics",
        segmentId: null,
        segmentLabel: null,
        startPage: 1,
        endPage: 14,
        textAnchor: "displacement, velocity, and acceleration",
      },
    }));
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

  it("classifies upstream quota and billing exhaustion errors with clear recovery advice", async () => {
    mocks.invokeGenerationProvider.mockRejectedValue(new Error("LLM invoke failed: 412 Precondition Failed – {\"code\":9,\"message\":\"your account has hit a usage exhausted\"}"));

    const result = await generateMCQsFromContent(1, validContent, 5, "balanced");

    expect(result.draft.status).toBe("error");
    expect(result.draft.errorType).toBe("quota_exhaustion");
    expect(result.draft.safeRetryAdvice).toContain("usage quota limit or billing pause");
    expect(result.draft.safeRetryAdvice).not.toContain("Check the source text for readability");
    expect(mocks.updateGenerationJob).toHaveBeenCalledWith(501, expect.objectContaining({ primaryFailureType: "quota_exhaustion" }));
  });

  it("keeps an exhausted transient rate limit distinct from account quota exhaustion", async () => {
    mocks.invokeGenerationProvider.mockRejectedValue(new Error("LLM invoke failed: 429 Too Many Requests – temporary rate limit"));

    const result = await generateMCQsFromContent(1, validContent, 5, "balanced");

    expect(result.draft.errorType).toBe("transient_rate_limit");
    expect(result.draft.safeRetryAdvice).toContain("retried automatically");
    expect(result.draft.safeRetryAdvice).not.toContain("billing pause");
  });

  it("keeps a Gemini 429 resource-exhaustion response distinct from account quota exhaustion", async () => {
    mocks.invokeGenerationProvider.mockRejectedValue(new Error("Gemini fallback invoke failed: 429 Too Many Requests – RESOURCE_EXHAUSTED quota temporarily exceeded"));

    const result = await generateMCQsFromContent(1, validContent, 5, "balanced");

    expect(result.draft.errorType).toBe("transient_rate_limit");
    expect(result.draft.safeRetryAdvice).toContain("retried automatically");
    expect(result.draft.safeRetryAdvice).not.toContain("billing pause");
  });

  it("records retry attempts in the generation job telemetry when attempts occur", async () => {
    mocks.invokeGenerationProvider.mockResolvedValueOnce({
      response: { choices: [{ message: { content: JSON.stringify({ mcqs: createValidMcqs(5) }) } }] },
      telemetry: { provider: "managed_llm", fallbackUsed: false, primaryFailureType: null, managedRetryAttempts: 2, geminiRetryAttempts: 0 },
    });

    await generateMCQsFromContent(1, validContent, 5, "balanced");

    expect(mocks.updateGenerationJob).toHaveBeenCalledWith(
      501,
      expect.objectContaining({ retryAttempts: 2 })
    );
  });

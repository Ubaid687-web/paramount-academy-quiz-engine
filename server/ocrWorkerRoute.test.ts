import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticateRequest: vi.fn(),
  getOcrSchedulerState: vi.fn(),
  requeueStaleOcrExtractionJobs: vi.fn(),
  claimNextOcrExtractionJob: vi.fn(),
  getCurriculumSource: vi.fn(),
  updateOcrExtractionJob: vi.fn(),
  updateCurriculumSourceExtraction: vi.fn(),
  replaceCurriculumSourcePageReviews: vi.fn(),
  extractOcrBatch: vi.fn(),
  notifyOwnerException: vi.fn(),
}));

vi.mock("./_core/sdk", () => ({ sdk: { authenticateRequest: mocks.authenticateRequest } }));
vi.mock("./db", () => ({
  getOcrSchedulerState: mocks.getOcrSchedulerState,
  requeueStaleOcrExtractionJobs: mocks.requeueStaleOcrExtractionJobs,
  claimNextOcrExtractionJob: mocks.claimNextOcrExtractionJob,
  getCurriculumSource: mocks.getCurriculumSource,
  updateOcrExtractionJob: mocks.updateOcrExtractionJob,
  updateCurriculumSourceExtraction: mocks.updateCurriculumSourceExtraction,
  replaceCurriculumSourcePageReviews: mocks.replaceCurriculumSourcePageReviews,
}));
vi.mock("./ocrQuality", () => ({ assessExtractedSourceQuality: vi.fn() }));
vi.mock("./ocrPipeline", () => ({
  extractOcrBatch: mocks.extractOcrBatch,
  mergeOcrTranscript: vi.fn(),
  parseOcrTranscript: vi.fn(),
}));
vi.mock("./ownerExceptionAlerts", () => ({ notifyOwnerException: mocks.notifyOwnerException }));

import { runOcrExtractionWorker } from "./ocrWorkerRoute";

function responseStub() {
  const response = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
  return response;
}

describe("OCR worker terminal exception alerts", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.authenticateRequest.mockResolvedValue({ isCron: true, taskUid: "ocr-task" });
    mocks.getOcrSchedulerState.mockResolvedValue({ taskUid: "ocr-task" });
    mocks.claimNextOcrExtractionJob.mockResolvedValue({ id: 12, sourceId: 8, attemptCount: 3, nextPage: 1, totalPages: 20 });
    mocks.getCurriculumSource.mockResolvedValue({ id: 8, storageKey: "curricula/8/source.pdf", mimeType: "application/pdf", extractedText: "" });
    mocks.extractOcrBatch.mockRejectedValue(new Error("OCR engine unavailable"));
  });

  it("notifies the owner once when an OCR job reaches its terminal retry limit", async () => {
    const response = responseStub();

    await runOcrExtractionWorker({} as never, response as never);

    expect(mocks.updateOcrExtractionJob).toHaveBeenCalledWith(12, expect.objectContaining({ status: "failed" }));
    expect(mocks.updateCurriculumSourceExtraction).toHaveBeenCalledWith(8, expect.objectContaining({ extractionStatus: "failed" }));
    expect(mocks.notifyOwnerException).toHaveBeenCalledTimes(1);
    expect(mocks.notifyOwnerException).toHaveBeenCalledWith(expect.objectContaining({
      title: "Curriculum OCR failed after retries",
      content: expect.not.stringContaining("OCR engine unavailable"),
    }));
    expect(response.statusCode).toBe(200);
  });

  it("does not notify the owner while the worker has a recoverable retry remaining", async () => {
    mocks.claimNextOcrExtractionJob.mockResolvedValue({ id: 12, sourceId: 8, attemptCount: 2, nextPage: 1, totalPages: 20 });
    const response = responseStub();

    await runOcrExtractionWorker({} as never, response as never);

    expect(mocks.updateOcrExtractionJob).toHaveBeenCalledWith(12, expect.objectContaining({ status: "pending" }));
    expect(mocks.notifyOwnerException).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(500);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createHeartbeatJob: vi.fn(),
  getOcrSchedulerState: vi.fn(),
  saveOcrSchedulerState: vi.fn(),
}));

vi.mock("./_core/heartbeat", () => ({ createHeartbeatJob: mocks.createHeartbeatJob }));
vi.mock("./db", () => ({ getOcrSchedulerState: mocks.getOcrSchedulerState, saveOcrSchedulerState: mocks.saveOcrSchedulerState }));

import { ensureOcrScheduler } from "./ocrScheduler";

describe("OCR heartbeat scheduler", () => {
  beforeEach(() => {
    mocks.createHeartbeatJob.mockReset();
    mocks.getOcrSchedulerState.mockReset();
    mocks.saveOcrSchedulerState.mockReset();
  });

  it("reuses the stored project worker rather than creating a scheduler for every scanned upload", async () => {
    const state = { id: 1, taskUid: "task_existing" };
    mocks.getOcrSchedulerState.mockResolvedValue(state);

    await expect(ensureOcrScheduler("app_session_id=session")).resolves.toEqual(state);
    expect(mocks.createHeartbeatJob).not.toHaveBeenCalled();
  });

  it("creates a one-minute secure worker schedule with the authenticated admin session when no worker exists", async () => {
    mocks.getOcrSchedulerState.mockResolvedValue(undefined);
    mocks.createHeartbeatJob.mockResolvedValue({ taskUid: "task_new" });
    mocks.saveOcrSchedulerState.mockResolvedValue({ id: 1, taskUid: "task_new" });

    await expect(ensureOcrScheduler("app_session_id=session-token")).resolves.toEqual({ id: 1, taskUid: "task_new" });
    expect(mocks.createHeartbeatJob).toHaveBeenCalledWith(expect.objectContaining({
      name: "paramount-academy-ocr-worker",
      cron: "0 */1 * * * *",
      path: "/api/scheduled/ocr-extraction",
    }), "session-token");
  });
});

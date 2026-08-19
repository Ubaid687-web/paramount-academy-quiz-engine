import { parse as parseCookie } from "cookie";
import { COOKIE_NAME } from "@shared/const";
import { createHeartbeatJob } from "./_core/heartbeat";
import { getOcrSchedulerState, saveOcrSchedulerState } from "./db";

export async function ensureOcrScheduler(cookieHeader: string | undefined) {
  const existing = await getOcrSchedulerState();
  if (existing) return existing;
  const sessionToken = parseCookie(cookieHeader ?? "")[COOKIE_NAME] ?? "";
  if (!sessionToken) throw new Error("Your sign-in session is required to start the secure OCR worker. Please sign in again and retry the upload.");

  const job = await createHeartbeatJob({
    name: "paramount-academy-ocr-worker",
    cron: "0 */1 * * * *",
    path: "/api/scheduled/ocr-extraction",
    description: "Processes queued scanned-textbook OCR in small, reviewable batches.",
  }, sessionToken);
  return saveOcrSchedulerState(job.taskUid);
}

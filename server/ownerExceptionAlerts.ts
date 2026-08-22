import { notifyOwner } from "./_core/notification";

/**
 * Delivers a concise owner-only operational signal. Call only when a durable
 * workflow enters a new review or terminal-failure state; do not call from
 * retry loops, progress updates, or prompt/content handling.
 */
export async function notifyOwnerException(input: { title: string; content: string }) {
  try {
    const delivered = await notifyOwner(input);
    if (!delivered) console.warn("[Owner exception alert] Notification service did not accept the operational alert.");
    return delivered;
  } catch (error) {
    console.error("[Owner exception alert] Failed to deliver operational alert.", error);
    return false;
  }
}

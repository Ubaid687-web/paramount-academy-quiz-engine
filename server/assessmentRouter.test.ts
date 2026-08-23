import { describe, expect, it } from "vitest";
import type { TrpcContext } from "./_core/context";
import { appRouter } from "./routers";

function createAdminContext(): TrpcContext {
  return {
    user: { id: 7, openId: "assessment-admin", email: "admin@example.com", name: "Assessment Admin", loginMethod: "manus", role: "admin", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

const physicsScope = { subject: "physics" as const, scopeType: "single_chapter" as const, chapterIds: [10] };
const browserAuthoredShortDraft = {
  mode: "short" as const,
  title: "Browser-authored draft",
  estimatedDurationMinutes: 8,
  items: [{ kind: "short" as const, question: "State the concept.", expectedAnswer: "Browser answer.", markingGuide: ["Browser point"], difficulty: "easy" as const, marks: 2, sourceReference: "Any text", learningObjective: "State a concept." }],
};

describe("assessment router source governance", () => {
  it("keeps all assessment modes unavailable for a subject without an active approved textbook", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const availability = await caller.assessment.getAvailability({ subject: "unconfigured_subject" });
    expect(availability.textbookReady).toBe(false);
  });

  it("rejects browser-authored manual short-paper content even when a scope shape is supplied", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await expect(caller.assessment.saveDraft({ assessmentMode: "short", scope: physicsScope, payload: browserAuthoredShortDraft })).rejects.toThrow("Manual assessment composition is unavailable");
  });

  it("rejects browser-authored revision payloads rather than trusting a source-reference label", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await expect(caller.assessment.reviseDraft({ assessmentDraftId: 801, payload: browserAuthoredShortDraft })).rejects.toThrow("Manual assessment revision is unavailable");
  });
});

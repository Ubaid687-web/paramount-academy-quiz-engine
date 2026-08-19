import { describe, expect, it } from "vitest";
import { normalizeProvisionEmail, selectAutomaticSignInRole } from "./staffProvisioning";

describe("automatic teacher provisioning", () => {
  it("normalizes approved email addresses before comparing them", () => {
    expect(normalizeProvisionEmail("  Danish.Butt@Example.com ")).toBe("danish.butt@example.com");
    expect(normalizeProvisionEmail(null)).toBeNull();
  });

  it("keeps the project owner as Portal Admin regardless of allowlist status", () => {
    expect(selectAutomaticSignInRole({ openId: "owner-open-id", ownerOpenId: "owner-open-id", email: "owner@example.com", emailIsTeacherApproved: true })).toBe("admin");
  });

  it("assigns Teacher only when a non-owner email is explicitly approved", () => {
    expect(selectAutomaticSignInRole({ openId: "teacher-open-id", ownerOpenId: "owner-open-id", email: "teacher@example.com", emailIsTeacherApproved: true })).toBe("teacher");
    expect(selectAutomaticSignInRole({ openId: "unapproved-open-id", ownerOpenId: "owner-open-id", email: "unapproved@example.com", emailIsTeacherApproved: false })).toBeUndefined();
  });
});

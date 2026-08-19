export function normalizeProvisionEmail(value: string | null | undefined) {
  return value?.trim().toLowerCase() || null;
}

export function selectAutomaticSignInRole(input: {
  openId: string;
  ownerOpenId: string | undefined;
  email: string | null | undefined;
  emailIsTeacherApproved: boolean;
}): "admin" | "teacher" | undefined {
  if (input.openId === input.ownerOpenId) return "admin";
  if (normalizeProvisionEmail(input.email) && input.emailIsTeacherApproved) return "teacher";
  return undefined;
}

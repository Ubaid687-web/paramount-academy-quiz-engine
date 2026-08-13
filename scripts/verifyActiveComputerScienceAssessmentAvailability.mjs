import { appRouter } from "../server/routers.ts";

const ctx = {
  user: {
    id: 1,
    openId: "assessment-verification-admin",
    email: "admin@example.com",
    name: "Assessment Verification Admin",
    loginMethod: "manual",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  },
  req: { protocol: "https", headers: {} },
  res: {},
};

const caller = appRouter.createCaller(ctx);
const availability = await caller.assessment.getAvailability({ subject: "computer_science" });
console.log(JSON.stringify(availability, null, 2));

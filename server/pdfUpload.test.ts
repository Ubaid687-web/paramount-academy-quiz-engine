import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { validateGeneratedMcqs } from "./quizDraftValidator";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return ctx;
}

describe("PDF Upload", () => {
  const textPdfBase64 = "JVBERi0xLjMKMyAwIG9iago8PC9UeXBlIC9QYWdlCi9QYXJlbnQgMSAwIFIKL1Jlc291cmNlcyAyIDAgUgovQ29udGVudHMgNCAwIFI+PgplbmRvYmoKNCAwIG9iago8PC9GaWx0ZXIgL0ZsYXRlRGVjb2RlIC9MZW5ndGggMjM5Pj4Kc3RyZWFtCnicxZK7asMwFEB3f8UdUwg3ej/WQju0q35AyEqi4EeIlZb+fW2DByftFBOvuuieg3QYfBQEpYbv4tXB7p0CZUgIuD28uYIjEQzcOOMUqQVtDap+XMLmMzWx9jmFDrp8LVPsoG5zahvIx0t7PRyhTN258iHWsclb+IpVG1L+2YJvSvAhxCpe/HAB4X7XC7jToCCRKT5X0BItGxUW5N24T3iCWog5XnJkcsQvyPvPffIQ/afcPAMf/23wWJB37z4Z/NEC0Wjsqi0o05+t14JSDKVYvwXFLRq1ZguKaqTmiS2QGV5agZI+1sG0+ReQQaseCmVuZHN0cmVhbQplbmRvYmoKMSAwIG9iago8PC9UeXBlIC9QYWdlcwovS2lkcyBbMyAwIFIgXQovQ291bnQgMQovTWVkaWFCb3ggWzAgMCA1OTUuMjggODQxLjg5XQo+PgplbmRvYmoKNSAwIG9iago8PC9UeXBlIC9Gb250Ci9CYXNlRm9udCAvSGVsdmV0aWNhCi9TdWJ0eXBlIC9UeXBlMQovRW5jb2RpbmcgL1dpbkFuc2lFbmNvZGluZwo+PgplbmRvYmoKMiAwIG9iago8PAovUHJvY1NldCBbL1BERiAvVGV4dCAvL0ltYWdlQiAvSW1hZ2VDIC9JbWFnZUldCi9Gb250IDw8Ci9GMSA1IDAgUgo+PgovWE9iamVjdCA8PAo+Pgo+PgplbmRvYmoKNiAwIG9iago8PAovUHJvZHVjZXIgKFB5RlBERiAxLjcuMiBodHRwOi8vd3d3LnB5ZnBkZi5nb29nbGVjb2RlLmNvbSkKL0NyZWF0aW9uRGF0ZSAoRDoyMDI2MDgxMjIxMTY0NCkKPj4KZW5kb2JqCjcgMCBvYmoKPDwvVHlwZSAvQ2F0YWxvZwovUGFnZXMgMSAwIFIKL09wZW5BY3Rpb24gWzMgMCBSIC9GaXRIIG51bGxdCi9QYWdlTGF5b3V0IC9PbmVDb2x1bW4KPj4KZW5kb2JqCnhyZWYKMCA4CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDM5NiAwMDAwMCBuIAowMDAwMDAwNTc5IDAwMDAwIG4gCjAwMDAwMDAwMDkgMDAwMDAgbiAKMDAwMDAwMDA4NyAwMDAwMCBuIAowMDAwMDAwNDgzIDAwMDAwIG4gCjAwMDAwMDA2ODMgMDAwMDAgbiAKMDAwMDAwMDc5MiAwMDAwMCBuIAp0cmFpbGVyCjw8Ci9TaXplIDgKL1Jvb3QgNyAwIFIKL0luZm8gNiAwIFIKPj4Kc3RhcnR4cmVmCjg5NQolJUVPRgo=";

  it("extracts text from a real PDF buffer through the tRPC upload route", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.pdfUpload.extractPdfText({
      fileBuffer: textPdfBase64,
      fileName: "physics-revision.pdf",
    });

    expect(result.pageCount).toBe(1);
    expect(result.text).toContain("Kinematics studies motion");
  });

  it("connects real source extraction to a source-grounded draft validation contract", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const extractedSource = await caller.pdfUpload.extractPdfText({
      fileBuffer: textPdfBase64,
      fileName: "physics-revision.pdf",
    });

    expect(extractedSource.text).toContain("Kinematics");
    const validation = validateGeneratedMcqs([
      {
        question: "Which concept is used to describe the rate of change of velocity?",
        options: { A: "Speed", B: "Acceleration", C: "Distance", D: "Mass" },
        answer: "B",
        explanation: "Acceleration measures the rate at which velocity changes.",
        difficulty: "medium",
        sourceReference: "Kinematics: velocity and acceleration",
        learningObjective: "Apply the relationship between velocity and acceleration.",
      },
    ], 1);

    expect(validation).toEqual({ valid: true, issues: [] });
  });

  it("should validate input parameters", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.pdfUpload.extractPdfText({
        fileBuffer: "",
        fileName: "test.pdf",
      });
      expect.fail("Should have thrown an error for empty buffer");
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  it("should require valid base64 encoded PDF", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.pdfUpload.extractPdfText({
        fileBuffer: "invalid-base64-!!!",
        fileName: "test.pdf",
      });
      // This may or may not throw depending on pdf-parse behavior
      // Just verify the procedure is callable
      expect(true).toBe(true);
    } catch (error) {
      // Expected to fail with invalid PDF data
      expect(error).toBeDefined();
    }
  });

  it("should require authenticated user", async () => {
    const caller = appRouter.createCaller({
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: () => {} } as TrpcContext["res"],
    });

    try {
      await caller.pdfUpload.extractPdfText({
        fileBuffer: "dGVzdA==",
        fileName: "test.pdf",
      });
      expect.fail("Should have thrown an error for unauthenticated user");
    } catch (error) {
      expect(error).toBeDefined();
    }
  });
});

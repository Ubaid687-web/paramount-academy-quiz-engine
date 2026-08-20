import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticateRequest: vi.fn(),
  ingestPortalAdminCurriculumSource: vi.fn(),
}));

vi.mock("./_core/sdk", () => ({ sdk: { authenticateRequest: mocks.authenticateRequest } }));
vi.mock("./curriculumSourceIntake", () => ({ ingestPortalAdminCurriculumSource: mocks.ingestPortalAdminCurriculumSource }));

import { handleLargeCurriculumSourceUpload } from "./curriculumLargeUploadRoute";

function createResponse() {
  const response = {
    status: vi.fn(),
    json: vi.fn(),
  };
  response.status.mockReturnValue(response);
  return response;
}

describe("large curriculum PDF route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("rejects a non-admin before any source processing", async () => {
    mocks.authenticateRequest.mockResolvedValue({ id: 4, role: "teacher" });
    const response = createResponse();
    const request = {
      query: { curriculumSetId: "41" },
      body: Buffer.from("%PDF-test"),
      get: (name: string) => name === "content-type" ? "application/pdf" : name === "x-source-file-name" ? "book.pdf" : undefined,
      headers: {},
    };

    await handleLargeCurriculumSourceUpload(request as never, response as never);

    expect(response.status).toHaveBeenCalledWith(403);
    expect(mocks.ingestPortalAdminCurriculumSource).not.toHaveBeenCalled();
  });

  it("accepts only an authenticated Portal Admin PDF and passes its binary bytes to the shared safeguarded intake", async () => {
    mocks.authenticateRequest.mockResolvedValue({ id: 4, role: "admin" });
    mocks.ingestPortalAdminCurriculumSource.mockResolvedValue({ id: 451, extractionStatus: "pending" });
    const response = createResponse();
    const request = {
      query: { curriculumSetId: "41" },
      body: Buffer.from("%PDF-test"),
      get: (name: string) => name === "content-type" ? "application/pdf; charset=binary" : name === "x-source-file-name" ? "Grade%209%20Physics.pdf" : undefined,
      headers: { cookie: "session=secure" },
    };

    await handleLargeCurriculumSourceUpload(request as never, response as never);

    expect(mocks.ingestPortalAdminCurriculumSource).toHaveBeenCalledWith(expect.objectContaining({
      curriculumSetId: 41,
      fileName: "Grade 9 Physics.pdf",
      mimeType: "application/pdf",
      fileBuffer: Buffer.from("%PDF-test"),
      uploadedBy: 4,
      sessionCookie: "session=secure",
    }));
    expect(response.status).toHaveBeenCalledWith(201);
  });
});

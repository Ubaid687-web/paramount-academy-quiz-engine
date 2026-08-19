import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({
  createProgrammeCatalogue: vi.fn(),
  getProgrammeCatalogue: vi.fn(),
  createCurriculumSet: vi.fn(),
  activateProgrammeCatalogue: vi.fn(),
}));

vi.mock("./db", () => ({
  createProgrammeCatalogue: mocks.createProgrammeCatalogue,
  getProgrammeCatalogue: mocks.getProgrammeCatalogue,
  createCurriculumSet: mocks.createCurriculumSet,
  activateProgrammeCatalogue: mocks.activateProgrammeCatalogue,
}));

import { appRouter } from "./routers";

function createPortalAdminContext(): TrpcContext {
  return {
    user: {
      id: 77,
      openId: "portal-admin-grade-workflow",
      email: "admin@example.com",
      name: "Portal Admin",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("Portal Admin future-grade workflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createProgrammeCatalogue.mockResolvedValue({ id: 901, board: "FBISE", grade: "8", subject: "science", teacherLabel: "Science", status: "intake_only" });
    mocks.getProgrammeCatalogue.mockResolvedValue({ id: 901, board: "FBISE", grade: "8", subject: "science", teacherLabel: "Science", status: "intake_only" });
    mocks.createCurriculumSet.mockResolvedValue({ id: 902, status: "draft" });
  });

  it("creates a separate future-grade programme, hands it to a draft edition, and does not activate either record", async () => {
    const portalAdmin = appRouter.createCaller(createPortalAdminContext());

    const programme = await portalAdmin.curriculum.createProgramme({ board: "FBISE", grade: "8", subject: "science", teacherLabel: "Science" });
    expect(programme).toMatchObject({ id: 901, status: "intake_only", grade: "8", subject: "science" });
    expect(mocks.createProgrammeCatalogue).toHaveBeenCalledWith({ board: "FBISE", grade: "8", subject: "science", teacherLabel: "Science", createdBy: 77 });

    const curriculumSet = await portalAdmin.curriculum.createSet({ programmeId: programme.id, label: "FBISE Grade 8 Science", editionLabel: "2027 official textbook" });
    expect(curriculumSet).toMatchObject({ id: 902, status: "draft" });
    expect(mocks.createCurriculumSet).toHaveBeenCalledWith(expect.objectContaining({
      board: "FBISE",
      grade: "8",
      subject: "science",
      status: "draft",
      createdBy: 77,
    }));
    expect(mocks.activateProgrammeCatalogue).not.toHaveBeenCalled();
  });
});

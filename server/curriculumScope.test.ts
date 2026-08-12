import { describe, expect, it } from "vitest";
import { resolveCurriculumScope, ScopeResolutionError, type ScopeCatalog } from "./curriculumScope";

const catalog: ScopeCatalog = {
  curriculumSet: {
    id: 10,
    grade: "10",
    subject: "physics",
    label: "FBISE Grade 10 Physics",
    editionLabel: "2026 edition",
  },
  chapters: [
    {
      id: 1,
      curriculumSetId: 10,
      sequence: 1,
      code: "Ch. 10",
      title: "Simple Harmonic Motion",
      blockKey: "mechanics",
      partKey: null,
      startPage: 1,
      endPage: 20,
      contentText: "Simple harmonic motion occurs when a restoring force is proportional to displacement. ".repeat(4),
      isActive: 1,
    },
    {
      id: 2,
      curriculumSetId: 10,
      sequence: 2,
      code: "Ch. 11",
      title: "Sound",
      blockKey: "waves",
      partKey: null,
      startPage: 21,
      endPage: 40,
      contentText: "Sound is a mechanical wave that transfers energy through a medium. ".repeat(4),
      isActive: 1,
    },
  ],
  segments: [
    {
      id: 101,
      chapterId: 1,
      sequence: 1,
      label: "First half",
      startPage: 1,
      endPage: 10,
      startOffset: 0,
      endOffset: 350,
      contentText: "The restoring force in simple harmonic motion depends on displacement and direction. ".repeat(3),
      isActive: 1,
    },
  ],
  templates: [
    {
      id: 20,
      curriculumSetId: 10,
      scopeKind: "block",
      label: "Mechanics and Waves block",
      description: null,
      isActive: 1,
    },
  ],
  templateMemberships: [
    { scopeTemplateId: 20, chapterId: 2, sequence: 2 },
    { scopeTemplateId: 20, chapterId: 1, sequence: 1 },
  ],
};

describe("resolveCurriculumScope", () => {
  it("resolves a selected half-chapter segment into a traceable source snapshot", () => {
    const resolved = resolveCurriculumScope(catalog, {
      scopeType: "half_chapter",
      chapterIds: [1],
      segmentIds: [101],
    });

    expect(resolved.displayLabel).toBe("Simple Harmonic Motion — First half");
    expect(resolved.chapterIds).toEqual([1]);
    expect(resolved.segmentIds).toEqual([101]);
    expect(resolved.sourceText).toContain("First half");
    expect(resolved.snapshot.segments[0]).toMatchObject({ id: 101, startPage: 1, endPage: 10 });
  });

  it("resolves a reusable block template in curriculum sequence rather than selection order", () => {
    const resolved = resolveCurriculumScope(catalog, {
      scopeType: "block",
      scopeTemplateId: 20,
    });

    expect(resolved.chapterIds).toEqual([1, 2]);
    expect(resolved.scopeTemplateId).toBe(20);
    expect(resolved.sourceText.indexOf("Simple Harmonic Motion")).toBeLessThan(resolved.sourceText.indexOf("Sound"));
  });

  it("rejects segment selections that do not belong to the chosen chapter", () => {
    expect(() => resolveCurriculumScope(catalog, {
      scopeType: "half_chapter",
      chapterIds: [2],
      segmentIds: [101],
    })).toThrow(ScopeResolutionError);
  });
});

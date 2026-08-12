export const FBISE_SUBJECTS = ["physics", "chemistry", "computer_science"] as const;
export type FbiseSubject = (typeof FBISE_SUBJECTS)[number];

export const SCOPE_TYPES = [
  "single_chapter",
  "half_chapter",
  "multiple_chapters",
  "half_syllabus",
  "block",
] as const;
export type ScopeType = (typeof SCOPE_TYPES)[number];

export type ScopeChapter = {
  id: number;
  curriculumSetId: number;
  sequence: number;
  code: string | null;
  title: string;
  blockKey: string | null;
  partKey: string | null;
  startPage: number | null;
  endPage: number | null;
  contentText: string;
  isActive: number;
};

export type ScopeChapterSegment = {
  id: number;
  chapterId: number;
  sequence: number;
  label: string;
  startPage: number | null;
  endPage: number | null;
  startOffset: number | null;
  endOffset: number | null;
  contentText: string;
  isActive: number;
};

export type ScopeTemplate = {
  id: number;
  curriculumSetId: number;
  scopeKind: "half_syllabus" | "block";
  label: string;
  description: string | null;
  isActive: number;
};

export type ScopeTemplateMembership = {
  scopeTemplateId: number;
  chapterId: number;
  sequence: number;
};

export type ScopeCatalog = {
  curriculumSet: {
    id: number;
    grade: "10";
    subject: FbiseSubject;
    label: string;
    editionLabel: string | null;
  };
  chapters: ScopeChapter[];
  segments: ScopeChapterSegment[];
  templates: ScopeTemplate[];
  templateMemberships: ScopeTemplateMembership[];
};

export type ScopeSelection = {
  scopeType: ScopeType;
  chapterIds?: number[];
  segmentIds?: number[];
  scopeTemplateId?: number;
};

export type ResolvedScope = {
  scopeType: ScopeType;
  displayLabel: string;
  chapterIds: number[];
  segmentIds: number[];
  scopeTemplateId: number | null;
  sourceText: string;
  snapshot: {
    curriculumSet: ScopeCatalog["curriculumSet"];
    scopeType: ScopeType;
    displayLabel: string;
    scopeTemplateId: number | null;
    chapters: Array<{
      id: number;
      sequence: number;
      code: string | null;
      title: string;
      startPage: number | null;
      endPage: number | null;
    }>;
    segments: Array<{
      id: number;
      chapterId: number;
      sequence: number;
      label: string;
      startPage: number | null;
      endPage: number | null;
      startOffset: number | null;
      endOffset: number | null;
    }>;
    resolvedAt: string;
  };
};

export class ScopeResolutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScopeResolutionError";
  }
}

function uniquePositiveIds(ids: number[] | undefined): number[] {
  if (!ids?.length) return [];
  return Array.from(new Set(ids.filter((id) => Number.isInteger(id) && id > 0)));
}

function ensureActiveChapter(catalog: ScopeCatalog, chapterId: number): ScopeChapter {
  const chapter = catalog.chapters.find((entry) => entry.id === chapterId && entry.isActive === 1);
  if (!chapter) {
    throw new ScopeResolutionError("One or more selected chapters are unavailable in the active curriculum.");
  }
  return chapter;
}

function buildSourceSection(chapter: ScopeChapter, text: string, segmentLabel?: string): string {
  const pageRange = chapter.startPage && chapter.endPage
    ? ` (pages ${chapter.startPage}-${chapter.endPage})`
    : "";
  const segmentSuffix = segmentLabel ? ` — ${segmentLabel}` : "";
  return `### ${chapter.code ? `${chapter.code}: ` : ""}${chapter.title}${segmentSuffix}${pageRange}\n${text.trim()}`;
}

/**
 * Resolves only active, server-loaded curriculum evidence. Browser-provided content is not used.
 */
export function resolveCurriculumScope(catalog: ScopeCatalog, selection: ScopeSelection): ResolvedScope {
  const requestedChapterIds = uniquePositiveIds(selection.chapterIds);
  const requestedSegmentIds = uniquePositiveIds(selection.segmentIds);
  let selectedChapters: ScopeChapter[] = [];
  let selectedSegments: ScopeChapterSegment[] = [];
  let scopeTemplateId: number | null = null;
  let displayLabel = "";

  if (selection.scopeType === "single_chapter") {
    if (requestedChapterIds.length !== 1 || requestedSegmentIds.length || selection.scopeTemplateId) {
      throw new ScopeResolutionError("Single-chapter generation requires exactly one chapter and no segment or scope template.");
    }
    selectedChapters = [ensureActiveChapter(catalog, requestedChapterIds[0])];
    displayLabel = selectedChapters[0].title;
  }

  if (selection.scopeType === "half_chapter") {
    if (requestedChapterIds.length !== 1 || requestedSegmentIds.length !== 1 || selection.scopeTemplateId) {
      throw new ScopeResolutionError("Half-chapter generation requires exactly one chapter and one confirmed segment.");
    }
    const chapter = ensureActiveChapter(catalog, requestedChapterIds[0]);
    const segment = catalog.segments.find((entry) => (
      entry.id === requestedSegmentIds[0]
      && entry.chapterId === chapter.id
      && entry.isActive === 1
    ));
    if (!segment) {
      throw new ScopeResolutionError("The selected half-chapter segment is unavailable or does not belong to the selected chapter.");
    }
    selectedChapters = [chapter];
    selectedSegments = [segment];
    displayLabel = `${chapter.title} — ${segment.label}`;
  }

  if (selection.scopeType === "multiple_chapters") {
    if (requestedChapterIds.length < 2 || requestedSegmentIds.length || selection.scopeTemplateId) {
      throw new ScopeResolutionError("Multiple-chapter generation requires at least two chapters and no segment or scope template.");
    }
    selectedChapters = requestedChapterIds.map((chapterId) => ensureActiveChapter(catalog, chapterId));
    displayLabel = `${selectedChapters.length} selected chapters`;
  }

  if (selection.scopeType === "half_syllabus" || selection.scopeType === "block") {
    if (!selection.scopeTemplateId || requestedChapterIds.length || requestedSegmentIds.length) {
      throw new ScopeResolutionError("Half-syllabus and block generation require one saved scope template only.");
    }
    const expectedKind = selection.scopeType === "half_syllabus" ? "half_syllabus" : "block";
    const template = catalog.templates.find((entry) => (
      entry.id === selection.scopeTemplateId
      && entry.isActive === 1
      && entry.scopeKind === expectedKind
    ));
    if (!template) {
      throw new ScopeResolutionError("The selected scope template is unavailable for this active curriculum.");
    }
    const memberIds = catalog.templateMemberships
      .filter((membership) => membership.scopeTemplateId === template.id)
      .sort((a, b) => a.sequence - b.sequence)
      .map((membership) => membership.chapterId);
    if (!memberIds.length) {
      throw new ScopeResolutionError("The selected scope template does not contain any chapters.");
    }
    selectedChapters = memberIds.map((chapterId) => ensureActiveChapter(catalog, chapterId));
    scopeTemplateId = template.id;
    displayLabel = template.label;
  }

  const orderedChapters = [...selectedChapters].sort((a, b) => a.sequence - b.sequence);
  const sourceText = selection.scopeType === "half_chapter"
    ? buildSourceSection(orderedChapters[0], selectedSegments[0].contentText, selectedSegments[0].label)
    : orderedChapters.map((chapter) => buildSourceSection(chapter, chapter.contentText)).join("\n\n");

  if (sourceText.trim().length < 100) {
    throw new ScopeResolutionError("The selected scope does not contain enough readable source material to generate a quiz draft.");
  }

  return {
    scopeType: selection.scopeType,
    displayLabel,
    chapterIds: orderedChapters.map((chapter) => chapter.id),
    segmentIds: selectedSegments.map((segment) => segment.id),
    scopeTemplateId,
    sourceText,
    snapshot: {
      curriculumSet: catalog.curriculumSet,
      scopeType: selection.scopeType,
      displayLabel,
      scopeTemplateId,
      chapters: orderedChapters.map((chapter) => ({
        id: chapter.id,
        sequence: chapter.sequence,
        code: chapter.code,
        title: chapter.title,
        startPage: chapter.startPage,
        endPage: chapter.endPage,
      })),
      segments: selectedSegments.map((segment) => ({
        id: segment.id,
        chapterId: segment.chapterId,
        sequence: segment.sequence,
        label: segment.label,
        startPage: segment.startPage,
        endPage: segment.endPage,
        startOffset: segment.startOffset,
        endOffset: segment.endOffset,
      })),
      resolvedAt: new Date().toISOString(),
    },
  };
}

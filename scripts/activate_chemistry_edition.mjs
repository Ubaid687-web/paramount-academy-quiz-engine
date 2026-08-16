import { activateCurriculumSet, createScopeTemplateWithChapters, listCurriculumChapters } from "../server/db.ts";

const curriculumSetId = 120001;
const chapters = await listCurriculumChapters(curriculumSetId);
if (chapters.length !== 13 || chapters.some((chapter) => chapter.isActive !== 1)) {
  throw new Error("Chemistry edition must contain thirteen active reviewed chapters before activation.");
}
const activated = await activateCurriculumSet(curriculumSetId);
const existingTemplates = await (await import("../server/db.ts")).listScopeTemplates(curriculumSetId);
if (!existingTemplates.length) {
  const ids = chapters.map((chapter) => chapter.id);
  await createScopeTemplateWithChapters({
    curriculumSetId,
    scopeKind: "half_syllabus",
    label: "First half · Units 1–6",
    description: "Units 1–6 from the supplied Grade 10 Chemistry textbook.",
    isActive: 1,
  }, ids.slice(0, 6));
  await createScopeTemplateWithChapters({
    curriculumSetId,
    scopeKind: "half_syllabus",
    label: "Second half · Units 7–13",
    description: "Units 7–13 from the supplied Grade 10 Chemistry textbook.",
    isActive: 1,
  }, ids.slice(6));
  for (const chapter of chapters) {
    await createScopeTemplateWithChapters({
      curriculumSetId,
      scopeKind: "block",
      label: `${chapter.code} · ${chapter.title}`,
      description: `Single-unit block from the supplied Grade 10 Chemistry textbook, ${chapter.code}.`,
      isActive: 1,
    }, [chapter.id]);
  }
}
console.log(JSON.stringify({ setId: activated.id, status: activated.status, chapters: chapters.length, scopeTemplatesCreated: existingTemplates.length ? 0 : 15 }, null, 2));

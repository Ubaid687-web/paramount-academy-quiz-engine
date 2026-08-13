import { useEffect, useMemo, useState } from "react";
import { BookMarked, CheckCircle2, FileText, FolderPlus, Loader2, Plus, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { AcademyShell } from "@/components/AcademyShell";

type Subject = "physics" | "chemistry" | "computer_science";
type ScopeKind = "half_syllabus" | "block";

const subjectLabels: Record<Subject, string> = {
  physics: "Physics",
  chemistry: "Chemistry",
  computer_science: "Computer Science",
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      if (typeof dataUrl !== "string") return reject(new Error("The file could not be read."));
      const base64 = dataUrl.split(",")[1];
      if (!base64) return reject(new Error("The file could not be prepared for upload."));
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("The file could not be read."));
    reader.readAsDataURL(file);
  });
}

export default function CurriculumManagement() {
  const utils = trpc.useUtils();
  const [selectedSetId, setSelectedSetId] = useState<number | null>(null);
  const [setSubject, setSetSubject] = useState<Subject>("physics");
  const [setLabel, setSetLabel] = useState("");
  const [editionLabel, setEditionLabel] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [chapterSourceId, setChapterSourceId] = useState<number | null>(null);
  const [chapterSequence, setChapterSequence] = useState("1");
  const [chapterCode, setChapterCode] = useState("");
  const [chapterTitle, setChapterTitle] = useState("");
  const [chapterText, setChapterText] = useState("");
  const [selectedChapterId, setSelectedChapterId] = useState<number | null>(null);
  const [firstHalfText, setFirstHalfText] = useState("");
  const [secondHalfText, setSecondHalfText] = useState("");
  const [scopeKind, setScopeKind] = useState<ScopeKind>("block");
  const [scopeLabel, setScopeLabel] = useState("");
  const [scopeChapterIds, setScopeChapterIds] = useState<number[]>([]);

  const setsQuery = trpc.curriculum.listSets.useQuery();
  const detailsQuery = trpc.curriculum.getManagementDetails.useQuery(
    { curriculumSetId: selectedSetId ?? 0 },
    { enabled: selectedSetId !== null }
  );
  const createSet = trpc.curriculum.createSet.useMutation();
  const ingestSource = trpc.curriculum.ingestSource.useMutation();
  const createChapter = trpc.curriculum.createChapter.useMutation();
  const saveSegments = trpc.curriculum.saveHalfChapterSegments.useMutation();
  const createScope = trpc.curriculum.createScopeTemplate.useMutation();
  const activateSet = trpc.curriculum.activateSet.useMutation();

  useEffect(() => {
    if (selectedSetId === null && setsQuery.data?.length) setSelectedSetId(setsQuery.data[0].id);
  }, [selectedSetId, setsQuery.data]);

  const details = detailsQuery.data;
  const selectedChapter = useMemo(
    () => details?.chapters.find((chapter) => chapter.id === selectedChapterId),
    [details?.chapters, selectedChapterId]
  );

  const refreshManagementData = async () => {
    await Promise.all([
      utils.curriculum.listSets.invalidate(),
      selectedSetId ? utils.curriculum.getManagementDetails.invalidate({ curriculumSetId: selectedSetId }) : Promise.resolve(),
    ]);
  };

  const handleCreateSet = async () => {
    if (!setLabel.trim()) return toast.error("Enter a clear curriculum-set label first.");
    try {
      const created = await createSet.mutateAsync({ subject: setSubject, label: setLabel.trim(), editionLabel: editionLabel.trim() || undefined });
      setSelectedSetId(created.id);
      setSetLabel("");
      setEditionLabel("");
      await utils.curriculum.listSets.invalidate();
      toast.success("Curriculum set created. Add one source file at a time, then review its chapters.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create the curriculum set.");
    }
  };

  const handleSourceUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedSetId) return;
    if (!["application/pdf", "text/plain"].includes(file.type)) {
      toast.error("Only text-based PDF and TXT sources are supported.");
      return;
    }
    if (file.size > 30 * 1024 * 1024) {
      toast.error("Keep each source under 30MB.");
      return;
    }
    setIsUploading(true);
    try {
      const fileBuffer = await fileToBase64(file);
      const source = await ingestSource.mutateAsync({
        curriculumSetId: selectedSetId,
        fileName: file.name,
        mimeType: file.type as "application/pdf" | "text/plain",
        fileBuffer,
      });
      setChapterSourceId(source.id);
      setChapterText(source.extractedText ?? "");
      await utils.curriculum.getManagementDetails.invalidate({ curriculumSetId: selectedSetId });
      toast.success("Source stored and extracted. Review it before saving a chapter.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The source could not be stored or extracted.");
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  const loadSourceForReview = (sourceId: number) => {
    const source = details?.sources.find((item) => item.id === sourceId);
    if (!source?.extractedText) return toast.error("This source has no usable extracted text.");
    setChapterSourceId(source.id);
    setChapterText(source.extractedText);
  };

  const handleCreateChapter = async () => {
    if (!selectedSetId || !chapterSourceId || !chapterTitle.trim() || chapterText.trim().length < 100) {
      toast.error("Select an extracted source, give the chapter a title, and review at least 100 characters of source text.");
      return;
    }
    try {
      const chapter = await createChapter.mutateAsync({
        curriculumSetId: selectedSetId,
        sourceId: chapterSourceId,
        sequence: Number(chapterSequence) || 1,
        code: chapterCode.trim() || undefined,
        title: chapterTitle.trim(),
        contentText: chapterText.trim(),
      });
      setSelectedChapterId(chapter.id);
      const midpoint = Math.ceil(chapterText.length / 2);
      setFirstHalfText(chapterText.slice(0, midpoint));
      setSecondHalfText(chapterText.slice(midpoint));
      setChapterTitle("");
      setChapterCode("");
      setChapterSequence(String((Number(chapterSequence) || 1) + 1));
      await utils.curriculum.getManagementDetails.invalidate({ curriculumSetId: selectedSetId });
      toast.success("Reviewed chapter saved. Confirm its two half-chapter segments if you need partial-chapter drafts.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The chapter could not be saved.");
    }
  };

  const handleSaveSegments = async () => {
    if (!selectedChapterId || firstHalfText.trim().length < 100 || secondHalfText.trim().length < 100) {
      toast.error("Select a chapter and confirm two substantial reviewed segments.");
      return;
    }
    try {
      await saveSegments.mutateAsync({
        chapterId: selectedChapterId,
        firstHalf: { label: "First half", contentText: firstHalfText.trim() },
        secondHalf: { label: "Second half", contentText: secondHalfText.trim() },
      });
      await utils.curriculum.getManagementDetails.invalidate({ curriculumSetId: selectedSetId! });
      toast.success("Half-chapter segments saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The chapter segments could not be saved.");
    }
  };

  const toggleScopeChapter = (chapterId: number, checked: boolean) => {
    setScopeChapterIds((ids) => checked ? [...ids, chapterId] : ids.filter((id) => id !== chapterId));
  };

  const handleCreateScope = async () => {
    if (!selectedSetId || !scopeLabel.trim() || !scopeChapterIds.length) {
      toast.error("Name the scope and select one or more reviewed chapters.");
      return;
    }
    try {
      await createScope.mutateAsync({ curriculumSetId: selectedSetId, scopeKind, label: scopeLabel.trim(), chapterIds: scopeChapterIds });
      setScopeLabel("");
      setScopeChapterIds([]);
      await utils.curriculum.getManagementDetails.invalidate({ curriculumSetId: selectedSetId });
      toast.success("Reusable curriculum scope saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The reusable scope could not be saved.");
    }
  };

  const handleActivate = async () => {
    if (!selectedSetId) return;
    try {
      await activateSet.mutateAsync({ curriculumSetId: selectedSetId });
      await refreshManagementData();
      toast.success("Curriculum activated. It is now available in the quiz builder.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The curriculum could not be activated.");
    }
  };

  return (
    <AcademyShell eyebrow="Portal Admin" showAdministration>
      <main className="container py-8 sm:py-10">
        <div className="mb-8 rounded-2xl border border-border/80 bg-card px-5 py-6 shadow-sm sm:px-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Portal Admin</p>
            <h1 className="mt-2 text-3xl font-bold text-foreground">Prepare reviewed curriculum evidence</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">Upload one source file at a time, review its chapter evidence, define half-chapters or reusable groups, then activate the edition for FBISE MCQ draft generation.</p>
          </div>
          {details && <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleActivate} disabled={activateSet.isPending || details.curriculumSet.status === "active"}><CheckCircle2 className="mr-2 h-4 w-4" />{details.curriculumSet.status === "active" ? "Active Curriculum" : "Activate Curriculum"}</Button>}
          </div>
        </div>

        {setsQuery.error && <Card className="mb-6 border-destructive/50"><CardContent className="py-4 text-sm text-destructive">Curriculum management is restricted to administrators. Sign in with the Paramount Academy administrator account, then return to this page.</CardContent></Card>}

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader><CardTitle className="flex items-center gap-2"><FolderPlus className="h-5 w-5 text-accent" />Curriculum Sets</CardTitle><CardDescription>One versioned set per subject and textbook edition.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              <Select value={selectedSetId?.toString() ?? undefined} onValueChange={(value) => setSelectedSetId(Number(value))}>
                <SelectTrigger aria-label="Selected curriculum set"><SelectValue placeholder="Select a curriculum set" /></SelectTrigger>
                <SelectContent>{setsQuery.data?.map((set) => <SelectItem key={set.id} value={set.id.toString()}>{subjectLabels[set.subject]} — {set.label} ({set.status})</SelectItem>)}</SelectContent>
              </Select>
              <Label htmlFor="set-subject">New set subject</Label>
              <Select value={setSubject} onValueChange={(value) => setSetSubject(value as Subject)}><SelectTrigger id="set-subject"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(subjectLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select>
              <Input aria-label="Curriculum set label" value={setLabel} onChange={(event) => setSetLabel(event.target.value)} placeholder="e.g. FBISE Grade 10 Physics" />
              <Input aria-label="Edition label" value={editionLabel} onChange={(event) => setEditionLabel(event.target.value)} placeholder="e.g. 2026 edition" />
              <Button className="w-full" onClick={handleCreateSet} disabled={createSet.isPending}><Plus className="mr-2 h-4 w-4" />Create Draft Set</Button>
            </CardContent>
          </Card>

          <div className="space-y-6 lg:col-span-2">
            {!selectedSetId && <Card><CardContent className="py-12 text-center text-muted-foreground">Create or select a curriculum set to begin.</CardContent></Card>}
            {selectedSetId && detailsQuery.isLoading && <Card><CardContent className="flex items-center gap-2 py-8 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Loading curriculum details…</CardContent></Card>}
            {details && <>
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5 text-accent" />1. Add One Source File</CardTitle><CardDescription>{details.curriculumSet.label} is currently <strong>{details.curriculumSet.status}</strong>. PDF and TXT files are stored and extracted server-side.</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                  <Input aria-label="Curriculum source upload" type="file" accept=".pdf,.txt" onChange={handleSourceUpload} disabled={isUploading} />
                  {isUploading && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Storing and extracting source text…</p>}
                  <div className="space-y-2">{details.sources.map((source) => <button key={source.id} onClick={() => loadSourceForReview(source.id)} className="flex w-full items-center justify-between rounded-lg border border-border/60 p-3 text-left hover:border-accent/50"><span className="flex min-w-0 items-center gap-2"><FileText className="h-4 w-4 shrink-0 text-accent" /><span className="truncate text-sm">{source.originalFileName}</span></span><span className="text-xs text-muted-foreground">{source.extractionStatus}{source.pageCount ? ` • ${source.pageCount} pages` : ""}</span></button>)}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><BookMarked className="h-5 w-5 text-accent" />2. Review and Save a Chapter</CardTitle><CardDescription>Select an extracted source, confirm the chapter text and title, then save it as approved evidence.</CardDescription></CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-3"><Input aria-label="Chapter sequence" type="number" min="1" value={chapterSequence} onChange={(event) => setChapterSequence(event.target.value)} /><Input aria-label="Chapter code" value={chapterCode} onChange={(event) => setChapterCode(event.target.value)} placeholder="e.g. Ch. 10" /><Input aria-label="Chapter title" value={chapterTitle} onChange={(event) => setChapterTitle(event.target.value)} placeholder="Chapter title" /></div>
                  <Textarea aria-label="Reviewed chapter source text" value={chapterText} onChange={(event) => setChapterText(event.target.value)} placeholder="Select an extracted source above; review or adjust its chapter text here." className="min-h-52" />
                  <Button onClick={handleCreateChapter} disabled={createChapter.isPending}><Plus className="mr-2 h-4 w-4" />Save Reviewed Chapter</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>3. Confirm Half-Chapter Segments</CardTitle><CardDescription>Use this only when you want administrators to generate from the first or second half of one reviewed chapter.</CardDescription></CardHeader>
                <CardContent className="space-y-3">
                  <Select value={selectedChapterId?.toString() ?? undefined} onValueChange={(value) => { const chapterId = Number(value); setSelectedChapterId(chapterId); const chapter = details.chapters.find((item) => item.id === chapterId); if (chapter) { const midpoint = Math.ceil(chapter.contentText.length / 2); setFirstHalfText(chapter.contentText.slice(0, midpoint)); setSecondHalfText(chapter.contentText.slice(midpoint)); } }}><SelectTrigger aria-label="Chapter for segment review"><SelectValue placeholder="Select a reviewed chapter" /></SelectTrigger><SelectContent>{details.chapters.map((chapter) => <SelectItem key={chapter.id} value={chapter.id.toString()}>{chapter.code ? `${chapter.code}: ` : ""}{chapter.title}</SelectItem>)}</SelectContent></Select>
                  {selectedChapter && <><Textarea aria-label="First-half chapter source text" value={firstHalfText} onChange={(event) => setFirstHalfText(event.target.value)} className="min-h-32" /><Textarea aria-label="Second-half chapter source text" value={secondHalfText} onChange={(event) => setSecondHalfText(event.target.value)} className="min-h-32" /><Button onClick={handleSaveSegments} disabled={saveSegments.isPending}>Save First and Second Half</Button></>}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>4. Build a Reusable Half-Syllabus or Block Scope</CardTitle><CardDescription>These saved groups become selectable in the Quiz Builder. They always resolve to the reviewed chapter records below.</CardDescription></CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2"><Select value={scopeKind} onValueChange={(value) => setScopeKind(value as ScopeKind)}><SelectTrigger aria-label="Scope template kind"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="block">Full block</SelectItem><SelectItem value="half_syllabus">Half syllabus</SelectItem></SelectContent></Select><Input aria-label="Scope template label" value={scopeLabel} onChange={(event) => setScopeLabel(event.target.value)} placeholder="e.g. First-term Physics" /></div>
                  <div className="space-y-2 rounded-lg border border-border/60 p-3">{details.chapters.map((chapter) => <label key={chapter.id} className="flex items-center gap-2 text-sm"><Checkbox checked={scopeChapterIds.includes(chapter.id)} onCheckedChange={(checked) => toggleScopeChapter(chapter.id, checked === true)} />{chapter.code ? `${chapter.code}: ` : ""}{chapter.title}</label>)}</div>
                  <Button onClick={handleCreateScope} disabled={createScope.isPending}>Save Reusable Scope</Button>
                </CardContent>
              </Card>
            </>}
          </div>
        </div>
      </main>
    </AcademyShell>
  );
}

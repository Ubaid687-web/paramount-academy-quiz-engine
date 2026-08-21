import React, { useMemo, useState } from "react";
import { ArrowLeft, Atom, Beaker, BookOpenCheck, ChevronRight, ClipboardCheck, FileQuestion, LaptopMinimal, Loader2, Sparkles, Trash2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { AcademyShell } from "@/components/AcademyShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

type ReadyProgramme = { id: number; board: string; grade: string; subject: string; teacherLabel: string; status?: string };
type SubjectPresentation = { eyebrow: string; Icon: typeof Atom; iconTone: string; cardTone: string; accentTone: string };

type WizardStep = 1 | 2 | 3;

const subjectPresentation: Record<string, SubjectPresentation> = {
  physics: { eyebrow: "Matter & motion", Icon: Atom, iconTone: "bg-sky-100 text-sky-700", cardTone: "border-sky-100 hover:border-sky-300", accentTone: "bg-sky-500" },
  chemistry: { eyebrow: "Matter & change", Icon: Beaker, iconTone: "bg-violet-100 text-violet-700", cardTone: "border-violet-100 hover:border-violet-300", accentTone: "bg-violet-500" },
  computer_science: { eyebrow: "Logic & systems", Icon: LaptopMinimal, iconTone: "bg-emerald-100 text-emerald-700", cardTone: "border-emerald-100 hover:border-emerald-300", accentTone: "bg-emerald-500" },
};

const wizardSteps: Array<{ id: WizardStep; label: string }> = [
  { id: 1, label: "Grade" },
  { id: 2, label: "Subject" },
  { id: 3, label: "Builder" },
];

function WizardProgress({ current }: { current: WizardStep }) {
  return (
    <nav aria-label="Quiz preparation progress" className="grid grid-cols-3 gap-2">
      {wizardSteps.map((step) => {
        const isCurrent = step.id === current;
        const isComplete = step.id < current;
        return (
          <div key={step.id} aria-current={isCurrent ? "step" : undefined} className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${isCurrent ? "border-primary bg-primary/[0.055]" : isComplete ? "border-primary/20 bg-primary/[0.025]" : "border-border bg-muted/30"}`}>
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${isCurrent ? "bg-primary text-primary-foreground" : isComplete ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>{isComplete ? "✓" : step.id}</span>
            <span className="hidden min-w-0 text-xs font-bold text-foreground sm:block">{step.label}</span>
          </div>
        );
      })}
    </nav>
  );
}

export default function QuizList() {
  const [, navigate] = useLocation();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
  const [selectedProgramme, setSelectedProgramme] = useState<ReadyProgramme | null>(null);
  const [showLibrary, setShowLibrary] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const readyProgrammesQuery = trpc.curriculum.listReadyProgrammes.useQuery();
  const readyProgrammes = (readyProgrammesQuery.data ?? []).filter((programme) => programme.status === "ready") as ReadyProgramme[];
  const grades = useMemo(() => {
    const readyGrades = new Set(readyProgrammes.map((programme) => programme.grade));
    readyGrades.add("9");
    return Array.from(readyGrades).sort((left, right) => Number(right) - Number(left) || left.localeCompare(right));
  }, [readyProgrammes]);
  const { data: quizzes, isLoading, error, refetch } = trpc.quiz.getAll.useQuery(undefined, {
    enabled: showLibrary && isAuthenticated,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  const deleteQuizMutation = trpc.quiz.deleteQuiz.useMutation();

  const currentStep: WizardStep = selectedProgramme ? 3 : selectedGrade ? 2 : 1;
  const isGrade9 = selectedGrade === "9";
  const canManageGrade9Intake = user?.role === "admin";
  const programmesForSelectedGrade = selectedGrade ? readyProgrammes.filter((programme) => programme.grade === selectedGrade) : [];

  const selectGrade = (grade: string) => {
    setShowLibrary(false);
    setSelectedGrade(grade);
    setSelectedProgramme(null);
  };

  const returnToGrades = () => {
    setShowLibrary(false);
    setSelectedGrade(null);
    setSelectedProgramme(null);
  };

  const returnToSubjects = () => {
    setShowLibrary(false);
    setSelectedProgramme(null);
  };

  const openLibrary = () => {
    if (!isAuthenticated) {
      navigate("/staff-sign-in");
      return;
    }
    setShowLibrary(true);
    setConfirmDelete(null);
  };

  const handleReturnKey = (event: React.KeyboardEvent<HTMLButtonElement>, action: () => void) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      action();
    }
  };

  const handleDelete = async (quizId: number) => {
    setDeletingId(quizId);
    try {
      await deleteQuizMutation.mutateAsync({ quizId });
      await refetch();
      toast.success("Quiz removed.");
      setConfirmDelete(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Quiz could not be removed.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AcademyShell eyebrow="Teacher MCQ Workspace" showAdministration={user?.role === "admin"}>
      <main className="container py-6 sm:py-10">
        <section className="mx-auto max-w-5xl">
          {showLibrary ? (
            <div className="space-y-5">
              <Button type="button" variant="ghost" className="academy-back-button" onClick={() => setShowLibrary(false)} onKeyDown={(event) => handleReturnKey(event, () => setShowLibrary(false))} aria-label="Return to quiz preparation"><ArrowLeft className="h-4 w-4" />Back to preparation</Button>
              <div className="rounded-[1.5rem] border border-primary/10 bg-card px-5 py-6 shadow-sm sm:px-8">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-primary">Assessment library</p>
                <h1 className="mt-2 text-[2rem] font-extrabold tracking-[-0.055em] text-foreground sm:text-4xl">Recent MCQ drafts</h1>
                <p className="mt-2 text-sm text-muted-foreground">Open a saved draft or return to preparation.</p>
              </div>
              {isLoading && <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" role="status" aria-live="polite" aria-label="Loading recent MCQ drafts" aria-busy="true"><span className="sr-only">Loading recent MCQ drafts</span>{Array.from({ length: 3 }, (_, index) => <Card key={index} className="border-border/70 shadow-sm"><CardContent className="min-h-52 p-5"><div className="flex items-start justify-between"><Skeleton className="h-10 w-10 rounded-xl bg-primary/10" /><Skeleton className="h-8 w-8 rounded-lg bg-muted" /></div><div className="mt-5 space-y-3"><Skeleton className="h-5 w-4/5 bg-muted" /><Skeleton className="h-4 w-full bg-muted" /><Skeleton className="h-4 w-3/5 bg-muted" /></div><div className="mt-7 flex items-center justify-between border-t border-border pt-4"><Skeleton className="h-4 w-20 bg-muted" /><Skeleton className="h-4 w-12 bg-muted" /></div></CardContent></Card>)}</div>}
              {error && <Card className="border-destructive/40"><CardContent className="py-8 text-sm text-destructive">The assessment library could not be loaded. {error.message}</CardContent></Card>}
              {!isLoading && !error && quizzes?.length === 0 && <Card className="border-dashed border-border bg-card/70"><CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground"><ClipboardCheck className="h-5 w-5 shrink-0 text-primary" />No MCQ draft has been saved yet.</CardContent></Card>}
              {!isLoading && !error && Boolean(quizzes?.length) && <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{quizzes?.map((quiz) => <Card key={quiz.id} className="group border-border/80 shadow-sm transition-shadow hover:shadow-md"><CardContent className="flex min-h-52 flex-col p-5"><div className="flex items-start justify-between gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/8 text-primary"><FileQuestion className="h-5 w-5" /></div><Button variant="ghost" size="icon" aria-label={`Delete ${quiz.title}`} className="text-muted-foreground hover:text-destructive" onClick={() => setConfirmDelete(quiz.id)}><Trash2 className="h-4 w-4" /></Button></div><div className="mt-5 flex-1"><p className="line-clamp-2 text-lg font-bold text-foreground">{quiz.title}</p><p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{quiz.description || "Source-grounded MCQ assessment"}</p></div><div className="mt-5 flex items-center justify-between border-t border-border pt-4"><span className="text-sm text-muted-foreground"><strong className="text-foreground">{quiz.totalQuestions}</strong> MCQs</span><Button variant="ghost" className="h-auto p-0 text-primary hover:bg-transparent hover:text-primary/75" onClick={() => navigate(`/quiz/${quiz.id}`)}>Open <ChevronRight className="ml-1 h-4 w-4" /></Button></div></CardContent></Card>)}</div>}
              {confirmDelete !== null && <Card className="fixed inset-x-4 bottom-5 z-50 mx-auto max-w-md border-destructive/30 shadow-xl"><CardContent className="p-5"><p className="font-bold text-foreground">Remove this quiz?</p><p className="mt-1 text-sm text-muted-foreground">The quiz and its associated attempts will be removed.</p><div className="mt-4 flex justify-end gap-2"><Button variant="outline" onClick={() => setConfirmDelete(null)}>Keep quiz</Button><Button variant="destructive" disabled={deletingId === confirmDelete} onClick={() => handleDelete(confirmDelete)}>{deletingId === confirmDelete ? "Removing…" : "Remove"}</Button></div></CardContent></Card>}
            </div>
          ) : (
            <div className="space-y-5">
              <div className="rounded-[1.75rem] border border-primary/10 bg-card px-5 py-6 shadow-[0_18px_55px_oklch(0.36_0.12_255_/_0.07)] sm:px-9 sm:py-8">
                <div className="flex flex-wrap items-end justify-between gap-5">
                  <div className="max-w-2xl">
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-primary">Quiz preparation · Step {currentStep} of 3</p>
                    <h1 className="mt-3 text-[2rem] font-extrabold tracking-[-0.055em] text-foreground sm:text-5xl">{currentStep === 1 ? "Choose a grade." : currentStep === 2 ? (isGrade9 ? (canManageGrade9Intake ? "Add a Grade 9 subject." : "Grade 9 preparation.") : "Choose a subject.") : "Ready to build."}</h1>
                    <p className="mt-2 text-sm text-muted-foreground">{currentStep === 1 ? "Start with the class you teach." : currentStep === 2 ? (isGrade9 ? (canManageGrade9Intake ? "Name the subject, then upload its textbook." : "Portal Admin is preparing approved Grade 9 sources before teacher access opens.") : "Select one approved subject.") : "Open the focused assessment builder."}</p>
                  </div>{currentStep === 1 && !authLoading && !isAuthenticated && <Link href="/staff-sign-in" className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground">Staff sign in</Link>}
                </div>
                <div className="mt-6"><WizardProgress current={currentStep} /></div>
              </div>

              {!authLoading && isAuthenticated && currentStep === 1 && <Card className="border-primary/15 bg-primary/[0.025] shadow-sm" aria-label="Staff access status">
                <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                  <div>
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-primary">Signed-in staff access</p>
                    {user?.role === "admin" ? <><h2 className="mt-1 text-base font-extrabold text-foreground">Portal Admin</h2><p className="mt-1 text-sm leading-5 text-muted-foreground">You can manage curriculum, staff access, OCR review, chapter availability, and AI generation controls.</p></> : user?.role === "teacher" ? <><h2 className="mt-1 text-base font-extrabold text-foreground">Teacher</h2><p className="mt-1 text-sm leading-5 text-muted-foreground">You can build, save, and export assessments from approved curriculum. Portal configuration stays with Portal Admin.</p></> : <><h2 className="mt-1 text-base font-extrabold text-foreground">No staff role yet</h2><p className="mt-1 text-sm leading-5 text-muted-foreground">Ask Portal Admin to approve your exact sign-in email for Teacher access, then sign in again.</p></>}
                  </div>
                  {user?.role === "admin" && <div className="flex flex-wrap gap-2"><Link href="/curriculum" className="inline-flex items-center justify-center rounded-xl bg-primary px-3 py-2 text-sm font-extrabold text-primary-foreground no-underline shadow-sm hover:bg-primary/90">Open Portal Admin</Link><a href="/curriculum#staff-access" className="inline-flex items-center justify-center rounded-xl border border-primary/20 bg-background px-3 py-2 text-sm font-extrabold text-primary no-underline hover:bg-primary/[0.05]">Staff access & roles</a></div>}
                </CardContent>
              </Card>}

              {readyProgrammesQuery.isLoading ? <Card><CardContent className="flex min-h-48 items-center justify-center gap-2 p-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading approved programmes…</CardContent></Card> : currentStep === 1 ? <div className="space-y-4"><div className="grid gap-4 md:grid-cols-2" aria-label="Choose a class">{grades.map((grade) => { const count = readyProgrammes.filter((programme) => programme.grade === grade).length; const isReady = count > 0; return <button key={grade} type="button" onClick={() => selectGrade(grade)} className={`group rounded-[1.5rem] border p-5 text-left shadow-sm transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:p-7 ${isReady ? "border-border/80 bg-card hover:border-primary/35" : "border-dashed border-border/90 bg-muted/20 hover:border-primary/30"}`}><div className="flex items-start justify-between gap-4"><div className={`flex h-10 w-10 items-center justify-center rounded-xl ${isReady ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}><BookOpenCheck className="h-5 w-5" /></div><span className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${isReady ? "border border-emerald-200 bg-emerald-50 text-emerald-700" : "border border-amber-200 bg-amber-50 text-amber-800"}`}>{isReady ? "Ready to prepare" : "Subject setup"}</span></div><h2 className="mt-6 text-xl font-extrabold tracking-[-0.035em] text-foreground sm:text-2xl">Grade {grade}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{isReady ? `${count} approved ${count === 1 ? "subject" : "subjects"} available.` : "Start by naming the subject and uploading its textbook."}</p><p className="mt-5 flex items-center gap-1 text-sm font-extrabold text-primary">{isReady ? `Choose Grade ${grade}` : `Set up Grade ${grade}`}<ChevronRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" /></p></button>; })}</div><Button type="button" variant="outline" className="w-full sm:w-auto" onClick={openLibrary}><ClipboardCheck className="mr-2 h-4 w-4" />{isAuthenticated ? "Open draft library" : "Staff sign in to open drafts"}</Button></div> : <>
                <Button type="button" variant="ghost" className="academy-back-button" onClick={isGrade9 ? returnToGrades : returnToGrades} onKeyDown={(event) => handleReturnKey(event, returnToGrades)} aria-label="Return to class selection"><ArrowLeft className="h-4 w-4" />Back to grades</Button>
                {isGrade9 ? <Card className="border-primary/15 bg-card shadow-sm"><CardContent className="p-7 sm:p-10"><p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-primary">Grade 9 · Curriculum intake</p>{canManageGrade9Intake ? <><h2 className="mt-3 text-2xl font-extrabold tracking-[-0.04em] text-foreground">What subject are you adding?</h2><p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">Add one subject at a time. Portal Admin uploads the textbook, reviews extraction quality, and explicitly activates the approved edition before teachers can generate anything.</p><Link href="/curriculum?grade=9&intake=subject" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-extrabold text-primary-foreground no-underline shadow-sm hover:bg-primary/90">Add Grade 9 subject <ChevronRight className="h-4 w-4" /></Link></> : <><h2 className="mt-3 text-2xl font-extrabold tracking-[-0.04em] text-foreground">Grade 9 is being prepared.</h2><p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">Grade 9 remains unavailable for generation until Portal Admin uploads and reviews each subject’s approved textbook. This protects teachers and students from incomplete or unverified source material.</p></>}</CardContent></Card> : currentStep === 2 ? <div className="grid gap-3 sm:grid-cols-3" aria-label="Choose a subject">{programmesForSelectedGrade.map((programme) => { const presentation = subjectPresentation[programme.subject] ?? { eyebrow: programme.board, Icon: BookOpenCheck, iconTone: "bg-primary/10 text-primary", cardTone: "border-primary/15 hover:border-primary/35", accentTone: "bg-primary" }; const SubjectIcon = presentation.Icon; return <button key={programme.id} type="button" onClick={() => setSelectedProgramme(programme)} className={`group relative overflow-hidden rounded-[1.35rem] border bg-card p-5 text-left shadow-sm transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.985] ${presentation.cardTone}`}><span className={`absolute inset-x-0 top-0 h-1 ${presentation.accentTone}`} aria-hidden="true" /><div className={`flex h-10 w-10 items-center justify-center rounded-xl ${presentation.iconTone}`}><SubjectIcon className="h-5 w-5" /></div><p className="mt-5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-muted-foreground">{presentation.eyebrow}</p><h2 className="mt-1 text-xl font-extrabold tracking-[-0.04em] text-foreground sm:text-2xl">{programme.teacherLabel}</h2><p className="mt-2 text-sm leading-5 text-muted-foreground">Approved source-grounded preparation</p><p className="mt-5 flex items-center gap-1 text-sm font-extrabold text-primary">Continue <ChevronRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" /></p></button>; })}</div> : <Card className="overflow-hidden border-primary/15 bg-card shadow-[0_18px_55px_oklch(0.36_0.12_255_/_0.08)]"><CardContent className="p-6 sm:p-9"><p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-primary">Selected subject</p><h2 className="mt-3 text-2xl font-extrabold tracking-[-0.045em] text-foreground sm:text-4xl">Grade {selectedProgramme?.grade} · {selectedProgramme?.teacherLabel}</h2><p className="mt-2 text-sm font-semibold text-primary">Open the builder.</p><p className="mt-2 text-sm text-muted-foreground">Assessment type and approved source are selected inside the next focused step.</p><div className="mt-6 flex flex-col gap-3 sm:flex-row"><Button type="button" variant="outline" onClick={returnToSubjects} onKeyDown={(event) => handleReturnKey(event, returnToSubjects)} aria-label="Return to subject selection"><ArrowLeft className="mr-2 h-4 w-4" />Back to subjects</Button><Link href={`/generate?board=${encodeURIComponent(selectedProgramme!.board)}&grade=${encodeURIComponent(selectedProgramme!.grade)}&subject=${encodeURIComponent(selectedProgramme!.subject)}`} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-extrabold text-primary-foreground no-underline shadow-lg shadow-primary/20 transition-transform duration-200 hover:bg-primary/90 active:scale-[0.98]" aria-label="Open builder"><Sparkles className="h-4 w-4" />Open builder</Link></div></CardContent></Card>}
              </>}
            </div>
          )}
        </section>
      </main>
    </AcademyShell>
  );
}

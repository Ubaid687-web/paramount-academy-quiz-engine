import React, { useMemo, useState } from "react";
import { ArrowLeft, Atom, Beaker, BookOpenCheck, ChevronRight, ClipboardCheck, FileQuestion, LaptopMinimal, Loader2, Sparkles, Trash2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { AcademyShell } from "@/components/AcademyShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";

type ReadyProgramme = { id: number; board: string; grade: string; subject: string; teacherLabel: string };

const subjectPresentation: Record<string, { eyebrow: string; Icon: typeof Atom; iconTone: string; cardTone: string; accentTone: string }> = {
  physics: { eyebrow: "Matter & motion", Icon: Atom, iconTone: "bg-sky-100 text-sky-700", cardTone: "border-sky-100 hover:border-sky-300", accentTone: "bg-sky-500" },
  chemistry: { eyebrow: "Matter & change", Icon: Beaker, iconTone: "bg-violet-100 text-violet-700", cardTone: "border-violet-100 hover:border-violet-300", accentTone: "bg-violet-500" },
  computer_science: { eyebrow: "Logic & systems", Icon: LaptopMinimal, iconTone: "bg-emerald-100 text-emerald-700", cardTone: "border-emerald-100 hover:border-emerald-300", accentTone: "bg-emerald-500" },
};

export default function QuizList() {
  const [, navigate] = useLocation();
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
  const [selectedProgramme, setSelectedProgramme] = useState<ReadyProgramme | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const shouldLoadLibrary = selectedGrade !== null;
  const readyProgrammesQuery = trpc.curriculum.listReadyProgrammes.useQuery();
  const readyProgrammes = (readyProgrammesQuery.data ?? []).filter((programme) => programme.status === "ready");
  const grades = useMemo(() => Array.from(new Set(readyProgrammes.map((programme) => programme.grade))).sort((left, right) => Number(right) - Number(left) || left.localeCompare(right)), [readyProgrammes]);
  const { data: quizzes, isLoading, error, refetch } = trpc.quiz.getAll.useQuery(undefined, {
    enabled: shouldLoadLibrary,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  const deleteQuizMutation = trpc.quiz.deleteQuiz.useMutation();

  const selectGrade = (grade: string) => {
    setSelectedGrade(grade);
    setSelectedProgramme(null);
  };

  const returnToGrades = () => {
    setSelectedGrade(null);
    setSelectedProgramme(null);
  };

  const returnToSubjects = () => {
    setSelectedProgramme(null);
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

  const programmesForSelectedGrade = selectedGrade ? readyProgrammes.filter((programme) => programme.grade === selectedGrade) : [];

  return (
    <AcademyShell eyebrow="Teacher MCQ Workspace">
      <main className="container py-6 sm:py-10">
        <section className="mx-auto max-w-4xl">
          {!selectedGrade ? <>
            <div className="relative mb-7 overflow-hidden rounded-[1.75rem] border border-primary/10 bg-card px-5 py-7 shadow-[0_18px_55px_oklch(0.36_0.12_255_/_0.07)] sm:mb-9 sm:px-10 sm:py-10">
              <div className="absolute -right-14 -top-16 h-44 w-44 rounded-full bg-primary/[0.045]" aria-hidden="true" />
              <div className="relative max-w-2xl">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-primary">Quiz preparation</p>
                <h1 className="mt-3 text-[2rem] font-extrabold tracking-[-0.055em] text-foreground sm:text-5xl">Select a class.</h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">Start a new assessment.</p>
              </div>
            </div>
            {readyProgrammesQuery.isLoading ? <Card><CardContent className="flex items-center gap-2 p-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading approved programmes…</CardContent></Card> : <div className="grid gap-4 md:grid-cols-2" aria-label="Choose a class">{grades.map((grade) => { const count = readyProgrammes.filter((programme) => programme.grade === grade).length; return <button key={grade} type="button" onClick={() => selectGrade(grade)} className="group rounded-[1.5rem] border border-border/80 bg-card p-5 text-left shadow-sm transition-[transform,box-shadow,border-color,background-color] duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:translate-y-0 active:scale-[0.985] sm:p-7"><div className="flex items-start justify-between gap-4"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><BookOpenCheck className="h-5 w-5" /></div><span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-extrabold text-emerald-700">Ready to prepare</span></div><h2 className="mt-6 text-xl font-extrabold tracking-[-0.035em] text-foreground sm:text-2xl">Grade {grade}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{count} approved {count === 1 ? "subject" : "subjects"} available for source-grounded assessment drafts.</p><p className="mt-5 flex items-center gap-1 text-sm font-extrabold text-primary">Choose Grade {grade}<ChevronRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" /></p></button>; })}{!grades.length && <Card className="border-dashed md:col-span-2"><CardContent className="p-6 text-sm text-muted-foreground">No programme is ready for teachers yet. Portal Admin must review and activate a curriculum edition first.</CardContent></Card>}</div>}
          </> : !selectedProgramme ? <>
            <Button type="button" variant="ghost" className="academy-back-button mb-5" onClick={returnToGrades} onKeyDown={(event) => handleReturnKey(event, returnToGrades)} aria-label="Return to class selection"><ArrowLeft className="h-4 w-4" />Change class</Button>
            <div className="mb-6 rounded-[1.5rem] border border-primary/10 bg-card px-5 py-6 shadow-[0_14px_42px_oklch(0.36_0.12_255_/_0.06)] sm:mb-7 sm:px-7"><p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-primary">Grade {selectedGrade}</p><h1 className="mt-2 text-[2rem] font-extrabold tracking-[-0.055em] text-foreground">Choose a subject.</h1></div>
            <div className="grid gap-3 sm:grid-cols-3 sm:gap-4" aria-label="Choose a subject">{programmesForSelectedGrade.map((programme) => { const presentation = subjectPresentation[programme.subject] ?? { eyebrow: programme.board, Icon: BookOpenCheck, iconTone: "bg-primary/10 text-primary", cardTone: "border-primary/15 hover:border-primary/35", accentTone: "bg-primary" }; const SubjectIcon = presentation.Icon; return <button key={programme.id} type="button" onClick={() => setSelectedProgramme(programme)} className={`group relative overflow-hidden rounded-[1.35rem] border bg-card p-5 text-left shadow-sm transition-[transform,box-shadow,border-color,background-color] duration-200 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:translate-y-0 active:scale-[0.985] ${presentation.cardTone}`}><span className={`absolute inset-x-0 top-0 h-1 ${presentation.accentTone}`} aria-hidden="true" /><div className={`flex h-10 w-10 items-center justify-center rounded-xl ${presentation.iconTone}`}><SubjectIcon className="h-5 w-5" /></div><p className="mt-5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-muted-foreground">{presentation.eyebrow}</p><h2 className="mt-1 text-xl font-extrabold tracking-[-0.04em] text-foreground sm:text-2xl">{programme.teacherLabel}</h2><p className="mt-2 text-sm leading-5 text-muted-foreground">Approved source-grounded assessment preparation</p><p className="mt-5 flex items-center gap-1 text-sm font-extrabold text-primary">Continue <ChevronRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" /></p></button>; })}</div>
          </> : <>
            <Button type="button" variant="ghost" className="academy-back-button mb-5" onClick={returnToSubjects} onKeyDown={(event) => handleReturnKey(event, returnToSubjects)} aria-label="Return to subject selection"><ArrowLeft className="h-4 w-4" />Change subject</Button>
            <Card className="overflow-hidden border-primary/15 bg-card shadow-[0_18px_55px_oklch(0.36_0.12_255_/_0.08)]"><CardContent className="p-6 sm:p-9"><p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-primary">Ready</p><h1 className="mt-3 text-[2rem] font-extrabold tracking-[-0.055em] text-foreground sm:text-4xl">Grade {selectedProgramme.grade} · {selectedProgramme.teacherLabel}</h1><Link href={`/generate?board=${encodeURIComponent(selectedProgramme.board)}&grade=${encodeURIComponent(selectedProgramme.grade)}&subject=${encodeURIComponent(selectedProgramme.subject)}`} className="mt-7 inline-flex no-underline"><Button size="lg" className="rounded-xl bg-primary px-5 font-extrabold text-primary-foreground shadow-lg shadow-primary/20 transition-transform duration-200 hover:bg-primary/90 active:scale-[0.98]"><Sparkles className="mr-2 h-4 w-4" />Open builder</Button></Link></CardContent></Card>
          </>}
        </section>

        <section className="mt-14 border-t border-border pt-8">
          <div className="mb-4 flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Assessment library</p><h2 className="mt-1 text-2xl font-bold text-foreground">Recent MCQ drafts</h2></div><span className="text-sm text-muted-foreground">{shouldLoadLibrary ? `${quizzes?.length ?? 0} available` : "Loads after class selection"}</span></div>
          {shouldLoadLibrary && isLoading && <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" role="status" aria-live="polite" aria-label="Loading recent MCQ drafts" aria-busy="true"><span className="sr-only">Loading recent MCQ drafts</span>{Array.from({ length: 3 }, (_, index) => <Card key={index} className="border-border/70 shadow-sm"><CardContent className="min-h-52 p-5"><div className="flex items-start justify-between"><Skeleton className="h-10 w-10 rounded-xl bg-primary/10" /><Skeleton className="h-8 w-8 rounded-lg bg-muted" /></div><div className="mt-5 space-y-3"><Skeleton className="h-5 w-4/5 bg-muted" /><Skeleton className="h-4 w-full bg-muted" /><Skeleton className="h-4 w-3/5 bg-muted" /></div><div className="mt-7 flex items-center justify-between border-t border-border pt-4"><Skeleton className="h-4 w-20 bg-muted" /><Skeleton className="h-4 w-12 bg-muted" /></div></CardContent></Card>)}</div>}
          {error && <Card className="border-destructive/40"><CardContent className="py-8 text-sm text-destructive">The assessment library could not be loaded. {error.message}</CardContent></Card>}
          {!shouldLoadLibrary && <Card className="border-dashed border-border bg-card/70"><CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground"><ClipboardCheck className="h-5 w-5 shrink-0 text-primary" />Choose a class above to load its recent MCQ drafts.</CardContent></Card>}
          {shouldLoadLibrary && !isLoading && !error && quizzes?.length === 0 && <Card className="border-dashed border-border bg-card/70"><CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground"><ClipboardCheck className="h-5 w-5 shrink-0 text-primary" />No MCQ draft has been saved yet. Follow the class and subject path above when you are ready.</CardContent></Card>}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{quizzes?.map((quiz) => <Card key={quiz.id} className="group border-border/80 shadow-sm transition-shadow hover:shadow-md"><CardContent className="flex min-h-52 flex-col p-5"><div className="flex items-start justify-between gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/8 text-primary"><BookOpenCheck className="h-5 w-5" /></div><Button variant="ghost" size="icon" aria-label={`Delete ${quiz.title}`} className="text-muted-foreground hover:text-destructive" onClick={() => setConfirmDelete(quiz.id)}><Trash2 className="h-4 w-4" /></Button></div><div className="mt-5 flex-1"><p className="line-clamp-2 text-lg font-bold text-foreground">{quiz.title}</p><p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{quiz.description || "Source-grounded MCQ assessment"}</p></div><div className="mt-5 flex items-center justify-between border-t border-border pt-4"><span className="text-sm text-muted-foreground"><strong className="text-foreground">{quiz.totalQuestions}</strong> MCQs</span><Button variant="ghost" className="h-auto p-0 text-primary hover:bg-transparent hover:text-primary/75" onClick={() => navigate(`/quiz/${quiz.id}`)}>Open <ChevronRight className="ml-1 h-4 w-4" /></Button></div></CardContent></Card>)}</div>
          {confirmDelete !== null && <Card className="fixed inset-x-4 bottom-5 z-50 mx-auto max-w-md border-destructive/30 shadow-xl"><CardContent className="p-5"><p className="font-bold text-foreground">Remove this quiz?</p><p className="mt-1 text-sm text-muted-foreground">The quiz and its associated attempts will be removed.</p><div className="mt-4 flex justify-end gap-2"><Button variant="outline" onClick={() => setConfirmDelete(null)}>Keep quiz</Button><Button variant="destructive" disabled={deletingId === confirmDelete} onClick={() => handleDelete(confirmDelete)}>{deletingId === confirmDelete ? "Removing…" : "Remove"}</Button></div></CardContent></Card>}
        </section>
      </main>
    </AcademyShell>
  );
}

import React, { useState } from "react";
import { BookOpenCheck, ChevronRight, ClipboardCheck, FileQuestion, Loader2, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { AcademyShell } from "@/components/AcademyShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";

const gradeReadiness = [
  { grade: "Grade 10", label: "Current priority", detail: "Physics, Chemistry, and Computer Science specifications are analysed and ready for curriculum setup.", status: "Ready for setup", tone: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { grade: "Grade 9", label: "Structured for intake", detail: "The grade has a changed pattern. Its workflow is ready; approved books and current paper pattern must be confirmed before use.", status: "Awaiting curriculum", tone: "bg-amber-50 text-amber-700 border-amber-200" },
];

export default function QuizList() {
  const [, navigate] = useLocation();
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const { data: quizzes, isLoading, error, refetch } = trpc.quiz.getAll.useQuery();
  const deleteQuizMutation = trpc.quiz.deleteQuiz.useMutation();

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
    <AcademyShell>
      <main className="container py-8 sm:py-12">
        <section className="relative overflow-hidden rounded-3xl border border-border bg-card px-6 py-9 shadow-sm sm:px-10 sm:py-12">
          <div className="absolute inset-y-0 right-0 hidden w-[42%] bg-[radial-gradient(circle_at_80%_20%,oklch(0.91_0.07_250),transparent_58%),radial-gradient(circle_at_42%_80%,oklch(0.94_0.06_90),transparent_45%)] lg:block" />
          <div className="relative max-w-2xl">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-primary"><ClipboardCheck className="h-3.5 w-3.5" />MCQ assessment workspace</p>
            <h1 className="max-w-xl text-4xl font-bold leading-tight text-foreground sm:text-5xl">A focused quiz engine for better board preparation.</h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">Create source-grounded MCQ drafts, review every item, and keep assessment evidence connected to the approved curriculum—not to guesses.</p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link href="/generate" className="no-underline"><Button size="lg" className="bg-primary px-5 text-primary-foreground shadow-sm hover:bg-primary/90"><Sparkles className="mr-2 h-4 w-4" />Open Quiz Builder</Button></Link>
              <span className="text-sm text-muted-foreground">Drafts require administrator review.</span>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2" aria-label="Grade readiness">
          {gradeReadiness.map((item) => (
            <Card key={item.grade} className="border-border/80 shadow-sm"><CardContent className="flex h-full flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
              <div><p className="text-lg font-bold text-foreground">{item.grade}</p><p className="mt-1 text-sm font-semibold text-primary">{item.label}</p><p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{item.detail}</p></div>
              <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${item.tone}`}>{item.status}</span>
            </CardContent></Card>
          ))}
        </section>

        <section className="mt-10">
          <div className="mb-4 flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Assessment library</p><h2 className="mt-1 text-2xl font-bold text-foreground">MCQ drafts and practice sets</h2></div><span className="text-sm text-muted-foreground">{quizzes?.length ?? 0} available</span></div>
          {isLoading && <Card><CardContent className="flex items-center gap-3 py-10 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Loading assessment library…</CardContent></Card>}
          {error && <Card className="border-destructive/40"><CardContent className="py-8 text-sm text-destructive">The assessment library could not be loaded. {error.message}</CardContent></Card>}
          {!isLoading && !error && quizzes?.length === 0 && <Card className="border-dashed border-border bg-card/70"><CardContent className="flex flex-col items-start gap-4 p-7 sm:flex-row sm:items-center"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted text-primary"><FileQuestion className="h-5 w-5" /></div><div><p className="font-bold text-foreground">No draft has been saved yet.</p><p className="mt-1 text-sm leading-6 text-muted-foreground">Use the Quiz Builder above when you are ready to create the first reviewed MCQ draft.</p></div></CardContent></Card>}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {quizzes?.map((quiz) => <Card key={quiz.id} className="group border-border/80 shadow-sm transition-shadow hover:shadow-md"><CardContent className="flex min-h-56 flex-col p-5"><div className="flex items-start justify-between gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/8 text-primary"><BookOpenCheck className="h-5 w-5" /></div><Button variant="ghost" size="icon" aria-label={`Delete ${quiz.title}`} className="text-muted-foreground hover:text-destructive" onClick={() => setConfirmDelete(quiz.id)}><Trash2 className="h-4 w-4" /></Button></div><div className="mt-5 flex-1"><p className="line-clamp-2 text-lg font-bold text-foreground">{quiz.title}</p><p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{quiz.description || "Source-grounded MCQ assessment"}</p></div><div className="mt-5 flex items-center justify-between border-t border-border pt-4"><span className="text-sm text-muted-foreground"><strong className="text-foreground">{quiz.totalQuestions}</strong> MCQs</span><Button variant="ghost" className="h-auto p-0 text-primary hover:bg-transparent hover:text-primary/75" onClick={() => navigate(`/quiz/${quiz.id}`)}>Open <ChevronRight className="ml-1 h-4 w-4" /></Button></div></CardContent></Card>)}
          </div>
          {confirmDelete !== null && <Card className="fixed inset-x-4 bottom-5 z-50 mx-auto max-w-md border-destructive/30 shadow-xl"><CardContent className="p-5"><p className="font-bold text-foreground">Remove this quiz?</p><p className="mt-1 text-sm text-muted-foreground">The quiz and its associated attempts will be removed.</p><div className="mt-4 flex justify-end gap-2"><Button variant="outline" onClick={() => setConfirmDelete(null)}>Keep quiz</Button><Button variant="destructive" disabled={deletingId === confirmDelete} onClick={() => handleDelete(confirmDelete)}>{deletingId === confirmDelete ? "Removing…" : "Remove"}</Button></div></CardContent></Card>}
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3" aria-label="Workflow safeguards">
          {[{ icon: ShieldCheck, title: "Review first", text: "Every AI-created item stays in draft status until reviewed." }, { icon: BookOpenCheck, title: "Use approved sources", text: "Curriculum setup connects chapter and half-chapter scopes to reviewed text." }, { icon: ClipboardCheck, title: "MCQ only", text: "This module is deliberately focused on multiple-choice assessment." }].map(({ icon: Icon, title, text }) => <div key={title} className="rounded-2xl border border-border/75 bg-card/60 p-5"><Icon className="h-5 w-5 text-primary" /><p className="mt-3 font-bold text-foreground">{title}</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{text}</p></div>)}
        </section>
      </main>
    </AcademyShell>
  );
}

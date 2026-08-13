import React, { useState } from "react";
import { ArrowLeft, BookOpenCheck, ChevronRight, ClipboardCheck, FileQuestion, Loader2, Sparkles, Trash2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { AcademyShell } from "@/components/AcademyShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";

type Grade = "9" | "10";
type Subject = "physics" | "chemistry" | "computer_science";

const gradeCards: Array<{ grade: Grade; title: string; summary: string; state: string; tone: string }> = [
  { grade: "10", title: "Grade 10", summary: "The current MCQ preparation priority. Choose a subject to prepare a source-grounded draft.", state: "Ready to prepare", tone: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  { grade: "9", title: "Grade 9", summary: "Choose a subject to view its separate curriculum-intake status. Grade 10 rules are not reused here.", state: "Curriculum intake", tone: "border-amber-200 bg-amber-50 text-amber-700" },
];

const subjects: Array<{ id: Subject; title: string; short: string }> = [
  { id: "physics", title: "Physics", short: "Conceptual board-style MCQ preparation" },
  { id: "chemistry", title: "Chemistry", short: "Conceptual board-style MCQ preparation" },
  { id: "computer_science", title: "Computer Science", short: "Conceptual board-style MCQ preparation" },
];

export default function QuizList() {
  const [, navigate] = useLocation();
  const [selectedGrade, setSelectedGrade] = useState<Grade | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const { data: quizzes, isLoading, error, refetch } = trpc.quiz.getAll.useQuery();
  const deleteQuizMutation = trpc.quiz.deleteQuiz.useMutation();

  const selectGrade = (grade: Grade) => {
    setSelectedGrade(grade);
    setSelectedSubject(null);
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

  const selectedSubjectInfo = subjects.find((subject) => subject.id === selectedSubject);

  return (
    <AcademyShell eyebrow="Teacher MCQ Workspace">
      <main className="container py-8 sm:py-12">
        <section className="mx-auto max-w-4xl">
          {!selectedGrade ? <>
            <div className="mb-8 text-center">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Teacher workspace</p>
              <h1 className="mt-3 text-3xl font-bold text-foreground sm:text-5xl">Start with the class you teach.</h1>
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">Choose one grade first. The next screen will show only the relevant subjects and one clear action—no technical setup or unnecessary buttons.</p>
            </div>
            <div className="grid gap-5 md:grid-cols-2" aria-label="Choose a class">
              {gradeCards.map((item) => <button key={item.grade} onClick={() => selectGrade(item.grade)} data-state="idle" className="workflow-choice group p-7"><div className="flex items-start justify-between gap-4"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"><BookOpenCheck className="h-5 w-5" /></div><span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${item.tone}`}>{item.state}</span></div><h2 className="mt-7 text-2xl font-bold text-foreground">{item.title}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{item.summary}</p><p className="mt-6 flex items-center gap-1 text-sm font-bold text-primary">Choose {item.title}<ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></p></button>)}
            </div>
            <p className="mt-7 text-center text-xs leading-5 text-muted-foreground">Curriculum configuration is managed separately through Portal Admin, so teachers can remain focused on preparation.</p>
          </> : !selectedSubject ? <>
            <button onClick={() => selectGrade(selectedGrade)} className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Change class</button>
            <div className="mb-7"><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">{selectedGrade === "10" ? "Grade 10 preparation" : "Grade 9 curriculum intake"}</p><h1 className="mt-2 text-3xl font-bold text-foreground">Choose a subject.</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{selectedGrade === "10" ? "Only current MCQ-engine subjects are shown." : "Select a subject to see what is needed before Grade 9 MCQ drafting can begin."}</p></div>
            <div className="grid gap-4 sm:grid-cols-3" aria-label="Choose a subject">{subjects.map((subject) => <button key={subject.id} onClick={() => setSelectedSubject(subject.id)} data-state="idle" className="workflow-choice group p-5"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><FileQuestion className="h-4 w-4" /></div><h2 className="mt-5 font-bold text-foreground">{subject.title}</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">{selectedGrade === "10" ? subject.short : "Separate Grade 9 pattern and source confirmation"}</p><p className="mt-4 flex items-center gap-1 text-xs font-bold text-primary">Continue <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" /></p></button>)}</div>
          </> : <>
            <button onClick={() => setSelectedSubject(null)} className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Change subject</button>
            <Card className="border-border bg-card shadow-sm"><CardContent className="p-7 sm:p-9"><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">{selectedGrade === "10" ? "Ready for teacher preparation" : "Not yet enabled"}</p><h1 className="mt-3 text-3xl font-bold text-foreground">Grade {selectedGrade} · {selectedSubjectInfo?.title}</h1>{selectedGrade === "10" ? <><p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Prepare one MCQ draft using temporary source text or the reviewed curriculum chosen by the academy administrator. You will see only the choices needed for this subject.</p><Link href={`/generate?grade=10&subject=${selectedSubject}`} className="mt-7 inline-flex no-underline"><Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90"><Sparkles className="mr-2 h-4 w-4" />Prepare {selectedSubjectInfo?.title} MCQ draft</Button></Link></> : <><p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Grade 9 {selectedSubjectInfo?.title} is waiting for the revised FBISE pattern and approved material. Once confirmed, it will receive its own curriculum and MCQ settings—not a copied Grade 10 configuration.</p><div className="mt-7 inline-flex rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">Next input needed: current Grade 9 textbook and paper pattern</div></>}</CardContent></Card>
          </>}
        </section>

        <section className="mt-14 border-t border-border pt-8">
          <div className="mb-4 flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Assessment library</p><h2 className="mt-1 text-2xl font-bold text-foreground">Recent MCQ drafts</h2></div><span className="text-sm text-muted-foreground">{quizzes?.length ?? 0} available</span></div>
          {isLoading && <Card><CardContent className="flex items-center gap-3 py-10 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Loading drafts…</CardContent></Card>}
          {error && <Card className="border-destructive/40"><CardContent className="py-8 text-sm text-destructive">The assessment library could not be loaded. {error.message}</CardContent></Card>}
          {!isLoading && !error && quizzes?.length === 0 && <Card className="border-dashed border-border bg-card/70"><CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground"><ClipboardCheck className="h-5 w-5 shrink-0 text-primary" />No MCQ draft has been saved yet. Follow the class and subject path above when you are ready.</CardContent></Card>}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{quizzes?.map((quiz) => <Card key={quiz.id} className="group border-border/80 shadow-sm transition-shadow hover:shadow-md"><CardContent className="flex min-h-52 flex-col p-5"><div className="flex items-start justify-between gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/8 text-primary"><BookOpenCheck className="h-5 w-5" /></div><Button variant="ghost" size="icon" aria-label={`Delete ${quiz.title}`} className="text-muted-foreground hover:text-destructive" onClick={() => setConfirmDelete(quiz.id)}><Trash2 className="h-4 w-4" /></Button></div><div className="mt-5 flex-1"><p className="line-clamp-2 text-lg font-bold text-foreground">{quiz.title}</p><p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{quiz.description || "Source-grounded MCQ assessment"}</p></div><div className="mt-5 flex items-center justify-between border-t border-border pt-4"><span className="text-sm text-muted-foreground"><strong className="text-foreground">{quiz.totalQuestions}</strong> MCQs</span><Button variant="ghost" className="h-auto p-0 text-primary hover:bg-transparent hover:text-primary/75" onClick={() => navigate(`/quiz/${quiz.id}`)}>Open <ChevronRight className="ml-1 h-4 w-4" /></Button></div></CardContent></Card>)}</div>
          {confirmDelete !== null && <Card className="fixed inset-x-4 bottom-5 z-50 mx-auto max-w-md border-destructive/30 shadow-xl"><CardContent className="p-5"><p className="font-bold text-foreground">Remove this quiz?</p><p className="mt-1 text-sm text-muted-foreground">The quiz and its associated attempts will be removed.</p><div className="mt-4 flex justify-end gap-2"><Button variant="outline" onClick={() => setConfirmDelete(null)}>Keep quiz</Button><Button variant="destructive" disabled={deletingId === confirmDelete} onClick={() => handleDelete(confirmDelete)}>{deletingId === confirmDelete ? "Removing…" : "Remove"}</Button></div></CardContent></Card>}
        </section>
      </main>
    </AcademyShell>
  );
}

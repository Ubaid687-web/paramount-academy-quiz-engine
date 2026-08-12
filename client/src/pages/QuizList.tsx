import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useLocation, Link } from "wouter";
import { BookOpen, Loader2, AlertCircle, Sparkles, ArrowRight, Zap, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function QuizList() {
  const [, navigate] = useLocation();
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  
  const { data: quizzes, isLoading, error, refetch } = trpc.quiz.getAll.useQuery();
  const deleteQuizMutation = trpc.quiz.deleteQuiz.useMutation();

  const handleDeleteClick = (e: React.MouseEvent, quizId: number) => {
    e.stopPropagation();
    setConfirmDelete(quizId);
  };

  const handleConfirmDelete = async (quizId: number) => {
    setDeletingId(quizId);
    try {
      await deleteQuizMutation.mutateAsync({ quizId });
      toast.success("Quiz deleted successfully");
      setConfirmDelete(null);
      refetch();
    } catch (err) {
      console.error("Delete error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to delete quiz");
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
          <p className="text-muted-foreground">Loading quizzes...</p>
        </div>
      </div>
    );
  }

  if (error || !quizzes) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md border-destructive/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <CardTitle>Error Loading Quizzes</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{error?.message || "Failed to load quizzes. Please try again."}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border/50 bg-gradient-to-b from-card/50 to-background backdrop-blur-sm sticky top-0 z-10">
        <div className="container py-8 sm:py-12">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-accent/10 rounded-lg">
                  <BookOpen className="h-7 w-7 text-accent" />
                </div>
                <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-accent to-secondary bg-clip-text text-transparent">
                  Paramount Academy
                </h1>
              </div>
              <p className="text-lg text-muted-foreground max-w-2xl">
                FBISE 10th-grade MCQ drafts for Physics, Chemistry, and Computer Science.
              </p>
            </div>
            <Link href="/generate" className="no-underline">
              <Button className="bg-gradient-to-r from-accent to-secondary hover:shadow-lg hover:shadow-accent/20 text-accent-foreground font-semibold px-6 py-3 rounded-lg whitespace-nowrap group">
                <Sparkles className="mr-2 h-5 w-5 group-hover:rotate-12 transition-transform" />
                Create MCQ Draft
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="container py-12 sm:py-16">
        {quizzes.length === 0 ? (
          <div className="max-w-2xl mx-auto">
            <Card className="border-border/50 bg-card/50 backdrop-blur">
              <CardHeader className="text-center py-12">
                <div className="flex justify-center mb-4">
                  <div className="p-4 bg-accent/10 rounded-full">
                    <Sparkles className="h-8 w-8 text-accent" />
                  </div>
                </div>
                <CardTitle className="text-2xl">No Quizzes Yet</CardTitle>
                <CardDescription className="text-base mt-2">
                  Start with approved study material, then review the generated MCQ draft before student use.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center pb-8">
                <Link href="/generate" className="no-underline">
                  <Button className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold px-8 py-3">
                    <Sparkles className="mr-2 h-4 w-4" />
                    Create First MCQ Draft
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-2">Quiz Drafts and Practice Sets</h2>
              <p className="text-muted-foreground">
                {quizzes.length} quiz{quizzes.length !== 1 ? "zes" : ""} available for practice
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {quizzes.map((quiz) => (
                <div key={quiz.id} className="relative group">
                  <Card
                    className="group card-premium cursor-pointer overflow-hidden flex flex-col hover:border-accent/50 transition-all"
                    onClick={() => navigate(`/quiz/${quiz.id}`)}
                  >
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between mb-2">
                        <CardTitle className="line-clamp-2 group-hover:text-accent transition-colors text-lg">
                          {quiz.title}
                        </CardTitle>
                        <div className="flex gap-1">
                          <div className="p-2 bg-accent/10 rounded-lg group-hover:bg-accent/20 transition-colors">
                            <Zap className="h-4 w-4 text-accent" />
                          </div>
                          <Button
                            onClick={(e) => handleDeleteClick(e, quiz.id)}
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <CardDescription className="line-clamp-2 text-sm">
                        {quiz.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col justify-between">
                      <div className="mb-4">
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-muted-foreground">Total Questions</span>
                          <span className="font-semibold text-accent text-lg">{quiz.totalQuestions}</span>
                        </div>
                        <div className="w-full bg-border/50 rounded-full h-2">
                          <div className="bg-gradient-to-r from-accent to-secondary h-2 rounded-full w-full"></div>
                        </div>
                      </div>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/quiz/${quiz.id}`);
                        }}
                        className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold group-hover:shadow-lg transition-all"
                      >
                        Start Quiz
                        <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </CardContent>
                  </Card>

                  {confirmDelete === quiz.id && (
                    <div className="absolute inset-0 bg-black/80 rounded-lg flex items-center justify-center z-20 backdrop-blur-sm">
                      <Card className="card-premium border-destructive/50 bg-destructive/5 w-80">
                        <CardHeader>
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-destructive" />
                            <CardTitle>Delete Quiz?</CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <p className="text-sm text-muted-foreground">
                            This will permanently delete "{quiz.title}" and all associated attempts. This action cannot be undone.
                          </p>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => setConfirmDelete(null)}
                              variant="outline"
                              className="flex-1"
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={() => handleConfirmDelete(quiz.id)}
                              disabled={deletingId === quiz.id}
                              className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                            >
                              {deletingId === quiz.id ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Deleting...
                                </>
                              ) : (
                                "Delete"
                              )}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

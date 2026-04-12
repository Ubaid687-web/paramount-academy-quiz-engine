import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { BookOpen, Loader2, AlertCircle } from "lucide-react";

export default function QuizList() {
  const [, navigate] = useLocation();
  const { data: quizzes, isLoading, error } = trpc.quiz.getAll.useQuery();

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
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container py-6">
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="h-8 w-8 text-accent" />
            <h1 className="text-3xl font-bold text-foreground">AI Quiz Master</h1>
          </div>
          <p className="text-muted-foreground">Master AI fundamentals with comprehensive MCQ practice</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container py-12">
        {quizzes.length === 0 ? (
          <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>No Quizzes Available</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Check back soon for available quizzes.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {quizzes.map((quiz) => (
              <Card
                key={quiz.id}
                className="group hover:border-accent/50 hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden"
                onClick={() => navigate(`/quiz/${quiz.id}`)}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="line-clamp-2 group-hover:text-accent transition-colors">{quiz.title}</CardTitle>
                  <CardDescription className="line-clamp-2">{quiz.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total Questions</span>
                    <span className="font-semibold text-foreground">{quiz.totalQuestions}</span>
                  </div>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/quiz/${quiz.id}`);
                    }}
                    className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                  >
                    Start Quiz
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

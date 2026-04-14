import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useLocation, Link } from "wouter";
import { BookOpen, Loader2, AlertCircle, Sparkles, ArrowRight, Zap } from "lucide-react";

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
      {/* Premium Hero Header */}
      <div className="border-b border-border/50 bg-gradient-to-b from-card/50 to-background backdrop-blur-sm sticky top-0 z-10">
        <div className="container py-8 sm:py-12">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-accent/10 rounded-lg">
                  <BookOpen className="h-7 w-7 text-accent" />
                </div>
                <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-accent to-secondary bg-clip-text text-transparent">
                  Quiz Master
                </h1>
              </div>
              <p className="text-lg text-muted-foreground max-w-2xl">
                Create custom quizzes from any content. Learn smarter, practice better.
              </p>
            </div>
            <Link href="/generate" className="no-underline">
              <Button className="bg-gradient-to-r from-accent to-secondary hover:shadow-lg hover:shadow-accent/20 text-accent-foreground font-semibold px-6 py-3 rounded-lg whitespace-nowrap group">
                <Sparkles className="mr-2 h-5 w-5 group-hover:rotate-12 transition-transform" />
                Generate Quiz
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
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
                  Create your first quiz by pasting content or uploading materials
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center pb-8">
                <Link href="/generate" className="no-underline">
                  <Button className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold px-8 py-3">
                    <Sparkles className="mr-2 h-4 w-4" />
                    Create Your First Quiz
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-2">Your Quizzes</h2>
              <p className="text-muted-foreground">
                {quizzes.length} quiz{quizzes.length !== 1 ? "zes" : ""} available for practice
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {quizzes.map((quiz) => (
                <Card
                  key={quiz.id}
                  className="group card-premium cursor-pointer overflow-hidden flex flex-col"
                  onClick={() => navigate(`/quiz/${quiz.id}`)}
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between mb-2">
                      <CardTitle className="line-clamp-2 group-hover:text-accent transition-colors text-lg">
                        {quiz.title}
                      </CardTitle>
                      <div className="p-2 bg-accent/10 rounded-lg group-hover:bg-accent/20 transition-colors">
                        <Zap className="h-4 w-4 text-accent" />
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
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

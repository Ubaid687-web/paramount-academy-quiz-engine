import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Loader2, AlertCircle, CheckCircle2, XCircle, Home, RotateCcw, Award, TrendingUp } from "lucide-react";

export default function QuizResults({ params }: { params: { quizId: string } }) {
  const [, navigate] = useLocation();
  const quizId = parseInt(params.quizId);

  const { data: results, isLoading } = trpc.quiz.getAttemptResults.useQuery({ attemptId: quizId });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
          <p className="text-muted-foreground">Loading results...</p>
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-destructive/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <CardTitle>Results Not Found</CardTitle>
            </div>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const { attempt, answers } = results;
  const percentage = attempt.percentage;
  const isPerfect = percentage === 100;
  const isGood = percentage >= 80;
  const isOkay = percentage >= 60;

  let resultMessage = "";
  let resultColor = "";
  let resultIcon = "";
  if (isPerfect) {
    resultMessage = "Perfect Score! Outstanding!";
    resultColor = "text-green-400";
  } else if (isGood) {
    resultMessage = "Excellent Work!";
    resultColor = "text-green-400";
  } else if (isOkay) {
    resultMessage = "Good Effort!";
    resultColor = "text-yellow-400";
  } else {
    resultMessage = "Keep Practicing!";
    resultColor = "text-orange-400";
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Premium Header */}
      <div className="border-b border-border/50 bg-gradient-to-b from-card/50 to-background backdrop-blur-sm sticky top-0 z-10">
        <div className="container py-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent/10 rounded-lg">
              <Award className="h-6 w-6 text-accent" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Quiz Complete!</h1>
              <p className="text-muted-foreground">Review your performance</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-8 sm:py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Score Card */}
          <Card className="card-premium overflow-hidden">
            <CardContent className="pt-8">
              <div className="text-center mb-8">
                <p className={`text-6xl font-bold mb-2 ${resultColor}`}>{percentage}%</p>
                <p className={`text-2xl font-semibold ${resultColor} mb-6`}>{resultMessage}</p>
                <div className="w-full bg-border/50 rounded-full h-3 mb-6">
                  <div
                    className={`h-3 rounded-full transition-all duration-1000 ${
                      isPerfect
                        ? "bg-gradient-to-r from-green-400 to-green-500"
                        : isGood
                        ? "bg-gradient-to-r from-green-400 to-yellow-400"
                        : isOkay
                        ? "bg-gradient-to-r from-yellow-400 to-orange-400"
                        : "bg-gradient-to-r from-orange-400 to-red-400"
                    }`}
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>

              {/* Score Breakdown */}
              <div className="grid grid-cols-3 gap-4 p-6 rounded-lg bg-card/50 border border-border/50">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">Correct</p>
                  <p className="text-3xl font-bold text-green-400">{attempt.score}</p>
                </div>
                <div className="text-center border-l border-r border-border/50">
                  <p className="text-sm text-muted-foreground mb-2">Incorrect</p>
                  <p className="text-3xl font-bold text-red-400">{attempt.totalQuestions - attempt.score}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">Total</p>
                  <p className="text-3xl font-bold text-accent">{attempt.totalQuestions}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Answer Review */}
          <div>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-accent" />
              Answer Review
            </h2>
            <div className="space-y-4">
              {answers.map((answer, idx) => {
                const isCorrect = answer.isCorrect === 1;
                const question = answer.question;
                return (
                  <Card
                    key={idx}
                    className={`card-premium ${
                      isCorrect
                        ? "border-green-500/30 bg-green-500/5 hover:border-green-500/50"
                        : "border-red-500/30 bg-red-500/5 hover:border-red-500/50"
                    }`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-semibold text-muted-foreground">Question {idx + 1}</span>
                            {isCorrect ? (
                              <CheckCircle2 className="h-4 w-4 text-green-400" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-400" />
                            )}
                          </div>
                          <CardTitle className="text-lg leading-relaxed">{question?.questionText}</CardTitle>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {question && (
                        <>
                          <div>
                            <p className="text-sm font-semibold text-muted-foreground mb-2">Your Answer</p>
                            <div
                              className={`p-3 rounded-lg border-2 ${
                                isCorrect
                                  ? "bg-green-500/20 border-green-500/50 text-green-400"
                                  : "bg-red-500/20 border-red-500/50 text-red-400"
                              }`}
                            >
                              <span className="font-semibold">{answer.selectedAnswer}.</span>{" "}
                              {String(question[`option${answer.selectedAnswer}` as keyof typeof question])}
                            </div>
                          </div>

                          {!isCorrect && (
                            <div>
                              <p className="text-sm font-semibold text-muted-foreground mb-2">Correct Answer</p>
                              <div className="p-3 rounded-lg bg-green-500/20 border-2 border-green-500/50 text-green-400">
                                <span className="font-semibold">{question.correctAnswer}.</span>{" "}
                                {String(question[`option${question.correctAnswer}` as keyof typeof question])}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => navigate("/")}
              variant="outline"
              className="flex-1 border-border/50 hover:bg-card hover:border-accent/30"
            >
              <Home className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
            <Button
              onClick={() => navigate(`/quiz/${quizId}`)}
              className="flex-1 bg-gradient-to-r from-accent to-secondary hover:shadow-lg hover:shadow-accent/20 text-accent-foreground font-semibold"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Retake Quiz
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

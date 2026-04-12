import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Loader2, AlertCircle, CheckCircle2, XCircle, ChevronDown, ChevronUp } from "lucide-react";

export default function QuizResults({ params }: { params: { attemptId: string } }) {
  const [, navigate] = useLocation();
  const attemptId = parseInt(params.attemptId);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(new Set());

  const { data: result, isLoading, error } = trpc.quiz.getAttemptResults.useQuery({ attemptId });

  const toggleExpanded = (questionId: number) => {
    const newSet = new Set(expandedQuestions);
    if (newSet.has(questionId)) {
      newSet.delete(questionId);
    } else {
      newSet.add(questionId);
    }
    setExpandedQuestions(newSet);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-destructive/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <CardTitle>Results Not Found</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{error?.message || "Could not load quiz results."}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { attempt, answers } = result;
  const scorePercentage = attempt.percentage;
  const scoreColor = scorePercentage >= 70 ? "text-green-400" : scorePercentage >= 50 ? "text-yellow-400" : "text-red-400";
  const bgColor = scorePercentage >= 70 ? "bg-green-500/10" : scorePercentage >= 50 ? "bg-yellow-500/10" : "bg-red-500/10";

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container py-6">
          <h1 className="text-3xl font-bold text-foreground">Quiz Complete!</h1>
          <p className="text-muted-foreground mt-1">Review your performance below</p>
        </div>
      </div>

      <div className="container py-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Score Card */}
          <Card className={`${bgColor} border-accent/30`}>
            <CardContent className="pt-8 pb-8">
              <div className="text-center space-y-4">
                <div>
                  <p className="text-muted-foreground mb-2">Your Score</p>
                  <p className={`text-5xl font-bold ${scoreColor}`}>{scorePercentage}%</p>
                </div>
                <div className="flex justify-center gap-8">
                  <div>
                    <p className="text-muted-foreground text-sm">Correct</p>
                    <p className="text-2xl font-semibold text-green-400">{attempt.score}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">Incorrect</p>
                    <p className="text-2xl font-semibold text-red-400">{attempt.totalQuestions - attempt.score}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">Total</p>
                    <p className="text-2xl font-semibold text-foreground">{attempt.totalQuestions}</p>
                  </div>
                </div>
                <div className="pt-4">
                  {scorePercentage >= 70 && <p className="text-green-400 font-medium">Excellent work! You've mastered this topic.</p>}
                  {scorePercentage >= 50 && scorePercentage < 70 && (
                    <p className="text-yellow-400 font-medium">Good effort! Review the incorrect answers to improve.</p>
                  )}
                  {scorePercentage < 50 && <p className="text-red-400 font-medium">Keep practicing! Review all answers to strengthen your knowledge.</p>}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Answer Review */}
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-4">Answer Review</h2>
            <div className="space-y-3">
              {answers.map((answer, index) => {
                const isExpanded = expandedQuestions.has(answer.questionId);
                const isCorrect = answer.isCorrect === 1;
                const question = answer.question;

                return (
                  <Card
                    key={answer.questionId}
                    className={`cursor-pointer transition-all ${
                      isCorrect ? "border-green-500/30 hover:border-green-500/50" : "border-red-500/30 hover:border-red-500/50"
                    }`}
                    onClick={() => toggleExpanded(answer.questionId)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <div
                            className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-1 ${
                              isCorrect ? "bg-green-500/20 border border-green-500/50" : "bg-red-500/20 border border-red-500/50"
                            }`}
                          >
                            {isCorrect ? (
                              <CheckCircle2 className="h-4 w-4 text-green-400" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-400" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-muted-foreground">Question {index + 1}</p>
                            <p className="font-medium text-foreground">{isCorrect ? "Correct" : "Incorrect"}</p>
                          </div>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        )}
                      </div>
                    </CardHeader>

                    {isExpanded && question && (
                      <CardContent className="pt-0 space-y-4 border-t border-border">
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">Question</p>
                          <p className="text-foreground font-medium">{question.questionText}</p>
                        </div>

                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">Your Answer</p>
                          <div className="p-3 rounded-lg bg-card border border-border">
                            <div className="flex items-center gap-2">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center font-semibold text-sm ${
                                isCorrect
                                  ? "bg-green-500/20 border border-green-500/50 text-green-400"
                                  : "bg-red-500/20 border border-red-500/50 text-red-400"
                              }`}>
                                {answer.selectedAnswer}
                              </div>
                              <span className="text-foreground">
                                {String(question[`option${answer.selectedAnswer}` as keyof typeof question])}
                              </span>
                            </div>
                          </div>
                        </div>

                        {!isCorrect && (
                          <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">Correct Answer</p>
                            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full flex items-center justify-center font-semibold text-sm bg-green-500/20 border border-green-500/50 text-green-400">
                                  {question.correctAnswer}
                                </div>
                                <span className="text-green-400">
                                  {String(question[`option${question.correctAnswer}` as keyof typeof question])}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => navigate("/")} className="flex-1">
              Back to Quizzes
            </Button>
            <Button onClick={() => navigate("/")} className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground">
              Take Another Quiz
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

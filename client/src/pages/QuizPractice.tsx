import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Loader2, AlertCircle, CheckCircle2, XCircle } from "lucide-react";

interface Question {
  id: number;
  questionNumber: number;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
}

interface UserAnswer {
  questionId: number;
  selectedAnswer: string;
  isCorrect: number;
}

export default function QuizPractice({ params }: { params: { quizId: string } }) {
  const [, navigate] = useLocation();
  const quizId = parseInt(params.quizId);
  const [shuffle, setShuffle] = useState(false);
  const [quizStarted, setQuizStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);

  const { data: quiz, isLoading: quizLoading } = trpc.quiz.getById.useQuery({ quizId });
  const { data: questions, isLoading: questionsLoading } = trpc.quiz.getQuestions.useQuery(
    { quizId, shuffle },
    { enabled: quizStarted }
  );

  const submitAttempt = trpc.quiz.submitAttempt.useMutation();

  if (quizLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md border-destructive/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <CardTitle>Quiz Not Found</CardTitle>
            </div>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!quizStarted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl mb-2">{quiz.title}</CardTitle>
            <p className="text-muted-foreground">{quiz.description}</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-card/50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total Questions</span>
                <span className="font-semibold text-lg">{quiz.totalQuestions}</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-accent/10 rounded-md">
                <input
                  type="checkbox"
                  id="shuffle"
                  checked={shuffle}
                  onChange={(e) => setShuffle(e.target.checked)}
                  className="w-4 h-4 rounded border-border cursor-pointer"
                />
                <label htmlFor="shuffle" className="cursor-pointer flex-1">
                  <span className="font-medium">Shuffle Questions</span>
                  <p className="text-sm text-muted-foreground">Randomize question order for varied practice</p>
                </label>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => navigate("/")}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={() => setQuizStarted(true)}
                className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                Start Quiz
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (questionsLoading || !questions) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  const handleSelectAnswer = (option: string) => {
    if (answered) return;
    setSelectedAnswer(option);
    setAnswered(true);

    const isCorrect = option === currentQuestion.correctAnswer ? 1 : 0;
    setUserAnswers([
      ...userAnswers,
      {
        questionId: currentQuestion.id,
        selectedAnswer: option,
        isCorrect,
      },
    ]);
  };

  const handleNext = () => {
    if (isLastQuestion) {
      const score = userAnswers.filter((a) => a.isCorrect === 1).length;
      submitAttempt.mutate(
        {
          quizId,
          answers: userAnswers,
          score,
          totalQuestions: questions.length,
        },
        {
          onSuccess: (result) => {
            navigate(`/results/${result.attemptId}`);
          },
        }
      );
    } else {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
      setAnswered(false);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      const prevAnswer = userAnswers.find((a) => a.questionId === questions[currentQuestionIndex - 1].id);
      setSelectedAnswer(prevAnswer?.selectedAnswer || null);
      setAnswered(!!prevAnswer);
    }
  };

  const optionLetters = ["A", "B", "C", "D"] as const;
  const optionKeys = ["optionA", "optionB", "optionC", "optionD"] as const;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container py-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-semibold text-foreground">{quiz.title}</h2>
              <p className="text-sm text-muted-foreground">
                Question {currentQuestionIndex + 1} of {questions.length}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Progress</p>
              <p className="text-lg font-semibold text-accent">{Math.round(progress)}%</p>
            </div>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      <div className="container py-8">
        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl">{currentQuestion.questionText}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {optionLetters.map((letter, index) => {
                const optionKey = optionKeys[index];
                const optionText = currentQuestion[optionKey];
                const isSelected = selectedAnswer === letter;
                const isCorrect = letter === currentQuestion.correctAnswer;
                const showFeedback = answered && isSelected;
                const showCorrectAnswer = answered && isCorrect && !isSelected;

                let bgColor = "bg-card hover:bg-card/80 border-border hover:border-accent/50";
                let textColor = "text-foreground";

                if (showFeedback) {
                  if (isCorrect) {
                    bgColor = "bg-green-500/10 border-green-500/50 hover:bg-green-500/10";
                    textColor = "text-green-400";
                  } else {
                    bgColor = "bg-red-500/10 border-red-500/50 hover:bg-red-500/10";
                    textColor = "text-red-400";
                  }
                } else if (showCorrectAnswer) {
                  bgColor = "bg-green-500/10 border-green-500/50 hover:bg-green-500/10";
                  textColor = "text-green-400";
                }

                return (
                  <button
                    key={letter}
                    onClick={() => handleSelectAnswer(letter)}
                    disabled={answered}
                    className={`w-full p-4 rounded-lg border-2 transition-all duration-200 text-left flex items-start gap-4 ${bgColor} ${
                      answered ? "cursor-default" : "cursor-pointer"
                    }`}
                  >
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center font-semibold ${
                        showFeedback || showCorrectAnswer
                          ? isCorrect
                            ? "border-green-500/50 bg-green-500/20 text-green-400"
                            : "border-red-500/50 bg-red-500/20 text-red-400"
                          : "border-border"
                      }`}
                    >
                      {letter}
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium ${textColor}`}>{optionText}</p>
                    </div>
                    {showFeedback && isCorrect && <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />}
                    {showFeedback && !isCorrect && <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />}
                    {showCorrectAnswer && <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />}
                  </button>
                );
              })}
            </div>

            {answered && (
              <div
                className={`p-4 rounded-lg ${
                  selectedAnswer === currentQuestion.correctAnswer
                    ? "bg-green-500/10 border border-green-500/50 text-green-400"
                    : "bg-red-500/10 border border-red-500/50 text-red-400"
                }`}
              >
                {selectedAnswer === currentQuestion.correctAnswer ? (
                  <p className="font-medium">✓ Correct! Well done.</p>
                ) : (
                  <p className="font-medium">
                    ✗ Incorrect. The correct answer is <strong>{currentQuestion.correctAnswer}</strong>.
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentQuestionIndex === 0}
                className="flex-1"
              >
                Previous
              </Button>
              <Button
                onClick={handleNext}
                disabled={!answered || submitAttempt.isPending}
                className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                {submitAttempt.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : isLastQuestion ? (
                  "Finish Quiz"
                ) : (
                  "Next"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

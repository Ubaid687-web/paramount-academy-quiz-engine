import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Loader2, AlertCircle, CheckCircle2, XCircle, ArrowLeft, ArrowRight, Shuffle } from "lucide-react";
import { toast } from "sonner";

interface Question {
  id: number;
  questionNumber: number;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
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
  const [isCheckingAnswer, setIsCheckingAnswer] = useState(false);

  const { data: quiz, isLoading: quizLoading } = trpc.quiz.getById.useQuery({ quizId });
  const { data: questions, isLoading: questionsLoading } = trpc.quiz.getQuestions.useQuery(
    { quizId, shuffle },
    { enabled: quizStarted }
  );

  const submitAttempt = trpc.quiz.submitAttempt.useMutation();
  const checkAnswer = trpc.quiz.checkAnswer.useMutation();

  if (quizLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
          <p className="text-muted-foreground">Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
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
        <Card className="w-full max-w-2xl card-premium">
          <CardHeader className="text-center pb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-accent/10 mx-auto mb-4">
              <CheckCircle2 className="h-6 w-6 text-accent" />
            </div>
            <CardTitle className="text-4xl mb-3">{quiz.title}</CardTitle>
            <p className="text-lg text-muted-foreground">{quiz.description}</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4 p-6 rounded-lg bg-card/50 border border-border/50">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Questions</p>
                <p className="text-3xl font-bold text-accent">{quiz.totalQuestions}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Difficulty</p>
                <p className="text-3xl font-bold text-secondary capitalize">Mixed</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-lg bg-accent/10 border border-accent/20 hover:border-accent/40 transition-colors cursor-pointer group">
              <input
                type="checkbox"
                id="shuffle"
                checked={shuffle}
                onChange={(e) => setShuffle(e.target.checked)}
                className="w-5 h-5 rounded border-border cursor-pointer accent-accent"
              />
              <label htmlFor="shuffle" className="cursor-pointer flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Shuffle className="h-4 w-4 text-accent" />
                  <span className="font-semibold text-foreground">Shuffle Questions</span>
                </div>
                <p className="text-sm text-muted-foreground">Randomize question order for varied practice</p>
              </label>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                onClick={() => navigate("/")}
                className="flex-1 border-border/50 hover:bg-card hover:border-accent/30"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Button>
              <Button
                onClick={() => setQuizStarted(true)}
                className="flex-1 bg-gradient-to-r from-accent to-secondary hover:shadow-lg hover:shadow-accent/20 text-accent-foreground font-semibold"
              >
                Start Quiz
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (questionsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
          <p className="text-muted-foreground">Loading questions...</p>
        </div>
      </div>
    );
  }

  if (!questions || questions.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-destructive/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <CardTitle>No Questions Found</CardTitle>
            </div>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const currentRecordedAnswer = userAnswers.find((answer) => answer.questionId === currentQuestion.id);
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  const options = [
    { key: "A", value: currentQuestion.optionA },
    { key: "B", value: currentQuestion.optionB },
    { key: "C", value: currentQuestion.optionC },
    { key: "D", value: currentQuestion.optionD },
  ];

  const handleSelectAnswer = async (optionKey: string) => {
    if (answered || isCheckingAnswer) return;
    setSelectedAnswer(optionKey);
    setIsCheckingAnswer(true);
    try {
      const result = await checkAnswer.mutateAsync({ quizId, questionId: currentQuestion.id, selectedAnswer: optionKey as "A" | "B" | "C" | "D" });
      setUserAnswers((answers) => [...answers.filter((answer) => answer.questionId !== currentQuestion.id), { questionId: currentQuestion.id, selectedAnswer: optionKey, isCorrect: result.isCorrect }]);
      setAnswered(true);
    } catch (error) {
      setSelectedAnswer(null);
      toast.error(error instanceof Error ? error.message : "Could not check this answer.");
    } finally {
      setIsCheckingAnswer(false);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
      setAnswered(false);
    } else {
      handleSubmitQuiz();
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

  const handleSubmitQuiz = async () => {
    try {
      const result = await submitAttempt.mutateAsync({
        quizId,
        answers: userAnswers.map(({ questionId, selectedAnswer }) => ({ questionId, selectedAnswer: selectedAnswer as "A" | "B" | "C" | "D" })),
      });
      navigate(`/results/${result.attemptId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit quiz");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Premium Header */}
      <div className="border-b border-border/50 bg-gradient-to-b from-card/50 to-background backdrop-blur-sm sticky top-0 z-10">
        <div className="container py-4">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3 flex-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/")}
                className="hover:bg-accent/10"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="font-bold text-foreground">{quiz.title}</h1>
                <p className="text-sm text-muted-foreground">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Progress</p>
              <p className="text-lg font-bold text-accent">{Math.round(progress)}%</p>
            </div>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      {/* Main Content */}
      <div className="container py-8 sm:py-12">
        <div className="max-w-3xl mx-auto">
          {/* Question Card */}
          <Card className="card-premium mb-8 animate-in fade-in duration-300">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-accent mb-2">Question {currentQuestionIndex + 1}</p>
                  <CardTitle className="text-2xl leading-relaxed">{currentQuestion.questionText}</CardTitle>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Options */}
          <div className="space-y-3 mb-8">
            {options.map((option) => {
              const isSelected = selectedAnswer === option.key;
              const showCorrect = answered && isSelected && currentRecordedAnswer?.isCorrect === 1;
              const showWrong = answered && isSelected && currentRecordedAnswer?.isCorrect === 0;

              return (
                <button
                  key={option.key}
                  onClick={() => handleSelectAnswer(option.key)}
                  disabled={answered || isCheckingAnswer}
                  className={`w-full p-4 rounded-lg border-2 transition-all duration-300 text-left font-medium group ${
                    showCorrect
                      ? "bg-green-500/20 border-green-500/50 text-green-400"
                      : showWrong
                      ? "bg-red-500/20 border-red-500/50 text-red-400"
                      : isSelected && !answered
                      ? "bg-accent/20 border-accent/50 text-accent"
                      : "bg-card/50 border-border/50 text-foreground hover:border-accent/30 hover:bg-card/70"
                  } ${answered ? "cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex items-center justify-center w-8 h-8 rounded-full font-bold flex-shrink-0 ${
                        showCorrect
                          ? "bg-green-500/30 text-green-400"
                          : showWrong
                          ? "bg-red-500/30 text-red-400"
                          : isSelected && !answered
                          ? "bg-accent/30 text-accent"
                          : "bg-muted/50 text-muted-foreground group-hover:bg-accent/20 group-hover:text-accent"
                      }`}
                    >
                      {option.key}
                    </div>
                    <span className="flex-1">{option.value}</span>
                    {showCorrect && <CheckCircle2 className="h-5 w-5 text-green-400 flex-shrink-0" />}
                    {showWrong && <XCircle className="h-5 w-5 text-red-400 flex-shrink-0" />}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Feedback */}
          {answered && (
            <Card className={`mb-8 ${currentRecordedAnswer?.isCorrect === 1 ? "bg-green-500/10 border-green-500/30" : "bg-red-500/10 border-red-500/30"}`}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  {currentRecordedAnswer?.isCorrect === 1 ? (
                    <>
                      <CheckCircle2 className="h-6 w-6 text-green-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-green-400">Correct!</p>
                        <p className="text-sm text-muted-foreground mt-1">Well done! You selected the right answer.</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-6 w-6 text-red-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-red-400">Incorrect</p>
                        <p className="text-sm text-muted-foreground mt-1">Review this concept in the approved textbook, then continue to the next question.</p>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0 || !answered}
              variant="outline"
              className="flex-1 border-border/50 hover:bg-card hover:border-accent/30"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>
            <Button
              onClick={handleNext}
              disabled={!answered}
              className="flex-1 bg-gradient-to-r from-accent to-secondary hover:shadow-lg hover:shadow-accent/20 text-accent-foreground font-semibold"
            >
              {currentQuestionIndex === questions.length - 1 ? (
                <>
                  Submit Quiz
                  <CheckCircle2 className="ml-2 h-4 w-4" />
                </>
              ) : (
                <>
                  Next Question
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

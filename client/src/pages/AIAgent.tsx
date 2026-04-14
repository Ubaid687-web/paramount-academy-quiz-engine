import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Loader2, Sparkles, CheckCircle2, AlertCircle, ArrowLeft, Zap } from "lucide-react";
import { toast } from "sonner";

export default function AIAgent() {
  const [, navigate] = useLocation();
  const [contentText, setContentText] = useState("");
  const [numQuestions, setNumQuestions] = useState(10);
  const [difficulty, setDifficulty] = useState<"balanced" | "easy" | "medium" | "hard">("balanced");
  const [quizTitle, setQuizTitle] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMcqs, setGeneratedMcqs] = useState<any[]>([]);
  const [jobId, setJobId] = useState<number | null>(null);
  const [generationProgress, setGenerationProgress] = useState(0);

  const generateMutation = trpc.aiAgent.generateMCQs.useMutation();
  const saveMutation = trpc.aiAgent.saveGeneratedQuiz.useMutation();
  const statusQuery = trpc.aiAgent.getGenerationStatus.useQuery(
    { jobId: jobId || 0 },
    { enabled: !!jobId && isGenerating, refetchInterval: 1000 }
  );

  // Fix React #301: Move state updates to useEffect
  useEffect(() => {
    if (!statusQuery.data) return;
    setGenerationProgress(statusQuery.data.progress);
    if (statusQuery.data.status === "completed" || statusQuery.data.status === "failed") {
      setIsGenerating(false);
    }
  }, [statusQuery.data?.progress, statusQuery.data?.status]);

  const handleGenerate = async () => {
    if (!contentText.trim()) {
      toast.error("Please enter content to generate questions from");
      return;
    }

    if (contentText.length < 100) {
      toast.error("Content must be at least 100 characters");
      return;
    }

    if (!quizTitle.trim()) {
      toast.error("Please enter a quiz title");
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(0);
    setGeneratedMcqs([]);

    try {
      const result = await generateMutation.mutateAsync({
        contentText,
        numQuestions,
        difficulty,
      });

      setJobId(result.jobId);
      setGeneratedMcqs(result.mcqs);
      setGenerationProgress(100);
      toast.success(`Generated ${result.mcqs.length} questions successfully!`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate questions");
      setIsGenerating(false);
    }
  };

  const handleSaveQuiz = async () => {
    if (!jobId || generatedMcqs.length === 0) {
      toast.error("No questions to save");
      return;
    }

    try {
      const result = await saveMutation.mutateAsync({
        jobId,
        quizTitle,
        mcqs: generatedMcqs,
        sourceContent: contentText,
        difficulty,
      });

      toast.success("Quiz saved successfully!");
      setTimeout(() => {
        navigate(`/quiz/${result.quizId}`);
      }, 1000);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save quiz");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Premium Header */}
      <div className="border-b border-border/50 bg-gradient-to-b from-card/50 to-background backdrop-blur-sm sticky top-0 z-10">
        <div className="container py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              className="hover:bg-accent/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-accent" />
                <h1 className="text-2xl sm:text-3xl font-bold">AI Question Generator</h1>
              </div>
              <p className="text-sm text-muted-foreground">Transform content into high-quality MCQs</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-8 sm:py-12">
        <div className="max-w-4xl mx-auto">
          {/* Input Section */}
          {generatedMcqs.length === 0 ? (
            <Card className="card-premium">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-accent" />
                  Generate Questions from Content
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Quiz Title */}
                <div>
                  <Label htmlFor="quiz-title" className="text-foreground font-semibold mb-2 block">
                    Quiz Title
                  </Label>
                  <Input
                    id="quiz-title"
                    placeholder="e.g., Advanced Biology Chapter 5"
                    value={quizTitle}
                    onChange={(e) => setQuizTitle(e.target.value)}
                    disabled={isGenerating}
                    className="input-premium"
                  />
                </div>

                {/* Content Input */}
                <div>
                  <Label htmlFor="content" className="text-foreground font-semibold mb-2 block">
                    Content
                  </Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Paste lecture notes, textbook excerpts, or any academic content (minimum 100 characters)
                  </p>
                  <Textarea
                    id="content"
                    placeholder="Paste your content here..."
                    value={contentText}
                    onChange={(e) => setContentText(e.target.value)}
                    className="input-premium font-mono text-sm min-h-40"
                    disabled={isGenerating}
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    {contentText.length} / 100+ characters
                  </p>
                </div>

                {/* Settings */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="num-questions" className="text-foreground font-semibold mb-2 block">
                      Number of Questions
                    </Label>
                    <Input
                      id="num-questions"
                      type="number"
                      min={5}
                      max={50}
                      value={numQuestions}
                      onChange={(e) => setNumQuestions(parseInt(e.target.value))}
                      disabled={isGenerating}
                      className="input-premium"
                    />
                  </div>

                  <div>
                    <Label htmlFor="difficulty" className="text-foreground font-semibold mb-2 block">
                      Difficulty Level
                    </Label>
                    <Select value={difficulty} onValueChange={(v: any) => setDifficulty(v)} disabled={isGenerating}>
                      <SelectTrigger id="difficulty" className="input-premium">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="balanced">Balanced (30/40/30)</SelectItem>
                        <SelectItem value="easy">Easy (70/20/10)</SelectItem>
                        <SelectItem value="medium">Medium (20/60/20)</SelectItem>
                        <SelectItem value="hard">Hard (10/20/70)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Generate Button */}
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || !contentText.trim() || !quizTitle.trim()}
                  className="w-full bg-gradient-to-r from-accent to-secondary hover:shadow-lg hover:shadow-accent/20 text-accent-foreground font-semibold py-3 rounded-lg"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating... {generationProgress}%
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate Questions
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ) : null}

          {/* Results Section */}
          {generatedMcqs.length > 0 && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <Card className="bg-green-500/10 border-green-500/30 card-premium">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-6 w-6 text-green-400 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-foreground">Generation Complete!</p>
                      <p className="text-sm text-muted-foreground">
                        Successfully generated {generatedMcqs.length} high-quality questions
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Preview Questions */}
              <Card className="card-premium">
                <CardHeader>
                  <CardTitle>Question Preview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {generatedMcqs.slice(0, 3).map((mcq, idx) => (
                    <div key={idx} className="p-4 rounded-lg bg-card/50 border border-border/50 hover:border-accent/30 transition-colors">
                      <p className="font-semibold text-foreground mb-3">{idx + 1}. {mcq.question}</p>
                      <div className="space-y-2 text-sm">
                        {Object.entries(mcq.options).map(([key, value]) => (
                          <div
                            key={key}
                            className={`p-3 rounded transition-colors ${
                              key === mcq.answer
                                ? "bg-green-500/20 border border-green-500/50 text-green-400"
                                : "bg-muted/50 text-muted-foreground hover:bg-muted"
                            }`}
                          >
                            <span className="font-semibold">{key}.</span> {String(value)}
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Difficulty:</span>
                        <span className="px-2 py-1 bg-accent/10 text-accent rounded font-semibold capitalize">
                          {mcq.difficulty}
                        </span>
                      </div>
                    </div>
                  ))}
                  {generatedMcqs.length > 3 && (
                    <p className="text-sm text-muted-foreground text-center py-3 border-t border-border/50">
                      ... and {generatedMcqs.length - 3} more questions
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setGeneratedMcqs([]);
                    setJobId(null);
                    setContentText("");
                    setQuizTitle("");
                  }}
                  className="flex-1 border-border/50 hover:bg-card"
                >
                  Generate New Quiz
                </Button>
                <Button
                  onClick={handleSaveQuiz}
                  disabled={saveMutation.isPending}
                  className="flex-1 bg-gradient-to-r from-accent to-secondary hover:shadow-lg hover:shadow-accent/20 text-accent-foreground font-semibold"
                >
                  {saveMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Save Quiz & Practice
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

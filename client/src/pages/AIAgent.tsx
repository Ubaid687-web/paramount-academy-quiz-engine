import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Loader2, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";
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

  // Update progress from status query
  if (statusQuery.data) {
    setGenerationProgress(statusQuery.data.progress);
    if (statusQuery.data.status === "completed") {
      setIsGenerating(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container py-6">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-6 w-6 text-accent" />
            <h1 className="text-3xl font-bold text-foreground">AI Question Generator</h1>
          </div>
          <p className="text-muted-foreground">Transform your content into high-quality MCQs</p>
        </div>
      </div>

      <div className="container py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Input Section */}
          {generatedMcqs.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Generate Questions from Content</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Quiz Title */}
                <div>
                  <Label htmlFor="quiz-title" className="text-foreground font-medium">
                    Quiz Title
                  </Label>
                  <Input
                    id="quiz-title"
                    placeholder="e.g., Advanced Biology Chapter 5"
                    value={quizTitle}
                    onChange={(e) => setQuizTitle(e.target.value)}
                    className="mt-2"
                    disabled={isGenerating}
                  />
                </div>

                {/* Content Input */}
                <div>
                  <Label htmlFor="content" className="text-foreground font-medium">
                    Content
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1 mb-2">
                    Paste lecture notes, textbook excerpts, or any academic content (minimum 100 characters)
                  </p>
                  <Textarea
                    id="content"
                    placeholder="Paste your content here..."
                    value={contentText}
                    onChange={(e) => setContentText(e.target.value)}
                    className="min-h-40 font-mono text-sm"
                    disabled={isGenerating}
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    {contentText.length} characters
                  </p>
                </div>

                {/* Settings */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="num-questions" className="text-foreground font-medium">
                      Number of Questions
                    </Label>
                    <Input
                      id="num-questions"
                      type="number"
                      min={5}
                      max={50}
                      value={numQuestions}
                      onChange={(e) => setNumQuestions(parseInt(e.target.value))}
                      className="mt-2"
                      disabled={isGenerating}
                    />
                  </div>

                  <div>
                    <Label htmlFor="difficulty" className="text-foreground font-medium">
                      Difficulty Level
                    </Label>
                    <Select value={difficulty} onValueChange={(v: any) => setDifficulty(v)} disabled={isGenerating}>
                      <SelectTrigger id="difficulty" className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="balanced">Balanced (30% Easy, 40% Medium, 30% Hard)</SelectItem>
                        <SelectItem value="easy">Easy (70% Easy, 20% Medium, 10% Hard)</SelectItem>
                        <SelectItem value="medium">Medium (20% Easy, 60% Medium, 20% Hard)</SelectItem>
                        <SelectItem value="hard">Hard (10% Easy, 20% Medium, 70% Hard)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Generate Button */}
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || !contentText.trim() || !quizTitle.trim()}
                  className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating Questions... ({generationProgress}%)
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
            <div className="space-y-4">
              <Card className="bg-green-500/10 border-green-500/30">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-6 w-6 text-green-400" />
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
              <Card>
                <CardHeader>
                  <CardTitle>Question Preview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {generatedMcqs.slice(0, 3).map((mcq, idx) => (
                    <div key={idx} className="p-4 rounded-lg bg-card border border-border">
                      <p className="font-medium text-foreground mb-3">{idx + 1}. {mcq.question}</p>
                      <div className="space-y-2 text-sm">
                        {Object.entries(mcq.options).map(([key, value]) => (
                          <div
                            key={key}
                            className={`p-2 rounded ${
                              key === mcq.answer
                                ? "bg-green-500/20 border border-green-500/50 text-green-400"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            <span className="font-semibold">{key}.</span> {String(value)}
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-3 italic">
                        Difficulty: <span className="capitalize font-semibold">{mcq.difficulty}</span>
                      </p>
                    </div>
                  ))}
                  {generatedMcqs.length > 3 && (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      ... and {generatedMcqs.length - 3} more questions
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setGeneratedMcqs([]);
                    setJobId(null);
                    setContentText("");
                    setQuizTitle("");
                  }}
                  className="flex-1"
                >
                  Generate New Quiz
                </Button>
                <Button
                  onClick={handleSaveQuiz}
                  disabled={saveMutation.isPending}
                  className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
                >
                  {saveMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Quiz & Practice"
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

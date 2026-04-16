import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Loader2, Sparkles, CheckCircle2, AlertCircle, ArrowLeft, Zap, Upload, FileText, X } from "lucide-react";
import { toast } from "sonner";

export default function AIAgent() {
  const [, navigate] = useLocation();
  const [contentText, setContentText] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [numQuestions, setNumQuestions] = useState(10);
  const [difficulty, setDifficulty] = useState<"balanced" | "easy" | "medium" | "hard">("balanced");
  const [quizTitle, setQuizTitle] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMcqs, setGeneratedMcqs] = useState<any[]>([]);
  const [jobId, setJobId] = useState<number | null>(null);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  const generateMutation = trpc.aiAgent.generateMCQs.useMutation();
  const saveMutation = trpc.aiAgent.saveGeneratedQuiz.useMutation();
  const statusQuery = trpc.aiAgent.getGenerationStatus.useQuery(
    { jobId: jobId || 0 },
    { enabled: !!jobId && isGenerating, refetchInterval: 1000 }
  );

  useEffect(() => {
    if (!statusQuery.data) return;
    setGenerationProgress(statusQuery.data.progress);
    if (statusQuery.data.status === "completed" || statusQuery.data.status === "failed") {
      setIsGenerating(false);
    }
  }, [statusQuery.data?.progress, statusQuery.data?.status]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("File size must be less than 10MB");
      return;
    }

    const allowedTypes = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Please upload a PDF, DOCX, or TXT file");
      return;
    }

    setUploadedFile(file);
    setIsProcessingFile(true);

    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setContentText(content);
        setQuizTitle(file.name.replace(/\.[^/.]+$/, ""));
        toast.success("Document uploaded and processed successfully!");
      };
      reader.readAsText(file);
    } catch (error) {
      toast.error("Failed to process document");
      setUploadedFile(null);
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleGenerate = async () => {
    if (!contentText.trim()) {
      toast.error("Please enter content or upload a document");
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
      setTimeout(() => navigate("/"), 1500);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save quiz");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border/50 bg-gradient-to-b from-card/50 to-background backdrop-blur-sm sticky top-0 z-10">
        <div className="container py-8">
          <div className="flex items-center gap-4">
            <Button onClick={() => navigate("/")} variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-accent to-secondary bg-clip-text text-transparent">
                Generate Quiz
              </h1>
              <p className="text-muted-foreground mt-1">Create MCQs from your content or documents</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-12">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-border/50 bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5 text-accent" />
                  Upload Document
                </CardTitle>
                <CardDescription>Upload PDF, DOCX, or TXT files (max 10MB)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-border/50 rounded-lg p-8 text-center hover:border-accent/50 transition-colors">
                    <input
                      type="file"
                      id="file-upload"
                      className="hidden"
                      accept=".pdf,.docx,.txt"
                      onChange={handleFileUpload}
                      disabled={isProcessingFile}
                    />
                    <label htmlFor="file-upload" className="cursor-pointer block">
                      <div className="flex flex-col items-center gap-2">
                        <FileText className="h-8 w-8 text-muted-foreground" />
                        <div>
                          <p className="font-semibold text-foreground">Drag and drop your document</p>
                          <p className="text-sm text-muted-foreground">or click to browse</p>
                        </div>
                      </div>
                    </label>
                  </div>

                  {uploadedFile && (
                    <div className="flex items-center justify-between p-3 bg-accent/10 rounded-lg">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-accent" />
                        <div>
                          <p className="font-medium text-sm">{uploadedFile.name}</p>
                          <p className="text-xs text-muted-foreground">{(uploadedFile.size / 1024).toFixed(2)} KB</p>
                        </div>
                      </div>
                      <Button
                        onClick={() => setUploadedFile(null)}
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-accent" />
                  Or Paste Content
                </CardTitle>
                <CardDescription>Paste lecture notes, textbooks, or any academic content</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="content">Content</Label>
                  <Textarea
                    id="content"
                    placeholder="Paste your content here... (minimum 100 characters)"
                    value={contentText}
                    onChange={(e) => setContentText(e.target.value)}
                    className="min-h-48 resize-none"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    {contentText.length} characters
                  </p>
                </div>
              </CardContent>
            </Card>

            {generatedMcqs.length > 0 && (
              <Card className="border-border/50 bg-card/50 backdrop-blur">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-accent" />
                    Generated Questions Preview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 max-h-96 overflow-y-auto">
                  {generatedMcqs.slice(0, 3).map((mcq, idx) => (
                    <div key={idx} className="p-3 bg-background/50 rounded-lg border border-border/50">
                      <p className="font-medium text-sm mb-2">{idx + 1}. {mcq.question}</p>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <p>A) {mcq.options.A}</p>
                        <p>B) {mcq.options.B}</p>
                        <p>C) {mcq.options.C}</p>
                        <p>D) {mcq.options.D}</p>
                        <p className="text-accent font-medium mt-2">✓ Answer: {mcq.answer}</p>
                      </div>
                    </div>
                  ))}
                  {generatedMcqs.length > 3 && (
                    <p className="text-center text-sm text-muted-foreground">
                      ... and {generatedMcqs.length - 3} more questions
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card className="border-border/50 bg-card/50 backdrop-blur sticky top-24">
              <CardHeader>
                <CardTitle className="text-lg">Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Quiz Title</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Machine Learning Basics"
                    value={quizTitle}
                    onChange={(e) => setQuizTitle(e.target.value)}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="num-questions">Number of Questions</Label>
                  <Select value={numQuestions.toString()} onValueChange={(v) => setNumQuestions(parseInt(v))}>
                    <SelectTrigger id="num-questions" className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[5, 10, 15, 20, 25, 30].map((n) => (
                        <SelectItem key={n} value={n.toString()}>
                          {n} questions
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="difficulty">Difficulty Distribution</Label>
                  <Select value={difficulty} onValueChange={(v: any) => setDifficulty(v)}>
                    <SelectTrigger id="difficulty" className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="balanced">Balanced (30% Easy, 40% Medium, 30% Hard)</SelectItem>
                      <SelectItem value="easy">Easy Focus</SelectItem>
                      <SelectItem value="medium">Medium Focus</SelectItem>
                      <SelectItem value="hard">Hard Focus</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {isGenerating && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Generating...</span>
                      <span className="text-sm text-muted-foreground">{generationProgress}%</span>
                    </div>
                    <div className="w-full bg-border/50 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-accent to-secondary h-2 rounded-full transition-all"
                        style={{ width: `${generationProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {generatedMcqs.length === 0 ? (
                  <Button
                    onClick={handleGenerate}
                    disabled={isGenerating || !contentText.trim() || !quizTitle.trim()}
                    className="w-full bg-gradient-to-r from-accent to-secondary hover:shadow-lg hover:shadow-accent/20 text-accent-foreground font-semibold"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Generate Questions
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={handleSaveQuiz}
                    disabled={saveMutation.isPending}
                    className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold"
                  >
                    {saveMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Save Quiz
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

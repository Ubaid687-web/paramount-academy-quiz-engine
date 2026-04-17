import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Loader2, Sparkles, CheckCircle2, AlertCircle, ArrowLeft, Upload, FileText, X, Zap } from "lucide-react";
import { toast } from "sonner";

export default function AIAgent() {
  const [, navigate] = useLocation();
  const [contentText, setContentText] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [numQuestions, setNumQuestions] = useState<number | null>(null);
  const [difficulty, setDifficulty] = useState<"balanced" | "easy" | "medium" | "hard">("balanced");
  const [quizTitle, setQuizTitle] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMcqs, setGeneratedMcqs] = useState<any[]>([]);
  const [jobId, setJobId] = useState<number | null>(null);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [contentAnalysis, setContentAnalysis] = useState<any>(null);

  const generateMutation = trpc.aiAgent.generateMCQs.useMutation();
  const saveMutation = trpc.aiAgent.saveGeneratedQuiz.useMutation();
  // const pdfExtractMutation = trpc.pdfUpload.extractPdfText.useMutation();
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

    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("File size must be less than 50MB");
      return;
    }

    const allowedTypes = ["text/plain", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Please upload a PDF or TXT file");
      return;
    }

    setUploadedFile(file);
    setIsProcessingFile(true);

    try {
      if (file.type === "application/pdf") {
        const reader = new FileReader();
        
        reader.onload = async (event) => {
          try {
            const base64 = event.target?.result as string;
            const base64Data = base64.split(",")[1] || base64;
            
            // PDF extraction disabled for now
            // const result = await pdfExtractMutation.mutateAsync({
            //   fileBuffer: base64Data,
            //   fileName: file.name,
            // });
            
            // setQuizTitle(file.name.replace(/\.[^/.]+$/, ""));
            // toast.success(`PDF loaded! (${result.pageCount} pages)`);
            toast.info("PDF support coming soon. Please paste content manually.");
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to process PDF");
            setUploadedFile(null);
          } finally {
            setIsProcessingFile(false);
          }
        };
        
        reader.onerror = () => {
          toast.error("Failed to read PDF file");
          setUploadedFile(null);
          setIsProcessingFile(false);
        };
        
        // reader.readAsDataURL(file);
        setIsProcessingFile(false);
      } else {
        const reader = new FileReader();
        
        reader.onload = (event) => {
          try {
            const content = event.target?.result as string;
            if (content) {
              setContentText(content);
              setQuizTitle(file.name.replace(/\.[^/.]+$/, ""));
              toast.success("Document loaded successfully!");
            }
          } catch (error) {
            toast.error("Failed to read file");
            setUploadedFile(null);
          } finally {
            setIsProcessingFile(false);
          }
        };

        reader.onerror = () => {
          toast.error("Failed to read file");
          setUploadedFile(null);
          setIsProcessingFile(false);
        };

        reader.readAsText(file);
      }
    } catch (error) {
      toast.error("Failed to process file");
      setUploadedFile(null);
      setIsProcessingFile(false);
    }
  };

  const analyzeContentForMCQs = () => {
    if (!contentText.trim()) {
      toast.error("Please add content first");
      return;
    }

    // Simple content analysis
    const wordCount = contentText.split(/\s+/).length;
    const complexity = determineComplexity(contentText);
    
    // Calculate recommended questions
    const baseQuestions = Math.ceil(wordCount / 150);
    const complexityMultiplier = complexity === "simple" ? 0.8 : complexity === "moderate" ? 1.0 : complexity === "complex" ? 1.3 : 1.6;
    const optimal = Math.max(10, Math.ceil(baseQuestions * complexityMultiplier));
    
    setContentAnalysis({
      wordCount,
      complexity,
      recommended: {
        min: Math.max(5, Math.ceil(optimal * 0.6)),
        optimal,
        max: Math.ceil(optimal * 1.8),
      },
    });
    
    // Set default to optimal
    setNumQuestions(optimal);
  };

  const determineComplexity = (text: string): string => {
    const words = text.split(/\s+/).length;
    const avgWordLength = text.split(/\s+/).reduce((sum, w) => sum + w.length, 0) / words;
    const technicalTerms = (text.match(/[A-Z][a-z]+|[0-9]+/g) || []).length;
    const technicalDensity = technicalTerms / words;

    if (avgWordLength < 4.5 && technicalDensity < 0.05) {
      return "simple";
    } else if (avgWordLength < 5.5 && technicalDensity < 0.15) {
      return "moderate";
    } else if (avgWordLength < 6.5 && technicalDensity < 0.25) {
      return "complex";
    } else {
      return "advanced";
    }
  };

  const handleGenerate = async () => {
    if (!contentText.trim()) {
      toast.error("Please add content first");
      return;
    }

    if (!quizTitle.trim()) {
      toast.error("Please enter a quiz title");
      return;
    }

    if (!numQuestions || numQuestions < 5) {
      toast.error("Please select at least 5 questions");
      return;
    }

    setIsGenerating(true);
    setGeneratedMcqs([]);

    try {
      const result = await generateMutation.mutateAsync({
        contentText,
        numQuestions: numQuestions || 10,
        difficulty,
      });

      setJobId(result.jobId);
      setGeneratedMcqs(result.mcqs);
      
      if (result.analysis) {
        setContentAnalysis(result.analysis);
      }

      toast.success(`Generated ${result.mcqs.length} MCQs!`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate MCQs");
      setIsGenerating(false);
    }
  };

  const handleSaveQuiz = async () => {
    if (!generatedMcqs.length) {
      toast.error("No MCQs to save");
      return;
    }

    try {
      await saveMutation.mutateAsync({
        quizTitle,
        mcqs: generatedMcqs,
        sourceContent: contentText,
        difficulty,
        jobId: jobId || 0,
      });

      toast.success("Quiz saved successfully!");
      setTimeout(() => navigate("/"), 1500);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save quiz");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Quizzes
          </Button>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-accent via-secondary to-accent bg-clip-text text-transparent">
            AI Quiz Generator
          </h1>
          <p className="text-muted-foreground mt-2">
            Upload content or paste text to generate intelligent, conceptual MCQs
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Content Input Card */}
            <Card className="border-accent/20 bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-accent" />
                  Add Content
                </CardTitle>
                <CardDescription>Upload a PDF/TXT file or paste content directly</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* File Upload */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Upload Document</Label>
                  <label className="flex items-center justify-center w-full p-6 border-2 border-dashed border-accent/30 rounded-lg hover:border-accent/60 cursor-pointer transition-colors">
                    <input
                      type="file"
                      id="file-upload"
                      className="hidden"
                      accept=".txt,.pdf"
                      onChange={handleFileUpload}
                    />
                    <div className="flex flex-col items-center gap-2">
                      <FileText className="h-8 w-8 text-muted-foreground" />
                      <div>
                        <p className="font-semibold text-foreground">Upload a PDF or TXT file</p>
                        <p className="text-sm text-muted-foreground">or click to browse</p>
                      </div>
                    </div>
                  </label>

                  {uploadedFile && (
                    <div className="flex items-center justify-between p-3 bg-accent/10 rounded-lg mt-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-accent" />
                        <div>
                          <p className="font-medium text-sm">{uploadedFile.name}</p>
                          <p className="text-xs text-muted-foreground">{(uploadedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                      </div>
                      <Button
                        onClick={() => {
                          setUploadedFile(null);
                          setContentText("");
                        }}
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Text Input */}
                <div>
                  <Label htmlFor="content" className="text-sm font-medium mb-2 block">
                    Or Paste Content
                  </Label>
                  <Textarea
                    id="content"
                    placeholder="Paste your lecture notes, textbook content, research material, etc."
                    value={contentText}
                    onChange={(e) => setContentText(e.target.value)}
                    className="min-h-[200px] resize-none"
                  />
                </div>

                {/* Quiz Title */}
                <div>
                  <Label htmlFor="title" className="text-sm font-medium mb-2 block">
                    Quiz Title
                  </Label>
                  <Input
                    id="title"
                    placeholder="e.g., Machine Learning Basics, Biology Chapter 5"
                    value={quizTitle}
                    onChange={(e) => setQuizTitle(e.target.value)}
                  />
                </div>

                {/* Analyze Button */}
                {contentText.trim() && !contentAnalysis && (
                  <Button
                    onClick={analyzeContentForMCQs}
                    variant="outline"
                    className="w-full border-accent/30 hover:border-accent"
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Analyze Content
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Content Analysis Card */}
            {contentAnalysis && (
              <Card className="border-secondary/20 bg-secondary/5">
                <CardHeader>
                  <CardTitle className="text-lg">Content Analysis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Word Count</p>
                      <p className="text-2xl font-bold text-accent">{contentAnalysis.wordCount || contentAnalysis.totalWords}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Complexity</p>
                      <p className="text-lg font-semibold capitalize">{contentAnalysis.complexity}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Recommended MCQ Range</p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{contentAnalysis.recommended?.min || contentAnalysis.recommendedQuestions?.minimum}</span>
                      <div className="flex-1 h-2 bg-accent/20 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-accent to-secondary"
                          style={{
                            width: `${((contentAnalysis.recommended?.optimal || contentAnalysis.recommendedQuestions?.optimal) / (contentAnalysis.recommended?.max || contentAnalysis.recommendedQuestions?.maximum)) * 100}%`
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium">{contentAnalysis.recommended?.max || contentAnalysis.recommendedQuestions?.maximum}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Optimal: <span className="font-semibold text-accent">{contentAnalysis.recommended?.optimal || contentAnalysis.recommendedQuestions?.optimal}</span> questions
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Generated MCQs Preview */}
            {generatedMcqs.length > 0 && (
              <Card className="border-accent/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-accent" />
                    Generated MCQs ({generatedMcqs.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-[400px] overflow-y-auto">
                    {generatedMcqs.slice(0, 3).map((mcq, idx) => (
                      <div key={idx} className="p-3 bg-muted/50 rounded-lg text-sm">
                        <p className="font-medium mb-2">{idx + 1}. {mcq.question}</p>
                        <div className="space-y-1 text-xs">
                          {Object.entries(mcq.options).map(([key, value]) => (
                            <p key={key} className={mcq.answer === key ? "text-accent font-semibold" : ""}>
                              {key}: {value as string}
                            </p>
                          ))}
                        </div>
                      </div>
                    ))}
                    {generatedMcqs.length > 3 && (
                      <p className="text-center text-sm text-muted-foreground">
                        +{generatedMcqs.length - 3} more questions
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Generation Settings */}
            <Card className="border-accent/20 bg-card/50 backdrop-blur sticky top-4">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-accent" />
                  Generation Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Number of Questions */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    Number of Questions: <span className="text-accent font-bold">{numQuestions || "Auto"}</span>
                  </Label>
                  {contentAnalysis && numQuestions && (
                    <div className="text-xs text-muted-foreground">
                      Range: {contentAnalysis.recommended?.min || 5} - {contentAnalysis.recommended?.max || 100}
                    </div>
                  )}
                  {!contentAnalysis && (
                    <Input
                      type="number"
                      min="5"
                      max="100"
                      value={numQuestions || ""}
                      onChange={(e) => setNumQuestions(e.target.value ? parseInt(e.target.value) : 10)}
                      placeholder="10"
                    />
                  )}
                </div>

                {/* Difficulty */}
                <div>
                  <Label htmlFor="difficulty" className="text-sm font-medium mb-2 block">
                    Difficulty Level
                  </Label>
                  <Select value={difficulty} onValueChange={(value: any) => setDifficulty(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="balanced">Balanced (30% Easy, 40% Medium, 30% Hard)</SelectItem>
                      <SelectItem value="easy">Easy Focus (70% Easy, 20% Medium, 10% Hard)</SelectItem>
                      <SelectItem value="medium">Medium Focus (20% Easy, 60% Medium, 20% Hard)</SelectItem>
                      <SelectItem value="hard">Hard Focus (10% Easy, 20% Medium, 70% Hard)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Generate Button */}
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || isProcessingFile || !contentText.trim() || !quizTitle.trim()}
                  className="w-full bg-gradient-to-r from-accent to-secondary hover:shadow-lg hover:shadow-accent/20 text-accent-foreground font-semibold"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating... {generationProgress}%
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate MCQs
                    </>
                  )}
                </Button>

                {/* Save Button */}
                {generatedMcqs.length > 0 && !isGenerating && (
                  <Button
                    onClick={handleSaveQuiz}
                    disabled={saveMutation.isPending}
                    variant="outline"
                    className="w-full border-accent/30 hover:border-accent"
                  >
                    {saveMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Save Quiz
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Info Card */}
            <Card className="border-secondary/20 bg-secondary/5">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Smart Generation
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-2">
                <p>✓ Analyzes entire document for comprehensive coverage</p>
                <p>✓ Generates conceptual, not reference-based questions</p>
                <p>✓ Creates realistic distractors from common misconceptions</p>
                <p>✓ Adapts question count to content complexity</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

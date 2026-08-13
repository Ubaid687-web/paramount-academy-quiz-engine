import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { AcademyShell } from "@/components/AcademyShell";
import { trpc } from "@/lib/trpc";
import { GENERATION_STEPS, getGenerationStep, getNextSimulatedProgress } from "@/lib/generation-progress";
import { calculateQuestionRecommendation } from "@shared/questionRecommendation";
import { useLocation } from "wouter";
import { Loader2, Sparkles, CheckCircle2, AlertCircle, Upload, FileText, X, GraduationCap, LibraryBig, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";

type FbiseSubject = "physics" | "chemistry" | "computer_science";
type GradeLevel = "9" | "10";
type GenerationScope = "uploaded_content" | "single_chapter" | "half_chapter" | "multiple_chapters" | "half_syllabus" | "block";

const SUBJECT_LABELS: Record<FbiseSubject, string> = {
  physics: "Physics",
  chemistry: "Chemistry",
  computer_science: "Computer Science",
};




export default function AIAgent() {
  const [, navigate] = useLocation();
  const requestedGrade = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("grade") : null;
  const requestedSubject = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("subject") : null;
  const requestedSubjectIsValid = requestedSubject === "physics" || requestedSubject === "chemistry" || requestedSubject === "computer_science";
  const [contentText, setContentText] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [numQuestions, setNumQuestions] = useState<number | null>(null);
  const [isQuestionCountManual, setIsQuestionCountManual] = useState(false);
  const [difficulty, setDifficulty] = useState<"balanced" | "easy" | "medium" | "hard">("balanced");
  const [quizTitle, setQuizTitle] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMcqs, setGeneratedMcqs] = useState<any[]>([]);
  const [generatedDraft, setGeneratedDraft] = useState<any>(null);
  const [jobId, setJobId] = useState<number | null>(null);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [contentAnalysis, setContentAnalysis] = useState<any>(null);
  const [subject, setSubject] = useState<FbiseSubject>(() => requestedSubjectIsValid ? requestedSubject : "physics");
  const [gradeLevel, setGradeLevel] = useState<GradeLevel>(() => requestedGrade === "9" ? "9" : "10");
  const [isContextEditing, setIsContextEditing] = useState(() => !requestedSubjectIsValid);
  const [scopeType, setScopeType] = useState<GenerationScope>("uploaded_content");
  const [selectedChapterIds, setSelectedChapterIds] = useState<number[]>([]);
  const [selectedSegmentId, setSelectedSegmentId] = useState<number | null>(null);
  const [selectedScopeTemplateId, setSelectedScopeTemplateId] = useState<number | null>(null);

  const generateMutation = trpc.aiAgent.generateMCQs.useMutation();
  const saveMutation = trpc.aiAgent.saveGeneratedQuiz.useMutation();
  const pdfExtractMutation = trpc.pdfUpload.extractPdfText.useMutation();
  const scopeCatalogQuery = trpc.curriculum.getActiveScopeCatalog.useQuery({ subject }, { enabled: gradeLevel === "10" });
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

  useEffect(() => {
    if (!isGenerating) return;

    const progressTimer = window.setInterval(() => {
      setGenerationProgress((currentProgress) => {
        return getNextSimulatedProgress(currentProgress);
      });
    }, 850);

    return () => window.clearInterval(progressTimer);
  }, [isGenerating]);

  useEffect(() => {
    const trimmedContent = contentText.trim();
    if (!trimmedContent) {
      setContentAnalysis(null);
      setNumQuestions(null);
      setIsQuestionCountManual(false);
      return;
    }

    const analysisTimer = window.setTimeout(() => {
      const wordCount = trimmedContent.split(/\s+/).filter(Boolean).length;
      const complexity = determineComplexity(trimmedContent);
      const sectionCount = trimmedContent
        .split(/\n\s*(?:chapter|unit|section|\d+[.)])/i)
        .filter((section) => section.trim().split(/\s+/).length >= 40).length;
      const topicCount = Math.min(10, (trimmedContent.match(/\b[A-Z][a-z]{3,}\b/g) || []).length);
      const recommended = calculateQuestionRecommendation({
        totalWords: wordCount,
        complexity,
        sectionCount,
        topicCount,
      });

      setContentAnalysis({ wordCount, complexity, recommended });
      setNumQuestions((currentCount) => {
        if (!isQuestionCountManual || !currentCount) return recommended.optimal;
        return Math.min(recommended.maximum, Math.max(recommended.minimum, currentCount));
      });
    }, 300);

    return () => window.clearTimeout(analysisTimer);
  }, [contentText, isQuestionCountManual]);

  useEffect(() => {
    setSelectedChapterIds([]);
    setSelectedSegmentId(null);
    setSelectedScopeTemplateId(null);
  }, [gradeLevel, subject, scopeType]);

  useEffect(() => {
    if (scopeType !== "uploaded_content" && !isQuestionCountManual) {
      setNumQuestions(subject === "computer_science" ? 13 : 12);
    }
  }, [subject, scopeType, isQuestionCountManual]);

  const activeScopeCatalog = scopeCatalogQuery.data;
  const chapters = activeScopeCatalog?.chapters ?? [];
  const selectedChapter = chapters.find((chapter) => chapter.id === selectedChapterIds[0]);
  const availableSegments = (activeScopeCatalog?.segments ?? []).filter((segment) => segment.chapterId === selectedChapterIds[0]);
  const templateKind = scopeType === "half_syllabus" ? "half_syllabus" : "block";
  const availableTemplates = (activeScopeCatalog?.templates ?? []).filter((template) => template.scopeKind === templateKind);
  const hasValidStoredScope = (
    (scopeType === "single_chapter" && selectedChapterIds.length === 1)
    || (scopeType === "half_chapter" && selectedChapterIds.length === 1 && selectedSegmentId !== null)
    || (scopeType === "multiple_chapters" && selectedChapterIds.length >= 1)
    || ((scopeType === "half_syllabus" || scopeType === "block") && selectedScopeTemplateId !== null)
  );
  const generationScopeType = (scopeType === "multiple_chapters" && selectedChapterIds.length === 1
    ? "single_chapter"
    : scopeType) as Exclude<GenerationScope, "uploaded_content">;
  const hasGenerationSource = gradeLevel === "10" && (scopeType === "uploaded_content"
    ? Boolean(contentText.trim())
    : hasValidStoredScope);

  const toggleChapter = (chapterId: number, checked: boolean) => {
    setSelectedChapterIds((currentIds) => {
      if (scopeType === "single_chapter" || scopeType === "half_chapter") {
        return checked ? [chapterId] : [];
      }
      return checked
        ? [...currentIds, chapterId]
        : currentIds.filter((id) => id !== chapterId);
    });
    if (!checked || selectedChapterIds[0] !== chapterId) setSelectedSegmentId(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 30 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("File size must be less than 30MB");
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
            const dataUrl = event.target?.result;
            const base64 = typeof dataUrl === "string" ? dataUrl.split(",")[1] : undefined;
            if (!base64) {
              throw new Error("The PDF could not be prepared for extraction.");
            }

            const result = await pdfExtractMutation.mutateAsync({
              fileBuffer: base64,
              fileName: file.name,
            });
            const extractedText = result.text.trim();
            if (extractedText.length < 100) {
              throw new Error("Very little readable text was found in this PDF. Please use a text-based PDF or paste the content.");
            }

            setContentText(extractedText);
            setQuizTitle(file.name.replace(/\.[^/.]+$/, ""));
            toast.success(`Extracted ${result.pageCount} page${result.pageCount === 1 ? "" : "s"}. Your quiz settings are ready.`);
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
        
        reader.readAsDataURL(file);
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

  const determineComplexity = (text: string): "simple" | "moderate" | "complex" | "advanced" => {
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
    if (gradeLevel !== "10") {
      toast.error("Grade 9 generation will unlock after its revised FBISE pattern and approved materials are configured.");
      return;
    }
    const usesStoredScope = scopeType !== "uploaded_content";

    if (!hasGenerationSource && !usesStoredScope) {
      toast.error("Please upload, paste, or select reviewed curriculum content first");
      return;
    }

    if (usesStoredScope && !hasValidStoredScope) {
      toast.error("Complete the selected curriculum scope before generating a draft");
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
    setGeneratedDraft(null);
    setGenerationProgress(8);

    try {
      const result = await generateMutation.mutateAsync({
        numQuestions: numQuestions || 10,
        difficulty,
        ...(usesStoredScope
          ? {
              scope: {
                subject,
                scopeType: generationScopeType,
                chapterIds: selectedChapterIds,
                segmentIds: selectedSegmentId ? [selectedSegmentId] : [],
                scopeTemplateId: selectedScopeTemplateId ?? undefined,
              },
            }
          : { contentText }),
      });

      if (result.draft?.status === "error") {
        setJobId(result.jobId);
        setGenerationProgress(0);
        setIsGenerating(false);
        toast.error(`${result.draft.message} ${result.draft.safeRetryAdvice}`);
        return;
      }

      setJobId(result.jobId);
      setGeneratedMcqs(result.mcqs);
      setGeneratedDraft(result.draft ?? null);
      
      if (result.analysis) {
        setContentAnalysis(result.analysis);
      }

      setGenerationProgress(100);
      setIsGenerating(false);
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
    <AcademyShell eyebrow="MCQ Draft Studio">
      <main className="container py-8 sm:py-10">
        <div className="mb-8 rounded-2xl border border-border/80 bg-card px-5 py-6 shadow-sm sm:px-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-primary"><GraduationCap className="h-4 w-4" />Teacher preparation</p>
              <h1 className="mt-2 text-3xl font-bold text-foreground sm:text-4xl">{!isContextEditing && gradeLevel === "10" ? `Prepare Grade 10 ${SUBJECT_LABELS[subject]} MCQ draft` : "Prepare an MCQ draft"}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Add your lesson material, choose the question level, and create a draft. An academy reviewer checks it before students use it.</p>
            </div>
            <div className="rounded-xl border border-primary/15 bg-primary/5 px-3 py-2 text-right">
              <p className="text-xs font-semibold text-primary">Assessment type</p>
              <p className="mt-0.5 text-sm font-bold text-foreground">MCQ drafts only</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Content Input Card */}
            <Card className="border-border/80 bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">1</span>
                  Choose source material
                </CardTitle>
                <CardDescription>Upload one PDF or TXT file, or paste lesson material. If an approved chapter is already prepared, you can use it instead.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2" aria-label="Choose a source path">
                  <button type="button" onClick={() => setScopeType("multiple_chapters")} className={`rounded-xl border p-4 text-left transition-colors ${scopeType !== "uploaded_content" ? "border-primary bg-primary/[0.055] shadow-sm" : "border-border bg-muted/30 hover:border-primary/40"}`}>
                    <div className="flex items-center gap-2"><LibraryBig className="h-4 w-4 text-primary" /><span className="text-sm font-bold text-foreground">Approved textbook chapters</span></div>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">Select one or more named chapters from the active Grade 10 book.</p>
                  </button>
                  <button type="button" onClick={() => setScopeType("uploaded_content")} className={`rounded-xl border p-4 text-left transition-colors ${scopeType === "uploaded_content" ? "border-primary bg-primary/[0.055] shadow-sm" : "border-border bg-muted/30 hover:border-primary/40"}`}>
                    <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /><span className="text-sm font-bold text-foreground">My custom lesson material</span></div>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">Upload one PDF/TXT file or paste a lesson excerpt for one-off practice.</p>
                  </button>
                </div>
                {scopeType === "uploaded_content" ? <>
                <div>
                  <Label className="text-sm font-medium mb-2 block">Upload one source file</Label>
                  <label className="flex items-center justify-center w-full p-6 border-2 border-dashed border-border rounded-xl bg-muted/35 hover:border-primary/45 hover:bg-primary/[0.03] cursor-pointer transition-colors">
                    <input
                      type="file"
                      id="file-upload"
                      className="hidden"
                      accept=".txt,.pdf"
                      onChange={handleFileUpload}
                    />
                    <div className="flex flex-col items-center gap-2">
                      {isProcessingFile ? <Loader2 className="h-8 w-8 animate-spin text-primary" /> : <Upload className="h-8 w-8 text-primary" />}
                      <div>
                        <p className="font-semibold text-foreground">{isProcessingFile ? "Extracting document text…" : "Upload a PDF or TXT file"}</p>
                        <p className="text-sm text-muted-foreground">{isProcessingFile ? "Please keep this page open while we prepare the quiz source." : "or click to browse"}</p>
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
                          setQuizTitle("");
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
                    Temporary source text
                  </Label>
                  <Textarea
                    id="content"
                    aria-label="Or Paste Content"
                    placeholder="Paste approved lesson notes or a reviewed source excerpt when a permanent curriculum source is not yet available."
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
                    placeholder="e.g., Grade 10 Physics — Chapter 10 practice draft"
                    value={quizTitle}
                    onChange={(e) => setQuizTitle(e.target.value)}
                  />
                </div>
                </> : <>
                  <div className="rounded-xl border border-primary/15 bg-primary/[0.035] p-5">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><LibraryBig className="h-5 w-5" /></div>
                      <div>
                        <p className="font-bold text-foreground">Reviewed curriculum source</p>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">Select the book chapters you want to include. One tick creates chapter practice; several ticks create combined-chapter practice.</p>
                      </div>
                    </div>
                  </div>
                  {!activeScopeCatalog && !scopeCatalogQuery.isLoading && <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-5 text-muted-foreground">{scopeCatalogQuery.error ? "This account cannot load approved chapter choices. Ask Portal Admin to confirm access." : `No approved ${SUBJECT_LABELS[subject]} textbook is active yet.`}</div>}
                  {scopeCatalogQuery.isLoading && <div className="flex items-center gap-2 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading approved chapters…</div>}
                  {activeScopeCatalog && <fieldset className="space-y-2" aria-label="Select textbook chapters">
                    <legend className="text-sm font-bold text-foreground">Select the chapters for this draft</legend>
                    <p className="text-xs leading-5 text-muted-foreground">Tick one chapter for focused practice, or tick several chapters for a combined draft.</p>
                    <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-border bg-background/60 p-2 pr-1">
                      {chapters.map((chapter) => {
                        const selected = selectedChapterIds.includes(chapter.id);
                        return <label key={chapter.id} className="flex cursor-pointer items-start gap-2 rounded-md p-2 hover:bg-muted/70">
                          <Checkbox checked={selected} onCheckedChange={(checked) => toggleChapter(chapter.id, checked === true)} aria-label={`${chapter.code ? `${chapter.code}: ` : ""}${chapter.title}`} />
                          <span className="min-w-0 text-sm leading-5 text-foreground"><span className="font-medium">{chapter.code ? `${chapter.code}: ` : ""}{chapter.title}</span>{chapter.startPage && chapter.endPage && <span className="block text-xs text-muted-foreground">Textbook pages {chapter.startPage}–{chapter.endPage}</span>}</span>
                        </label>;
                      })}
                    </div>
                    <p className="text-xs font-medium text-primary">{selectedChapterIds.length === 0 ? "Choose at least one chapter." : selectedChapterIds.length === 1 ? "One chapter selected." : `${selectedChapterIds.length} chapters selected.`}</p>
                    <p className="text-xs text-muted-foreground">Active source: <span className="font-medium text-foreground">{activeScopeCatalog.curriculumSet.label}</span>{activeScopeCatalog.curriculumSet.editionLabel ? ` — ${activeScopeCatalog.curriculumSet.editionLabel}` : ""}</p>
                  </fieldset>}
                  <div>
                    <Label htmlFor="title" className="text-sm font-medium mb-2 block">Draft title</Label>
                    <Input id="title" placeholder="e.g., Grade 10 Physics — Chapter 10 practice draft" value={quizTitle} onChange={(e) => setQuizTitle(e.target.value)} />
                  </div>
                </>}

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
                      <span className="text-sm font-medium">{contentAnalysis.recommended?.minimum || contentAnalysis.recommended?.min || contentAnalysis.recommendedQuestions?.minimum}</span>
                      <div className="flex-1 h-2 bg-accent/20 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-accent to-secondary"
                          style={{
                            width: `${((contentAnalysis.recommended?.optimal || contentAnalysis.recommendedQuestions?.optimal) / (contentAnalysis.recommended?.maximum || contentAnalysis.recommended?.max || contentAnalysis.recommendedQuestions?.maximum)) * 100}%`
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium">{contentAnalysis.recommended?.maximum || contentAnalysis.recommended?.max || contentAnalysis.recommendedQuestions?.maximum}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Optimal: <span className="font-semibold text-accent">{contentAnalysis.recommended?.optimal || contentAnalysis.recommendedQuestions?.optimal}</span> questions
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {isGenerating && (() => {
              const activeStep = getGenerationStep(generationProgress);
              return (
                <Card className="overflow-hidden border-accent/30 bg-card shadow-lg shadow-accent/10" aria-live="polite">
                  <div className="h-1.5 bg-gradient-to-r from-accent via-secondary to-accent animate-pulse" />
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent/15 text-accent">
                        <Sparkles className="h-6 w-6 animate-pulse" aria-hidden="true" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-base font-semibold text-foreground">{activeStep.label}</p>
                            <p className="mt-1 text-sm text-muted-foreground">{activeStep.detail}</p>
                          </div>
                          <span className="rounded-full bg-accent/15 px-3 py-1 text-sm font-semibold text-accent tabular-nums">
                            {generationProgress}%
                          </span>
                        </div>

                        <div
                          className="mt-5 h-2.5 overflow-hidden rounded-full bg-muted"
                          role="progressbar"
                          aria-label="Quiz generation progress"
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={generationProgress}
                          aria-valuetext={`${generationProgress}% complete: ${activeStep.label}`}
                        >
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-accent via-secondary to-accent transition-all duration-700 ease-out"
                            style={{ width: `${generationProgress}%` }}
                          />
                        </div>

                        <div className="mt-5 grid grid-cols-2 gap-x-3 gap-y-2 text-xs sm:grid-cols-3">
                          {GENERATION_STEPS.slice(1).map((step) => {
                            const isComplete = generationProgress >= step.threshold;
                            return (
                              <div key={step.threshold} className={isComplete ? "flex items-center gap-1.5 text-accent" : "flex items-center gap-1.5 text-muted-foreground"}>
                                <span className={isComplete ? "h-1.5 w-1.5 rounded-full bg-accent" : "h-1.5 w-1.5 rounded-full bg-muted-foreground/40"} />
                                <span>{step.label.replace(" your", "").replace(" study material", " material")}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })()}

            {/* Generated MCQs Preview */}
            {generatedMcqs.length > 0 && (
              <Card className="border-accent/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-accent" />
                    Generated MCQ Draft ({generatedMcqs.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {generatedDraft && (
                    <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-foreground">Admin review required before assignment or publication</p>
                        <span className="rounded-full bg-background/70 px-2.5 py-1 text-xs font-medium text-amber-600 dark:text-amber-300">Draft</span>
                      </div>
                      <p className="mt-1 text-muted-foreground">{generatedDraft.quiz?.instructions}</p>
                      {generatedDraft.qualityChecks?.reviewWarnings?.length > 0 && (
                        <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                          {generatedDraft.qualityChecks.reviewWarnings.map((warning: string) => <li key={warning}>• {warning}</li>)}
                        </ul>
                      )}
                    </div>
                  )}
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
                        {(mcq.sourceReference || mcq.learningObjective) && (
                          <div className="mt-3 border-t border-border/60 pt-2 text-xs text-muted-foreground">
                            {mcq.sourceReference && <p><span className="font-medium text-foreground">Source:</span> {mcq.sourceReference}</p>}
                            {mcq.learningObjective && <p><span className="font-medium text-foreground">Learning objective:</span> {mcq.learningObjective}</p>}
                          </div>
                        )}
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
            <Card className="border-border/80 bg-card shadow-sm lg:sticky lg:top-22">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <SlidersHorizontal className="h-5 w-5 text-primary" />
                  Draft setup
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Number of Questions */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    Number of Questions: <span className="text-accent font-bold">{numQuestions || "Auto"}</span>
                  </Label>
                  <Input
                    type="number"
                    min={contentAnalysis?.recommended?.minimum || contentAnalysis?.recommended?.min || 5}
                    max={contentAnalysis?.recommended?.maximum || contentAnalysis?.recommended?.max || 100}
                    value={numQuestions || ""}
                    onChange={(e) => {
                      const nextValue = Number.parseInt(e.target.value, 10);
                      setIsQuestionCountManual(Boolean(e.target.value));
                      setNumQuestions(Number.isFinite(nextValue) ? nextValue : null);
                    }}
                    placeholder="10"
                  />
                  {contentAnalysis && numQuestions && (
                    <div className="mt-3 space-y-2">
                      <Slider
                        value={[numQuestions]}
                        min={contentAnalysis.recommended?.minimum || contentAnalysis.recommended?.min || 5}
                        max={contentAnalysis.recommended?.maximum || contentAnalysis.recommended?.max || 100}
                        step={1}
                        onValueChange={([value]) => {
                          setIsQuestionCountManual(true);
                          setNumQuestions(value);
                        }}
                        aria-label="Number of questions"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Min {contentAnalysis.recommended?.minimum || contentAnalysis.recommended?.min}</span>
                        <span>Recommended {contentAnalysis.recommended?.optimal}</span>
                        <span>Max {contentAnalysis.recommended?.maximum || contentAnalysis.recommended?.max}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Teacher context */}
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">MCQ settings</p>
                    <p className="mt-1 text-xs text-muted-foreground">Choose where the questions come from and how challenging they should be.</p>
                  </div>

                  {!isContextEditing && <div className="rounded-xl border border-primary/15 bg-primary/[0.035] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div><p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">Teacher context</p><p className="mt-1 text-sm font-bold text-foreground">Grade 10 · {SUBJECT_LABELS[subject]}</p></div>
                      <Button type="button" variant="outline" size="sm" onClick={() => setIsContextEditing(true)}>Change</Button>
                    </div>
                  </div>}

                  <div className={isContextEditing ? "" : "hidden"}>
                    <Label htmlFor="class-level" className="mb-2 block text-xs font-medium">Class level</Label>
                    <Select value={gradeLevel} onValueChange={(value) => setGradeLevel(value as GradeLevel)}>
                      <SelectTrigger id="class-level" aria-label="Class level"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10th Grade · FBISE (configured)</SelectItem>
                        <SelectItem value="9">9th Grade · FBISE (curriculum intake)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {gradeLevel === "9" && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800"><strong>Grade 9 is intentionally not using Grade 10 rules.</strong> Its revised pattern and approved material must be confirmed before MCQ draft generation is enabled. The portal structure is ready for its separate curriculum intake.</div>}

                  {gradeLevel === "10" && <div className={isContextEditing ? "" : "hidden"}>
                    <Label htmlFor="subject" className="mb-2 block text-xs font-medium">Subject</Label>
                    <Select value={subject} onValueChange={(value) => setSubject(value as FbiseSubject)}>
                      <SelectTrigger id="subject" aria-label="Subject"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(SUBJECT_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>}

                  {isContextEditing && gradeLevel === "10" && <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => setIsContextEditing(false)}>Continue with Grade 10 {SUBJECT_LABELS[subject]}</Button>}

                </div>

                {/* Legacy sidebar scope controls are superseded by the explicit source cards above. */}
                <div className="hidden" aria-hidden="true">
                  {gradeLevel === "10" && <div>
                    <Label htmlFor="generation-scope" className="mb-2 block text-xs font-medium">Generation scope</Label>
                    <Select value={scopeType} onValueChange={(value) => setScopeType(value as GenerationScope)}>
                      <SelectTrigger id="generation-scope" aria-label="Generation scope"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="uploaded_content">My uploaded or pasted lesson material</SelectItem>
                        <SelectItem value="single_chapter">An approved chapter</SelectItem>
                        <SelectItem value="half_chapter">Part of an approved chapter</SelectItem>
                        <SelectItem value="multiple_chapters">Several approved chapters</SelectItem>
                        <SelectItem value="half_syllabus">An approved half-syllabus range</SelectItem>
                        <SelectItem value="block">An approved study block</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>}

                  {gradeLevel === "10" && scopeType !== "uploaded_content" && !activeScopeCatalog && !scopeCatalogQuery.isLoading && (
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-muted-foreground">
                      {scopeCatalogQuery.error
                        ? "This account cannot load reviewed curriculum scopes. Sign in with an administrator account to use stored sources."
                        : `No approved ${SUBJECT_LABELS[subject]} chapter is available yet. Please ask an academy administrator to prepare the source before using this option.`}
                    </div>
                  )}

                  {gradeLevel === "10" && (scopeType === "single_chapter" || scopeType === "half_chapter" || scopeType === "multiple_chapters") && activeScopeCatalog && (
                    <fieldset className="space-y-2" aria-label="Select chapters">
                      <legend className="mb-2 text-xs font-medium text-foreground">{scopeType === "multiple_chapters" ? "Select chapters" : "Select a chapter"}</legend>
                      <div className="max-h-36 space-y-2 overflow-y-auto pr-1">
                        {chapters.map((chapter) => {
                          const selected = selectedChapterIds.includes(chapter.id);
                          return (
                            <label key={chapter.id} className="flex cursor-pointer items-start gap-2 rounded-md p-1.5 hover:bg-muted/70">
                              <Checkbox
                                checked={selected}
                                onCheckedChange={(checked) => toggleChapter(chapter.id, checked === true)}
                                aria-label={`${chapter.code ? `${chapter.code}: ` : ""}${chapter.title}`}
                              />
                              <span className="min-w-0 text-xs leading-4 text-foreground">
                                <span className="font-medium">{chapter.code ? `${chapter.code}: ` : ""}{chapter.title}</span>
                                {chapter.startPage && chapter.endPage && <span className="block text-muted-foreground">Pages {chapter.startPage}–{chapter.endPage}</span>}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </fieldset>
                  )}

                  {gradeLevel === "10" && scopeType === "half_chapter" && selectedChapter && (
                    <div>
                      <Label htmlFor="chapter-segment" className="mb-2 block text-xs font-medium">Chapter segment</Label>
                      <Select value={selectedSegmentId?.toString() ?? undefined} onValueChange={(value) => setSelectedSegmentId(Number(value))}>
                        <SelectTrigger id="chapter-segment"><SelectValue placeholder="Choose first or second half" /></SelectTrigger>
                        <SelectContent>
                          {availableSegments.map((segment) => <SelectItem key={segment.id} value={segment.id.toString()}>{segment.label}{segment.startPage && segment.endPage ? ` (pages ${segment.startPage}–${segment.endPage})` : ""}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {!availableSegments.length && <p className="mt-1 text-xs text-amber-600 dark:text-amber-300">This chapter needs its reviewed half-chapter segments before it can be selected.</p>}
                    </div>
                  )}

                  {gradeLevel === "10" && (scopeType === "half_syllabus" || scopeType === "block") && activeScopeCatalog && (
                    <div>
                      <Label htmlFor="scope-template" className="mb-2 block text-xs font-medium">{scopeType === "block" ? "Configured block" : "Configured half syllabus"}</Label>
                      <Select value={selectedScopeTemplateId?.toString() ?? undefined} onValueChange={(value) => setSelectedScopeTemplateId(Number(value))}>
                        <SelectTrigger id="scope-template"><SelectValue placeholder="Choose a reviewed scope" /></SelectTrigger>
                        <SelectContent>
                          {availableTemplates.map((template) => <SelectItem key={template.id} value={template.id.toString()}>{template.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {!availableTemplates.length && <p className="mt-1 text-xs text-amber-600 dark:text-amber-300">No active reviewed {scopeType === "block" ? "blocks" : "half-syllabus templates"} are available for this subject.</p>}
                    </div>
                  )}

                  {gradeLevel === "10" && scopeType !== "uploaded_content" && activeScopeCatalog && (
                    <p className="text-xs text-muted-foreground">Active source: <span className="font-medium text-foreground">{activeScopeCatalog.curriculumSet.label}</span>{activeScopeCatalog.curriculumSet.editionLabel ? ` — ${activeScopeCatalog.curriculumSet.editionLabel}` : ""}</p>
                  )}
                </div>

                {/* Difficulty */}
                <div>
                  <Label htmlFor="difficulty" className="text-sm font-medium mb-2 block">
                    Difficulty profile
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
                  aria-label="Generate MCQs"
                  disabled={gradeLevel !== "10" || isGenerating || isProcessingFile || !hasGenerationSource || !quizTitle.trim()}
                  className="w-full bg-primary text-primary-foreground font-semibold shadow-sm hover:bg-primary/90"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating... {generationProgress}%
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate MCQ Draft
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
                        Save Reviewed Draft
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
                  Draft Generation Safeguards
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-2">
                <p>✓ Uses the selected uploaded material or reviewed curriculum scope</p>
                <p>✓ Generates conceptual, FBISE-style MCQ drafts</p>
                <p>✓ Preserves a source reference and learning objective for every item</p>
                <p>✓ Requires admin review before any assignment or publication</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </AcademyShell>
  );
}

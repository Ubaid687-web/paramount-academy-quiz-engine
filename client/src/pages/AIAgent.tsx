import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AcademyShell } from "@/components/AcademyShell";
import { trpc } from "@/lib/trpc";
import { GENERATION_STEPS, getGenerationStep, getNextSimulatedProgress } from "@/lib/generation-progress";
import { submitNativePdfExport } from "@/lib/pdfDownload";
import { calculateQuestionRecommendation } from "@shared/questionRecommendation";
import { useLocation } from "wouter";
import { Loader2, Sparkles, CheckCircle2, AlertCircle, Upload, FileText, X, GraduationCap, LibraryBig, SlidersHorizontal, ChevronLeft, ChevronRight, ClipboardCheck, ScanLine, ShieldCheck, FileCheck2, Clock3 } from "lucide-react";
import { toast } from "sonner";

type FbiseSubject = string;
type GradeLevel = string;
type GenerationScope = "single_chapter" | "half_chapter" | "multiple_chapters" | "half_syllabus" | "block";
type AssessmentMode = "mcq" | "short" | "long" | "full_paper";
type SourceView = "choice" | "approved";
type FullPaperDraftItem = {
  id: string;
  kind: "short" | "long";
  question: string;
  expectedAnswer?: string;
  markingGuide?: string[];
  expectedKeyPoints?: string[];
  markingRubric?: Array<{ criterion: string; marks: number }>;
  difficulty: "easy" | "medium" | "hard";
  marks: number;
  sourceReference: string;
  learningObjective: string;
};
type FullPaperSection = { id: string; label: string; instructions: string; items: FullPaperDraftItem[] };
type PrintableGenerationProgress = {
  completedPairs: number;
  totalPairs: number;
  totalBatches: number;
  currentBatchIndex: number;
  currentBatchPairs: number;
  failure?: string;
};

const SUBJECT_LABELS: Record<string, string> = {
  physics: "Physics",
  chemistry: "Chemistry",
  computer_science: "Computer Science",
};

const formatSubjectLabel = (subject: string) => SUBJECT_LABELS[subject] ?? subject.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

const ASSESSMENT_MODE_LABELS: Record<AssessmentMode, string> = {
  mcq: "MCQ",
  short: "Short questions",
  long: "Long questions",
  full_paper: "Full paper",
};

export default function AIAgent() {
  const [, navigate] = useLocation();
  const readyProgrammesQuery = trpc.curriculum.listReadyProgrammes.useQuery();
  const requestedGrade = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("grade") : null;
  const requestedSubject = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("subject") : null;
  const requestedBoard = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("board") : null;
  const requestedSubjectIsValid = Boolean(requestedSubject?.trim());
  const [contentText, setContentText] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [numQuestions, setNumQuestions] = useState<number | null>(null);
  const [questionCountInput, setQuestionCountInput] = useState("");
  const [questionCountError, setQuestionCountError] = useState<string | null>(null);
  const [isQuestionCountManual, setIsQuestionCountManual] = useState(false);
  const isQuestionCountManualRef = useRef(false);
  const questionCountAnalysisTimerRef = useRef<number | null>(null);
  const [difficulty, setDifficulty] = useState<"balanced" | "easy" | "medium" | "hard">("balanced");
  const [quizTitle, setQuizTitle] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMcqs, setGeneratedMcqs] = useState<any[]>([]);
  const [generatedDraft, setGeneratedDraft] = useState<any>(null);
  const [generatedPrintablePaper, setGeneratedPrintablePaper] = useState<any>(null);
  const [printableCacheReused, setPrintableCacheReused] = useState(false);
  const [printableGenerationProgress, setPrintableGenerationProgress] = useState<PrintableGenerationProgress | null>(null);
  const [paperPairCount, setPaperPairCount] = useState(5);
  const [paperPairCountInput, setPaperPairCountInput] = useState("5");
  const [paperPairCountError, setPaperPairCountError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<number | null>(null);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [contentAnalysis, setContentAnalysis] = useState<any>(null);
  const [subject, setSubject] = useState<FbiseSubject>(() => requestedSubjectIsValid ? requestedSubject! : "physics");
  const [gradeLevel, setGradeLevel] = useState<GradeLevel>(() => requestedGrade?.trim() || "10");
  const [isContextEditing, setIsContextEditing] = useState(() => !requestedSubjectIsValid);
  const [scopeType, setScopeType] = useState<GenerationScope>("multiple_chapters");
  const [selectedChapterIds, setSelectedChapterIds] = useState<number[]>([]);
  const [selectedSegmentId, setSelectedSegmentId] = useState<number | null>(null);
  const [selectedScopeTemplateId, setSelectedScopeTemplateId] = useState<number | null>(null);
  const [assessmentMode, setAssessmentMode] = useState<AssessmentMode>("mcq");
  const [draftQuestion, setDraftQuestion] = useState("");
  const [draftExpectedAnswer, setDraftExpectedAnswer] = useState("");
  const [draftMarkingPoints, setDraftMarkingPoints] = useState("");
  const [draftRubric, setDraftRubric] = useState("");
  const [draftMarks, setDraftMarks] = useState(2);
  const [draftSourceReference, setDraftSourceReference] = useState("");
  const [draftLearningObjective, setDraftLearningObjective] = useState("");
  const [savedAssessmentDraftId, setSavedAssessmentDraftId] = useState<number | null>(null);
  const [reviewDraftId, setReviewDraftId] = useState<number | null>(null);
  const [requestedReviewDraftId, setRequestedReviewDraftId] = useState<number | null>(null);
  const [fullPaperItemMode, setFullPaperItemMode] = useState<"short" | "long">("short");
  const [fullPaperSections, setFullPaperSections] = useState<FullPaperSection[]>([{ id: "section-1", label: "Section A", instructions: "Attempt the following question.", items: [] }]);
  const [activeFullPaperSectionId, setActiveFullPaperSectionId] = useState("section-1");
  const [selectedPatternSourceIds, setSelectedPatternSourceIds] = useState<number[]>([]);
  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4>(1);
  const [sourceView, setSourceView] = useState<SourceView>("choice");
  const [settingsView, setSettingsView] = useState<"count" | "difficulty">("count");
  const [showSavedDraftLoader, setShowSavedDraftLoader] = useState(false);
  const [showLeaveGenerationConfirm, setShowLeaveGenerationConfirm] = useState(() => new URLSearchParams(window.location.search).get("previewLeaveConfirm") === "1");

  const readyProgrammes = readyProgrammesQuery.data ?? [];
  const programmeBoard = readyProgrammes.find((programme) => programme.board === (requestedBoard || "FBISE") && programme.grade === gradeLevel && programme.subject === subject)?.board ?? requestedBoard ?? "FBISE";
  const selectedReadyProgramme = readyProgrammes.find((programme) => programme.board === programmeBoard && programme.grade === gradeLevel && programme.subject === subject);
  const isProgrammeReady = Boolean(selectedReadyProgramme);
  const readyGrades = Array.from(new Set(readyProgrammes.map((programme) => programme.grade))).sort((left, right) => Number(right) - Number(left) || left.localeCompare(right));
  const readySubjectsForGrade = readyProgrammes.filter((programme) => programme.grade === gradeLevel && programme.board === programmeBoard);

  const generateMutation = trpc.aiAgent.generateMCQs.useMutation();
  const startPrintableGenerationMutation = trpc.aiAgent.startPrintableGeneration.useMutation();
  const advancePrintableGenerationMutation = trpc.aiAgent.advancePrintableGeneration.useMutation();
  const saveMutation = trpc.aiAgent.saveGeneratedQuiz.useMutation();
  const saveAssessmentDraftMutation = trpc.assessment.saveDraft.useMutation();
  const reviseAssessmentDraftMutation = trpc.assessment.reviseDraft.useMutation();
  const scopeCatalogQuery = trpc.curriculum.getActiveScopeCatalog.useQuery(
    { board: "FBISE", grade: gradeLevel, subject },
    { enabled: activeStep >= 2 }
  );
  const assessmentAvailabilityQuery = trpc.assessment.getAvailability.useQuery({ board: "FBISE", grade: gradeLevel, subject });
  const assessmentDraftQuery = trpc.assessment.getDraft.useQuery({ assessmentDraftId: requestedReviewDraftId || 0 }, { enabled: requestedReviewDraftId !== null });
  const statusQuery = trpc.aiAgent.getGenerationStatus.useQuery(
    { jobId: jobId || 0 },
    { enabled: !!jobId && isGenerating, refetchInterval: 1000 }
  );

  const hasActiveApprovedTextbook = Boolean(scopeCatalogQuery.data);

  useEffect(() => {
    if (!scopeCatalogQuery.isLoading && !scopeCatalogQuery.data) {
      setScopeType("multiple_chapters");
      setSelectedChapterIds([]);
      setSelectedSegmentId(null);
      setSelectedScopeTemplateId(null);
    }
  }, [scopeCatalogQuery.data, scopeCatalogQuery.isLoading, scopeType]);

  useEffect(() => {
    if (!statusQuery.data) return;
    setGenerationProgress(statusQuery.data.progress);
    if (statusQuery.data.status === "completed" || statusQuery.data.status === "failed") {
      setIsGenerating(false);
    }
  }, [statusQuery.data?.progress, statusQuery.data?.status]);

  useEffect(() => {
    if (!isGenerating || assessmentMode !== "mcq") return;

    const progressTimer = window.setInterval(() => {
      setGenerationProgress((currentProgress) => {
        return getNextSimulatedProgress(currentProgress);
      });
    }, 850);

    return () => window.clearInterval(progressTimer);
  }, [assessmentMode, isGenerating]);

  useEffect(() => {
    const draft = assessmentDraftQuery.data;
    if (!draft || !requestedReviewDraftId) return;
    try {
      const payload = JSON.parse(draft.draftPayload);
      setAssessmentMode(payload.mode as AssessmentMode);
      setQuizTitle(payload.title ?? draft.title);
      setSavedAssessmentDraftId(draft.id);
      setActiveStep(3);
      if (payload.mode === "full_paper") {
        const sections = (payload.sections ?? []).map((section: { label: string; instructions: string; items: FullPaperDraftItem[] }, index: number) => ({
          ...section,
          id: `loaded-section-${index + 1}`,
          items: section.items.map((item, itemIndex) => ({ ...item, id: `loaded-item-${index + 1}-${itemIndex + 1}` })),
        }));
        setFullPaperSections(sections);
        if (sections[0]) setActiveFullPaperSectionId(sections[0].id);
      } else {
        const item = payload.items?.[0];
        if (item) {
          setDraftQuestion(item.question ?? "");
          setDraftExpectedAnswer(item.expectedAnswer ?? "");
          setDraftMarkingPoints((item.markingGuide ?? item.expectedKeyPoints ?? []).join("\n"));
          setDraftRubric((item.markingRubric ?? []).map((criterion: { criterion: string; marks: number }) => `${criterion.criterion} | ${criterion.marks}`).join("\n"));
          setDraftMarks(item.marks ?? 1);
          setDraftSourceReference(item.sourceReference ?? "");
          setDraftLearningObjective(item.learningObjective ?? "");
        }
      }
      toast.success("Assessment draft loaded for review.");
    } catch {
      toast.error("The saved assessment draft could not be read.");
    }
  }, [assessmentDraftQuery.data, requestedReviewDraftId]);

  useEffect(() => {
    const trimmedContent = contentText.trim();
    if (!trimmedContent) {
      if (questionCountAnalysisTimerRef.current !== null) window.clearTimeout(questionCountAnalysisTimerRef.current);
      questionCountAnalysisTimerRef.current = null;
      setContentAnalysis(null);
      setNumQuestions(null);
      setQuestionCountInput("");
      setQuestionCountError(null);
      setIsQuestionCountManual(false);
      isQuestionCountManualRef.current = false;
      return;
    }

    const analysisTimer = window.setTimeout(() => {
      const wordCount = trimmedContent.split(/\s+/).filter(Boolean).length;
      const complexity = determineComplexity(trimmedContent);
      const sectionCount = trimmedContent
        .split(/\n\s*(?:chapter|unit|section|\d+[.)])/i)
        .filter((section) => section.trim().split(/\s+/).length >= 40).length;
            const topicCount = Math.max(1, Math.min(10, (trimmedContent.match(/\b[A-Z][a-z]{3,}\b/g) || []).length), sectionCount);
      const recommended = calculateQuestionRecommendation({
        totalWords: wordCount,
        complexity,
        sectionCount,
        topicCount,
      });
      setContentAnalysis({ wordCount, complexity, topicCount, recommended });
    }, 300);
    questionCountAnalysisTimerRef.current = analysisTimer;

    return () => {
      window.clearTimeout(analysisTimer);
      if (questionCountAnalysisTimerRef.current === analysisTimer) questionCountAnalysisTimerRef.current = null;
    };
  }, [contentText]);

  useEffect(() => {
    setSelectedChapterIds([]);
    setSelectedSegmentId(null);
    setSelectedScopeTemplateId(null);
  }, [gradeLevel, subject, scopeType]);

  useEffect(() => {
    if (!isProgrammeReady) setActiveStep(1);
  }, [isProgrammeReady]);

  const activeScopeCatalog = scopeCatalogQuery.data;
  const estimatedTopicCapacity = (() => {
    if (!activeScopeCatalog) return null;

    const chapterTopicCount = (chapterId: number) => activeScopeCatalog.chapters.find((chapter) => chapter.id === chapterId)?.estimatedTopicCount ?? 0;
    if (scopeType === "half_chapter") {
      if (selectedSegmentId !== null) {
        return activeScopeCatalog.segments.find((segment) => segment.id === selectedSegmentId)?.estimatedTopicCount ?? null;
      }
      return selectedChapterIds[0] ? chapterTopicCount(selectedChapterIds[0]) : null;
    }
    if (scopeType === "half_syllabus" || scopeType === "block") {
      if (selectedScopeTemplateId === null) return null;
      const chapterIds = activeScopeCatalog.templateMemberships
        .filter((membership) => membership.scopeTemplateId === selectedScopeTemplateId)
        .map((membership) => membership.chapterId);
      return chapterIds.reduce((total, chapterId) => total + chapterTopicCount(chapterId), 0) || null;
    }
    if (selectedChapterIds.length === 0) return null;
    return selectedChapterIds.reduce((total, chapterId) => total + chapterTopicCount(chapterId), 0) || null;
  })();
  const parsedQuestionCountForCapacity = /^\d+$/.test(questionCountInput) ? Number.parseInt(questionCountInput, 10) : null;
  const showTopicCapacityWarning = assessmentMode === "mcq"
    && settingsView === "count"
    && parsedQuestionCountForCapacity !== null
    && parsedQuestionCountForCapacity >= 1
    && parsedQuestionCountForCapacity <= 100
    && estimatedTopicCapacity !== null
    && parsedQuestionCountForCapacity > estimatedTopicCapacity;
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
    : scopeType) as GenerationScope;
  const hasGenerationSource = isProgrammeReady && hasValidStoredScope;
  const assessmentAvailability = assessmentAvailabilityQuery.data;
  const isSelectedModeAvailable = assessmentAvailability
    ? assessmentAvailability.supportedModes[assessmentMode]
    : assessmentMode !== "full_paper";
  const isAutomaticMcqMode = assessmentMode === "mcq";
  const isPrintablePaperMode = assessmentMode === "short" || assessmentMode === "long";
  const canAdvanceToDraft = isProgrammeReady
    && !isProcessingFile
    && Boolean(quizTitle.trim())
    && hasValidStoredScope;
  const activeFullPaperSection = fullPaperSections.find((section) => section.id === activeFullPaperSectionId) ?? fullPaperSections[0];
  const sourceInputReady = hasValidStoredScope;
  const builderStepLabel = activeStep === 1 ? "Quiz type" : activeStep === 2 ? "Source" : activeStep === 3 ? "Quiz settings" : "Review";
  const builderProgress = Math.round((activeStep / 4) * 100);

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
    if (!isProgrammeReady) {
      toast.error("This programme is not ready for teacher generation. Portal Admin must activate a reviewed curriculum edition first.");
      return;
    }
    if (!hasValidStoredScope) {
      toast.error("Complete the selected curriculum scope before generating a draft");
      return;
    }

    if (!quizTitle.trim()) {
      toast.error("Please enter a quiz title");
      return;
    }

    const requestedQuestionCount = Number.parseInt(questionCountInput, 10);
    if (!/^\d+$/.test(questionCountInput) || !Number.isInteger(requestedQuestionCount) || requestedQuestionCount < 1 || requestedQuestionCount > 100) {
      setQuestionCountError("Enter a whole number from 1 to 100 before generating.");
      toast.error("Enter a whole number from 1 to 100 before generating.");
      return;
    }
    setNumQuestions(requestedQuestionCount);
    setQuestionCountError(null);

    setIsGenerating(true);
    setActiveStep(4);
    setGeneratedMcqs([]);
    setGeneratedDraft(null);
    setGenerationProgress(8);

    try {
      const result = await generateMutation.mutateAsync({
        numQuestions: requestedQuestionCount,
        difficulty,
        scope: {
          board: "FBISE",
          grade: gradeLevel,
          subject,
          scopeType: generationScopeType,
          chapterIds: selectedChapterIds,
          segmentIds: selectedSegmentId ? [selectedSegmentId] : [],
          scopeTemplateId: selectedScopeTemplateId ?? undefined,
        },
      });

      if (result.draft?.status === "error") {
        setJobId(result.jobId);
        setGenerationProgress(0);
        setIsGenerating(false);
        setActiveStep(3);
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
      setActiveStep(3);
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
        difficulty,
        jobId: jobId || 0,
      });

      toast.success("Quiz saved successfully!");
      setTimeout(() => navigate("/"), 1500);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save quiz");
    }
  };

  const completePrintableGeneration = (result: { payload: unknown; cacheReused: boolean; completedPairs: number }) => {
    setGenerationProgress(100);
    setGeneratedPrintablePaper(result.payload);
    setPrintableCacheReused(Boolean(result.cacheReused));
    setPrintableGenerationProgress((current) => current ? { ...current, completedPairs: result.completedPairs, failure: undefined } : current);
    toast.success(result.cacheReused ? "Reused an exact recent paper draft; no new AI call was made." : `${assessmentMode === "short" ? "Short" : "Long"} question paper draft created for review.`);
  };

  const advancePrintableGeneration = async (activeJobId: number, initialProgress: PrintableGenerationProgress) => {
    let progressState = initialProgress;
    try {
      while (progressState.completedPairs < progressState.totalPairs) {
        setPrintableGenerationProgress({ ...progressState, failure: undefined });
        const result = await advancePrintableGenerationMutation.mutateAsync({ jobId: activeJobId });
        if (result.status === "completed") {
          if (!result.payload) throw new Error("The printable paper completed without a safe final draft. Please start again.");
          completePrintableGeneration({ payload: result.payload, cacheReused: result.cacheReused, completedPairs: result.completedPairs });
          return;
        }
        const nextPairs = result.totalPairs - result.completedPairs;
        progressState = {
          completedPairs: result.completedPairs,
          totalPairs: result.totalPairs,
          totalBatches: result.totalBatches,
          currentBatchIndex: Math.floor(result.completedPairs / 4) + 1,
          currentBatchPairs: Math.min(4, nextPairs),
        };
        setGenerationProgress(result.progress);
        setPrintableGenerationProgress(progressState);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "The printable paper paused before the next batch could be verified.";
      setPrintableGenerationProgress({ ...progressState, failure: message });
      toast.error(progressState.completedPairs > 0 ? `${message} Verified pairs have been kept safely; you can resume from this point.` : `${message} No pair was verified, so retrying will start with the first batch.`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGeneratePrintablePaper = async () => {
    if (!isPrintablePaperMode) return;
    if (!quizTitle.trim()) return toast.error("Please enter a paper title.");
    if (!hasValidStoredScope) return toast.error("Complete the selected approved textbook scope before generating a printable paper.");
    const requestedPairCount = Number.parseInt(paperPairCountInput, 10);
    if (!/^\d+$/.test(paperPairCountInput) || !Number.isInteger(requestedPairCount) || requestedPairCount < 1 || requestedPairCount > 30) {
      setPaperPairCountError("Enter a whole number from 1 to 30.");
      toast.error("Enter a whole number from 1 to 30 before generating the paper.");
      return;
    }
    setPaperPairCount(requestedPairCount);
    setPaperPairCountError(null);
    setIsGenerating(true);
    setActiveStep(4);
    setGeneratedPrintablePaper(null);
    setPrintableCacheReused(false);
    setGenerationProgress(0);
    try {
      const start = await startPrintableGenerationMutation.mutateAsync({
        paperType: assessmentMode,
        title: quizTitle.trim(),
        pairCount: requestedPairCount,
        difficulty,
        scope: { board: "FBISE", grade: gradeLevel, subject, scopeType: generationScopeType, chapterIds: selectedChapterIds, segmentIds: selectedSegmentId ? [selectedSegmentId] : [], scopeTemplateId: selectedScopeTemplateId ?? undefined },
      });
      setJobId(start.jobId);
      if (start.status === "completed") {
        if (!start.payload) throw new Error("The cached printable paper is unavailable. Please start a new draft.");
        completePrintableGeneration({ payload: start.payload, cacheReused: start.cacheReused, completedPairs: start.completedPairs });
        return;
      }
      const initialProgress: PrintableGenerationProgress = {
        completedPairs: start.completedPairs,
        totalPairs: start.totalPairs,
        totalBatches: start.totalBatches,
        currentBatchIndex: 1,
        currentBatchPairs: Math.min(4, start.totalPairs),
      };
      setPrintableGenerationProgress(initialProgress);
      await advancePrintableGeneration(start.jobId, initialProgress);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to prepare the printable paper.");
      setIsGenerating(false);
      setActiveStep(3);
    }
  };

  const handleResumePrintableGeneration = async () => {
    if (!jobId || !printableGenerationProgress) return;
    setIsGenerating(true);
    setPrintableGenerationProgress({ ...printableGenerationProgress, failure: undefined });
    await advancePrintableGeneration(jobId, { ...printableGenerationProgress, failure: undefined });
  };

  const handlePrintableDownload = (kind: "paper" | "solution") => {
    if (!generatedPrintablePaper || !jobId) return;
    submitNativePdfExport({ kind, jobId });
  };

  const handleMcqDownload = (kind: "paper" | "solution") => {
    if (!generatedMcqs.length || !jobId) return;
    submitNativePdfExport({ kind: kind === "paper" ? "mcq-paper" : "mcq-solution", jobId });
  };

  const handleSaveManualAssessmentDraft = async () => {
    toast.error("Manual paper composition is unavailable. Generate a source-bound printable draft from the selected textbook scope instead.");
  };

  const buildManualDraftItem = (mode: "short" | "long") => {
    if (!draftQuestion.trim() || !draftMarks || !draftSourceReference.trim() || !draftLearningObjective.trim()) {
      toast.error("Add a question, marks, source reference, and learning objective before continuing.");
      return null;
    }
    const markingPoints = draftMarkingPoints.split("\n").map((point) => point.trim()).filter(Boolean);
    const baseItem = {
      question: draftQuestion.trim(),
      difficulty: difficulty === "balanced" ? "medium" as const : difficulty,
      marks: draftMarks,
      sourceReference: draftSourceReference.trim(),
      learningObjective: draftLearningObjective.trim(),
    };
    if (mode === "short") {
      if (!draftExpectedAnswer.trim() || !markingPoints.length) {
        toast.error("Add an expected answer and at least one marking-guide point.");
        return null;
      }
      return { kind: "short" as const, ...baseItem, expectedAnswer: draftExpectedAnswer.trim(), markingGuide: markingPoints };
    }
    const markingRubric = draftRubric.split("\n").map((line) => {
      const [criterion, marks] = line.split("|");
      return { criterion: criterion?.trim() ?? "", marks: Number(marks?.trim()) };
    });
    const rubricTotal = markingRubric.reduce((total, item) => total + item.marks, 0);
    if (!markingPoints.length || !markingRubric.length || rubricTotal !== draftMarks) {
      toast.error("Add expected key points and a complete rubric whose marks equal the question marks.");
      return null;
    }
    return { kind: "long" as const, ...baseItem, expectedKeyPoints: markingPoints, markingRubric };
  };

  const handleSaveFullPaperDraft = async () => {
    toast.error("Manual full-paper composition is unavailable. Use source-bound printable draft generation for the selected textbook scope.");
  };

  const updateActiveFullPaperSection = (updates: Partial<Pick<FullPaperSection, "label" | "instructions">>) => {
    setFullPaperSections((sections) => sections.map((section) => section.id === activeFullPaperSectionId ? { ...section, ...updates } : section));
  };

  const addFullPaperSection = () => {
    const nextIndex = fullPaperSections.length + 1;
    const section = { id: `section-${Date.now()}`, label: `Section ${String.fromCharCode(64 + nextIndex)}`, instructions: "Attempt the following question.", items: [] as FullPaperDraftItem[] };
    setFullPaperSections((sections) => [...sections, section]);
    setActiveFullPaperSectionId(section.id);
  };

  const addItemToFullPaperSection = () => {
    const item = buildManualDraftItem(fullPaperItemMode);
    if (!item) return;
    const storedItem: FullPaperDraftItem = { ...item, id: `item-${Date.now()}` };
    setFullPaperSections((sections) => sections.map((section) => section.id === activeFullPaperSectionId ? { ...section, items: [...section.items, storedItem] } : section));
    setDraftQuestion("");
    setDraftExpectedAnswer("");
    setDraftMarkingPoints("");
    setDraftRubric("");
    setDraftSourceReference("");
    setDraftLearningObjective("");
  };

  const handleLoadAssessmentDraft = () => {
    if (!reviewDraftId) {
      toast.error("Enter an assessment draft ID to load it for review.");
      return;
    }
    setRequestedReviewDraftId(reviewDraftId);
  };

  const handleReturnToQuizCentre = () => {
    if (isGenerating && assessmentMode === "mcq") {
      setShowLeaveGenerationConfirm(true);
      return;
    }
    navigate("/");
  };

  return (
    <AcademyShell eyebrow="Assessment Draft Studio">
      <main className="container py-8 sm:py-10">
        <div className="mb-6 rounded-2xl border border-border/80 bg-card px-5 py-6 shadow-sm sm:px-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-primary"><GraduationCap className="h-4 w-4" />Assessment builder</p>
              <h1 className="mt-2 text-3xl font-bold text-foreground sm:text-4xl">{activeStep === 4 ? "Review your draft." : !isContextEditing && isProgrammeReady ? `Grade ${gradeLevel} ${selectedReadyProgramme?.teacherLabel ?? formatSubjectLabel(subject)}` : "New assessment"}</h1>
            </div>
            <Button type="button" variant="outline" size="sm" className="academy-back-button" onClick={handleReturnToQuizCentre}><ChevronLeft className="h-4 w-4" />Back to Quiz Centre</Button>
          </div>
          <div className="mt-5" aria-label="Assessment preparation progress" aria-live="polite">
            <div className="flex items-center justify-between gap-3"><p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">Step {activeStep} of 4</p><p className="text-xs font-medium text-muted-foreground">{builderStepLabel}</p></div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={1} aria-valuemax={4} aria-valuenow={activeStep} aria-label={`Step ${activeStep} of 4`}><div className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out" style={{ width: `${builderProgress}%` }} /></div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
            {activeStep === 1 && <Card className="border-border/80 bg-card shadow-sm motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">1</span>
                  Choose assessment output
                </CardTitle>
                <CardDescription>MCQs can be taken online or printed. Short and long questions are printable papers only.</CardDescription>
              </CardHeader>
              <CardContent>
                {isContextEditing ? <div className="mb-5 rounded-xl border border-primary/20 bg-primary/[0.035] p-4">
                  <div className="mb-3"><p className="text-sm font-bold text-foreground">Class and subject</p></div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div><Label htmlFor="class-level" className="mb-2 block text-xs font-medium">Class level</Label><Select value={gradeLevel} onValueChange={(value) => { const firstProgramme = readyProgrammes.find((programme) => programme.grade === value); setGradeLevel(value); if (firstProgramme) setSubject(firstProgramme.subject); setActiveStep(1); }}><SelectTrigger id="class-level" aria-label="Class level"><SelectValue /></SelectTrigger><SelectContent>{readyGrades.map((grade) => <SelectItem key={grade} value={grade}>Grade {grade} · approved programmes</SelectItem>)}</SelectContent></Select></div>
                    <div><Label htmlFor="subject" className="mb-2 block text-xs font-medium">Subject</Label><Select value={subject} onValueChange={(value) => { setSubject(value); setActiveStep(1); }}><SelectTrigger id="subject" aria-label="Subject"><SelectValue /></SelectTrigger><SelectContent>{readySubjectsForGrade.map((programme) => <SelectItem key={programme.id} value={programme.subject}>{programme.teacherLabel}</SelectItem>)}</SelectContent></Select></div>
                  </div>
                  {!isProgrammeReady ? <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">This programme is not ready. Choose one of the approved programme entries above.</div> : <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => setIsContextEditing(false)}>Continue</Button>}
                </div> : <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/15 bg-primary/[0.035] p-3"><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">Teacher context</p><p className="mt-1 text-sm font-bold text-foreground">Grade {gradeLevel} · {selectedReadyProgramme?.teacherLabel ?? formatSubjectLabel(subject)}</p></div><Button type="button" variant="outline" size="sm" onClick={() => { setIsContextEditing(true); setActiveStep(1); }}>Change</Button></div>}
                {!isContextEditing && <div className="grid gap-3 sm:grid-cols-3" aria-label="Assessment output type">
                  {[
                    { mode: "mcq" as const, title: "MCQ quiz", detail: "Online practice and printable PDF." },
                    { mode: "short" as const, title: "Short question paper", detail: "Printable paper and solution key only." },
                    { mode: "long" as const, title: "Long question paper", detail: "Printable paper and solution key only." },
                  ].map((option) => <button key={option.mode} type="button" aria-pressed={assessmentMode === option.mode} disabled={!isProgrammeReady || (assessmentAvailability ? !assessmentAvailability.supportedModes[option.mode] : false)} onClick={() => { setAssessmentMode(option.mode); setGeneratedPrintablePaper(null); setSourceView("choice"); setActiveStep(2); }} className={`rounded-xl border p-4 text-left transition-[transform,background-color,border-color,box-shadow] duration-200 ease-out active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55 ${assessmentMode === option.mode ? "border-primary bg-primary/[0.055] shadow-sm" : "border-border bg-muted/30 hover:border-primary/40"}`}><span className="block text-sm font-bold text-foreground">{option.title}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{option.detail}</span></button>)}
                </div>}
              </CardContent>
            </Card>}

            {activeStep === 2 && <Card className="border-border/80 bg-card shadow-sm motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-200">
              <CardHeader className="p-5 pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div><CardTitle className="text-xl">Select source</CardTitle><CardDescription>{sourceView === "choice" ? "Choose the approved source path." : "Choose reviewed textbook chapters."}</CardDescription></div>
                  {sourceView !== "choice" && <Button type="button" variant="ghost" size="sm" onClick={() => setSourceView("choice")} aria-label="Change source">Change</Button>}
                </div>
              </CardHeader>
              <CardContent className="space-y-4 p-5 pt-2">
                {sourceView === "choice" && <div className="space-y-3" aria-label="Choose a source path">
                  <button type="button" disabled={!hasActiveApprovedTextbook || scopeCatalogQuery.isLoading} onClick={() => { setScopeType("multiple_chapters"); setSourceView("approved"); }} className={`w-full rounded-xl border p-4 text-left transition-[background-color,border-color,box-shadow] ${hasActiveApprovedTextbook ? "border-primary/25 bg-primary/[0.04] hover:border-primary/50 hover:shadow-sm" : "cursor-not-allowed border-border bg-muted/30 opacity-65"}`}>
                    <div className="flex items-start justify-between gap-3"><div className="flex items-center gap-2"><LibraryBig className="h-4 w-4 text-primary" /><span className="text-sm font-bold text-foreground">Approved textbook chapters</span></div><span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide text-primary">{hasActiveApprovedTextbook ? "Recommended" : "Unavailable"}</span></div>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">Use the reviewed source already prepared by Portal Admin.</p>
                  </button>
                  {!hasActiveApprovedTextbook && !scopeCatalogQuery.isLoading && <p className="text-xs text-muted-foreground">No verified {SUBJECT_LABELS[subject]} textbook is active.</p>}
                </div>}

                {sourceView === "approved" && <div className="space-y-4">
                  {scopeCatalogQuery.isLoading && <div className="flex items-center gap-2 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading reviewed chapters…</div>}
                  {!activeScopeCatalog && !scopeCatalogQuery.isLoading && <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-muted-foreground">{scopeCatalogQuery.error ? "Approved chapters are unavailable." : `No verified ${SUBJECT_LABELS[subject]} textbook is active.`}</div>}
                  {activeScopeCatalog && <fieldset className="space-y-2" aria-label="Select textbook chapters"><legend className="text-sm font-bold text-foreground">Select chapters</legend><div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border bg-background/60 p-2">{chapters.map((chapter) => { const selected = selectedChapterIds.includes(chapter.id); return <label key={chapter.id} className="flex cursor-pointer items-start gap-2 rounded-md p-2 hover:bg-muted/70"><Checkbox checked={selected} onCheckedChange={(checked) => toggleChapter(chapter.id, checked === true)} aria-label={`${chapter.code ? `${chapter.code}: ` : ""}${chapter.title}`} /><span className="min-w-0 text-sm leading-5 text-foreground"><span className="font-medium">{chapter.code ? `${chapter.code}: ` : ""}{chapter.title}</span>{chapter.startPage && chapter.endPage && <span className="block text-xs text-muted-foreground">Pages {chapter.startPage}–{chapter.endPage}</span>}</span></label>; })}</div><p className="text-xs font-medium text-primary">{selectedChapterIds.length === 0 ? "Choose at least one chapter." : selectedChapterIds.length === 1 ? "One chapter selected." : `${selectedChapterIds.length} chapters selected.`}</p></fieldset>}
                  {sourceInputReady && <div><Label htmlFor="approved-title" className="mb-2 block text-sm font-medium">Quiz title</Label><Input id="approved-title" placeholder="e.g., Grade 10 Physics revision" value={quizTitle} onChange={(event) => setQuizTitle(event.target.value)} /></div>}
                  <div className="flex items-center justify-between gap-3 border-t border-border pt-3"><p className="text-xs text-muted-foreground">{sourceInputReady ? (quizTitle.trim() ? "Ready" : "Add a title to continue.") : "Select a chapter first."}</p><Button type="button" variant="outline" size="sm" onClick={() => setActiveStep(1)}><ChevronLeft className="mr-1 h-4 w-4" />Back</Button><Button type="button" size="sm" disabled={!canAdvanceToDraft} onClick={() => { setSettingsView("count"); setActiveStep(3); }}>Continue<ChevronRight className="ml-1 h-4 w-4" /></Button></div>
                </div>}

              </CardContent>
            </Card>}
            {false && activeStep === 3 && assessmentMode === "full_paper" && isSelectedModeAvailable && <Card className="border-primary/20 bg-card shadow-sm motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">3</span>
                  Full-paper review draft
                </CardTitle>
                <CardDescription>Start a reviewable paper section only from selected approved textbook chapters and active supplied paper sources. The structure remains a draft until Portal Admin review.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!savedAssessmentDraftId && !hasValidStoredScope ? <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-6 text-muted-foreground">Select at least one approved textbook chapter above before starting a full-paper draft.</div> : <>
                  <fieldset className="space-y-2" aria-label="Select approved paper sources">
                    <legend className="text-sm font-medium text-foreground">Approved paper evidence</legend>
                    <p className="text-xs leading-5 text-muted-foreground">Select every reviewed model or past paper that supports this paper structure.</p>
                    {(assessmentAvailability?.paperSources ?? []).map((source) => <label key={source.id} className="flex items-start gap-2 rounded-lg border border-border p-3 hover:bg-muted/60">
                      <Checkbox checked={selectedPatternSourceIds.includes(source.id)} onCheckedChange={(checked) => setSelectedPatternSourceIds((current) => checked === true ? [...current, source.id] : current.filter((id) => id !== source.id))} aria-label={source.originalFileName} />
                      <span className="text-sm text-foreground"><span className="font-medium">{source.originalFileName}</span><span className="block text-xs text-muted-foreground">{source.sourceKind.replace("_", " ")}{source.academicYear ? ` · ${source.academicYear}` : ""}</span></span>
                    </label>)}
                  </fieldset>
                  <div className="flex flex-wrap gap-2" aria-label="Full-paper sections">{fullPaperSections.map((section) => <Button key={section.id} type="button" size="sm" variant={section.id === activeFullPaperSection?.id ? "default" : "outline"} onClick={() => setActiveFullPaperSectionId(section.id)}>{section.label || "Untitled section"} · {section.items.length} item{section.items.length === 1 ? "" : "s"}</Button>)}<Button type="button" size="sm" variant="outline" onClick={addFullPaperSection}>Add section</Button></div>
                  {activeFullPaperSection && <><div className="grid gap-4 sm:grid-cols-2">
                    <div><Label htmlFor="full-paper-section" className="mb-2 block text-sm font-medium">Section label</Label><Input id="full-paper-section" value={activeFullPaperSection.label} onChange={(event) => updateActiveFullPaperSection({ label: event.target.value })} /></div>
                    <div><Label htmlFor="full-paper-item-kind" className="mb-2 block text-sm font-medium">Question form</Label><Select value={fullPaperItemMode} onValueChange={(value) => setFullPaperItemMode(value as "short" | "long")}><SelectTrigger id="full-paper-item-kind"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="short">Short question</SelectItem><SelectItem value="long">Long question</SelectItem></SelectContent></Select></div>
                  </div>
                  <div><Label htmlFor="full-paper-instructions" className="mb-2 block text-sm font-medium">Section instructions</Label><Input id="full-paper-instructions" value={activeFullPaperSection.instructions} onChange={(event) => updateActiveFullPaperSection({ instructions: event.target.value })} /></div></>}
                  <div><Label htmlFor="assessment-question" className="mb-2 block text-sm font-medium">Question</Label><Textarea id="assessment-question" value={draftQuestion} onChange={(event) => setDraftQuestion(event.target.value)} placeholder="Enter a source-grounded question for review." className="min-h-28 resize-none" /></div>
                  {fullPaperItemMode === "short" ? <div><Label htmlFor="expected-answer" className="mb-2 block text-sm font-medium">Expected answer</Label><Textarea id="expected-answer" value={draftExpectedAnswer} onChange={(event) => setDraftExpectedAnswer(event.target.value)} placeholder="State the concise expected answer." className="min-h-24 resize-none" /></div> : null}
                  <div><Label htmlFor="marking-points" className="mb-2 block text-sm font-medium">{fullPaperItemMode === "short" ? "Marking guide" : "Expected key points"}</Label><Textarea id="marking-points" value={draftMarkingPoints} onChange={(event) => setDraftMarkingPoints(event.target.value)} placeholder="One marking point per line" className="min-h-24 resize-none" /></div>
                  {fullPaperItemMode === "long" && <div><Label htmlFor="marking-rubric" className="mb-2 block text-sm font-medium">Marking rubric</Label><Textarea id="marking-rubric" value={draftRubric} onChange={(event) => setDraftRubric(event.target.value)} placeholder="One criterion per line using: criterion | marks" className="min-h-24 resize-none" /></div>}
                  <div className="grid gap-4 sm:grid-cols-3"><div><Label htmlFor="assessment-marks" className="mb-2 block text-sm font-medium">Marks</Label><Input id="assessment-marks" type="number" min={1} value={draftMarks} onChange={(event) => setDraftMarks(Number(event.target.value) || 0)} /></div><div className="sm:col-span-2"><Label htmlFor="source-reference" className="mb-2 block text-sm font-medium">Textbook source reference</Label><Input id="source-reference" value={draftSourceReference} onChange={(event) => setDraftSourceReference(event.target.value)} placeholder="e.g., selected chapter heading and page range" /></div></div>
                  <div><Label htmlFor="learning-objective" className="mb-2 block text-sm font-medium">Learning objective</Label><Input id="learning-objective" value={draftLearningObjective} onChange={(event) => setDraftLearningObjective(event.target.value)} placeholder="Describe the knowledge or skill this item assesses." /></div>
                  <Button type="button" variant="outline" onClick={addItemToFullPaperSection} className="w-full">Add this item to {activeFullPaperSection?.label || "section"}</Button>
                  {activeFullPaperSection?.items.length ? <div className="space-y-2 rounded-xl border border-border bg-muted/20 p-3" aria-label="Items in active full-paper section">{activeFullPaperSection.items.map((item, index) => <div key={item.id} className="flex items-start justify-between gap-3 rounded-lg bg-background p-3 text-sm"><span><strong>{index + 1}. {item.kind === "short" ? "Short" : "Long"} · {item.marks} mark{item.marks === 1 ? "" : "s"}</strong><span className="mt-1 block text-muted-foreground">{item.question}</span></span><Button type="button" variant="ghost" size="sm" onClick={() => setFullPaperSections((sections) => sections.map((section) => section.id === activeFullPaperSection.id ? { ...section, items: section.items.filter((candidate) => candidate.id !== item.id) } : section))}>Remove</Button></div>)}</div> : <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">Add at least one validated item to this section before saving the full-paper draft.</p>}
                  <Button type="button" onClick={handleSaveFullPaperDraft} disabled={saveAssessmentDraftMutation.isPending} className="w-full bg-primary text-primary-foreground font-semibold shadow-sm hover:bg-primary/90">{saveAssessmentDraftMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving full-paper draft…</> : "Save full-paper draft for review"}</Button>
                  {savedAssessmentDraftId && <div className="rounded-lg border border-accent/30 bg-accent/10 p-3 text-sm text-foreground"><strong>Draft saved.</strong> Assessment draft #{savedAssessmentDraftId} is awaiting Portal Admin review.</div>}
                </>}
              </CardContent>
            </Card>}

            {activeStep === 3 && isPrintablePaperMode && isSelectedModeAvailable && !generatedPrintablePaper && <Card className="border-primary/20 bg-card shadow-sm motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">3</span>{assessmentMode === "short" ? "Short question paper" : "Long question paper"}</CardTitle>
                <CardDescription>Creates a source-grounded draft for printing only. It does not create an online student quiz.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm leading-6 text-muted-foreground"><strong>Draft review required.</strong> Verify source references, answer wording, formulas, and diagrams before issuing this paper.</div>
                <div><Label htmlFor="paper-pairs" className="mb-2 block text-sm font-medium">Numbered OR pairs</Label><Input id="paper-pairs" type="number" inputMode="numeric" value={paperPairCountInput} onChange={(event) => { const rawValue = event.target.value; setPaperPairCountInput(rawValue); setPaperPairCountError(null); if (/^\d+$/.test(rawValue)) setPaperPairCount(Number.parseInt(rawValue, 10)); }} onBlur={() => { if (paperPairCountInput === "") { setPaperPairCountError("Enter a whole number from 1 to 30."); return; } const parsedValue = Number.parseInt(paperPairCountInput, 10); if (!/^\d+$/.test(paperPairCountInput) || !Number.isInteger(parsedValue) || parsedValue < 1 || parsedValue > 30) { setPaperPairCountError("Enter a whole number from 1 to 30."); return; } setPaperPairCount(parsedValue); setPaperPairCountError(null); }} /><p className="mt-1 text-xs text-muted-foreground">Each numbered question includes an alternative of equal marks. Choose 1–30 pairs; the source still must support a different concept for each numbered pair.</p>{paperPairCountError && <p className="mt-2 text-xs text-destructive" role="alert">{paperPairCountError}</p>}</div>
                <div className="flex flex-col gap-2 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between"><Button type="button" variant="outline" size="sm" onClick={() => setActiveStep(2)}><ChevronLeft className="mr-1 h-4 w-4" />Back</Button><Button type="button" onClick={handleGeneratePrintablePaper} disabled={isGenerating || startPrintableGenerationMutation.isPending || advancePrintableGenerationMutation.isPending || !canAdvanceToDraft} className="sm:flex-1 bg-primary text-primary-foreground font-semibold shadow-sm hover:bg-primary/90">{isGenerating || startPrintableGenerationMutation.isPending || advancePrintableGenerationMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Preparing verified paper batch…</> : "Generate printable paper draft"}</Button></div>
                {generatedPrintablePaper && <div className="space-y-3 rounded-xl border border-accent/30 bg-accent/5 p-4"><div><p className="font-semibold text-foreground">Printable draft ready</p><p className="mt-1 text-sm text-muted-foreground">{generatedPrintablePaper.items?.length || 0} prompts across {paperPairCount} OR pairs. This is not an online quiz.</p></div><div className="flex flex-col gap-2 sm:flex-row"><Button type="button" variant="outline" className="flex-1" onClick={() => handlePrintableDownload("paper")}>Download paper PDF</Button><Button type="button" variant="outline" className="flex-1" onClick={() => handlePrintableDownload("solution")}>Download solution key</Button></div><p className="text-xs text-muted-foreground">Your browser will receive the PDF directly from this tap. If the paper needs regeneration, the browser will show a clear message.</p></div>}
              </CardContent>
            </Card>}

            {activeStep === 4 && !isGenerating && generatedPrintablePaper && <Card className="border-accent/20 bg-card shadow-sm motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-accent" />Printable draft ready</CardTitle>
                <CardDescription>Review the paper and solution key before printing.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 text-sm text-foreground"><strong>{generatedPrintablePaper.items?.length || 0} prompts</strong> across {paperPairCount} OR pairs.</div>
                {printableCacheReused && <p className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs leading-5 text-foreground" data-testid="cached-draft-notice">Reused an exact recent draft. No new AI call was made; source review is still required before printing.</p>}
                <div className="flex flex-col gap-2 sm:flex-row"><Button type="button" variant="outline" className="flex-1" onClick={() => handlePrintableDownload("paper")}>Download paper PDF</Button><Button type="button" variant="outline" className="flex-1" onClick={() => handlePrintableDownload("solution")}>Download solution key</Button></div>
                <div className="flex flex-col gap-2 sm:flex-row"><Button type="button" variant="ghost" className="flex-1" onClick={() => setActiveStep(3)}><ChevronLeft className="mr-1 h-4 w-4" />Back to settings</Button><Button type="button" className="flex-1" onClick={() => { setGeneratedPrintablePaper(null); setActiveStep(3); }}>Create another draft</Button></div>
              </CardContent>
            </Card>}

            {activeStep === 4 && !isGenerating && !generatedPrintablePaper && printableGenerationProgress?.failure && <Card className="border-amber-500/30 bg-card shadow-sm" aria-live="polite">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><AlertCircle className="h-5 w-5 text-amber-600" />{printableGenerationProgress.completedPairs > 0 ? "Printable paper paused safely" : "Printable paper needs a safe retry"}</CardTitle>
              <CardDescription>{printableGenerationProgress.completedPairs > 0 ? "Previously verified OR pairs are retained. The next request will continue from the saved batch rather than generate them again." : "No OR pair was accepted, so the next request will retry the first batch after the source-evidence check is corrected."}</CardDescription>
            </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-foreground"><strong>{printableGenerationProgress.completedPairs} of {printableGenerationProgress.totalPairs} OR pairs verified.</strong><p className="mt-1 text-muted-foreground">{printableGenerationProgress.failure}</p></div>
                <div className="flex flex-col gap-2 sm:flex-row"><Button type="button" variant="outline" className="sm:flex-1" onClick={() => setActiveStep(3)}><ChevronLeft className="mr-1 h-4 w-4" />Back to settings</Button><Button type="button" className="sm:flex-1" onClick={handleResumePrintableGeneration}><Sparkles className="mr-2 h-4 w-4" />{printableGenerationProgress.completedPairs > 0 ? "Resume verified generation" : "Retry first batch"}</Button></div>
              </CardContent>
            </Card>}

            {activeStep === 4 && isGenerating && (() => {
              const generationStage = getGenerationStep(generationProgress);
              const printableProgress = isPrintablePaperMode ? printableGenerationProgress : null;
              const nextPairStart = printableProgress ? printableProgress.completedPairs + 1 : 0;
              const nextPairEnd = printableProgress ? Math.min(printableProgress.totalPairs, printableProgress.completedPairs + printableProgress.currentBatchPairs) : 0;
              const progressLabel = printableProgress
                ? `Generating and verifying pairs ${nextPairStart}–${nextPairEnd} of ${printableProgress.totalPairs}`
                : generationStage.label;
              const progressDetail = printableProgress
                ? `Batch ${printableProgress.currentBatchIndex} of ${printableProgress.totalBatches}. Each pair must pass source and diversity checks before the next batch starts.`
                : generationStage.detail;
              const exactProgress = printableProgress ? Math.round((printableProgress.completedPairs / printableProgress.totalPairs) * 100) : generationProgress;
              const printableActivity = printableProgress ? [
                { label: "Source scope locked", detail: "Approved material selected", tooltip: "The selected textbook chapters or lesson material are fixed for this paper. Generation cannot use material outside this source.", icon: ShieldCheck, state: "complete" as const },
                { label: `Batch ${printableProgress.currentBatchIndex} in progress`, detail: `Pairs ${nextPairStart}–${nextPairEnd} are being prepared`, icon: ScanLine, state: "active" as const },
                { label: "Review draft release", detail: "Available only after every pair verifies", tooltip: "This remains waiting until every requested OR pair passes source checks. Only then is the review draft released.", icon: FileCheck2, state: "waiting" as const },
              ] : [];
              return (
                <Card className="overflow-hidden border-accent/30 bg-card shadow-[0_20px_60px_oklch(0.66_0.16_165_/_0.12)]" aria-live="polite" data-testid="generation-activity-panel">
                  <div className="h-1.5 bg-gradient-to-r from-primary via-accent to-secondary motion-safe:animate-pulse" />
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent/15 text-accent">
                        <span className="absolute inset-1 rounded-xl border border-accent/30 motion-safe:animate-ping motion-safe:[animation-duration:2.4s]" aria-hidden="true" />
                        {printableProgress ? <ScanLine className="h-6 w-6" aria-hidden="true" /> : <Sparkles className="h-6 w-6 motion-safe:animate-pulse" aria-hidden="true" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-base font-semibold text-foreground">{progressLabel}</p>
                            <p className="mt-1 text-sm text-muted-foreground">{progressDetail}</p>
                          </div>
                          <span className="rounded-full bg-accent/15 px-3 py-1 text-sm font-semibold text-accent tabular-nums" data-testid="generation-exact-progress">
                            {printableProgress ? `${printableProgress.completedPairs} of ${printableProgress.totalPairs} verified` : `${generationProgress}%`}
                          </span>
                        </div>

                        <div
                          className="mt-5 h-2.5 overflow-hidden rounded-full bg-muted"
                          role="progressbar"
                          aria-label={printableProgress ? "Printable paper verification progress" : "Quiz generation progress"}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={exactProgress}
                          aria-valuetext={printableProgress ? `${printableProgress.completedPairs} of ${printableProgress.totalPairs} OR pairs verified` : `${generationProgress}% complete: ${generationStage.label}`}
                        >
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-accent via-secondary to-accent transition-all duration-700 ease-out"
                            style={{ width: `${exactProgress}%` }}
                          />
                        </div>

                        {printableProgress ? <><div className="mt-5 grid gap-2 sm:grid-cols-3" aria-label="Printable generation activity">
                          {printableActivity.map(({ label, detail, tooltip, icon: Icon, state }) => {
                            const tooltipId = tooltip ? `generation-activity-tooltip-${state}` : undefined;
                            const activityCard = <div className={`rounded-xl border p-3 ${tooltip ? "cursor-help outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2" : ""} ${state === "complete" ? "border-accent/25 bg-accent/[0.06]" : state === "active" ? "border-primary/25 bg-primary/[0.05]" : "border-border bg-muted/25"}`} data-testid={tooltip ? `generation-activity-${state}` : undefined} role={tooltip ? "group" : undefined} aria-label={tooltip ? `${label}: explanation available` : undefined} aria-describedby={tooltipId} title={tooltip} tabIndex={tooltip ? 0 : undefined}>
                              <div className="flex items-center gap-2"><Icon className={`h-4 w-4 ${state === "complete" ? "text-accent" : state === "active" ? "text-primary motion-safe:animate-pulse" : "text-muted-foreground"}`} aria-hidden="true" /><p className="text-xs font-bold text-foreground">{label}</p></div>
                              <p className="mt-1 text-[11px] leading-4 text-muted-foreground">{detail}</p>
                              {tooltip && <span id={tooltipId} className="sr-only">{tooltip}</span>}
                            </div>;

                            return tooltip ? <Tooltip key={label}><TooltipTrigger asChild>{activityCard}</TooltipTrigger><TooltipContent side="top" sideOffset={8} className="max-w-64 leading-5"><p>{tooltip}</p></TooltipContent></Tooltip> : <div key={label}>{activityCard}</div>;
                          })}
                        </div><p className="mt-4 flex items-start gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs leading-5 text-muted-foreground"><Clock3 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />The completed-pair count is exact. This screen stays active while the provider responds and the source-safety checks finish; the review draft appears only when every requested pair passes.</p></> : <div className="mt-5 grid grid-cols-2 gap-x-3 gap-y-2 text-xs sm:grid-cols-3">
                          {GENERATION_STEPS.slice(1).map((step) => {
                            const isComplete = generationProgress >= step.threshold;
                            return (
                              <div key={step.threshold} className={isComplete ? "flex items-center gap-1.5 text-accent" : "flex items-center gap-1.5 text-muted-foreground"}>
                                <span className={isComplete ? "h-1.5 w-1.5 rounded-full bg-accent" : "h-1.5 w-1.5 rounded-full bg-muted-foreground/40"} />
                                <span>{step.label.replace(" your", "").replace(" study material", " material")}</span>
                              </div>
                            );
                          })}
                        </div>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })()}

            {/* Generated MCQs Preview */}
            {activeStep === 4 && generatedMcqs.length > 0 && (
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
                      {generatedDraft.cache?.reused && <p className="mt-3 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs leading-5 text-foreground" data-testid="cached-draft-notice">{generatedDraft.cache.message ?? "Reused an exact recent draft; no new AI call was made."}</p>}
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
                            {mcq.sourceCitation ? (
                              <p data-testid="textbook-citation" className="mt-1 rounded-md bg-background/70 px-2 py-1 text-foreground">
                                <span className="font-medium">Textbook citation:</span>{" "}
                                {mcq.sourceCitation.chapterCode ? `${mcq.sourceCitation.chapterCode}: ` : ""}{mcq.sourceCitation.chapterTitle}
                                {mcq.sourceCitation.segmentLabel ? ` — ${mcq.sourceCitation.segmentLabel}` : ""}
                                {mcq.sourceCitation.startPage && mcq.sourceCitation.endPage ? `, pp. ${mcq.sourceCitation.startPage}–${mcq.sourceCitation.endPage}` : ""}
                                {` · “${mcq.sourceCitation.textAnchor}”`}
                              </p>
                            ) : null}
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
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row"><Button type="button" variant="outline" className="flex-1" onClick={() => handleMcqDownload("paper")}>Download MCQ paper PDF</Button><Button type="button" variant="outline" className="flex-1" onClick={() => handleMcqDownload("solution")}>Download MCQ solution key</Button></div>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row"><Button type="button" variant="ghost" className="flex-1" onClick={() => setActiveStep(3)}><ChevronLeft className="mr-1 h-4 w-4" />Back to settings</Button><Button type="button" className="flex-1" onClick={() => { setGeneratedMcqs([]); setGeneratedDraft(null); setActiveStep(3); }}>Create another draft</Button></div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Generation Settings */}
            {activeStep === 3 && isAutomaticMcqMode && <Card className="border-border/80 bg-card shadow-sm motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-200 lg:sticky lg:top-22">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <SlidersHorizontal className="h-5 w-5 text-primary" />
                  Draft setup
                </CardTitle>
                <CardDescription>{contentAnalysis ? `${contentAnalysis.wordCount || contentAnalysis.totalWords} words · ${contentAnalysis.complexity} · recommended ${contentAnalysis.recommended?.optimal || contentAnalysis.recommendedQuestions?.optimal} questions` : "Choose the number of questions, then set difficulty."}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Number of Questions */}
                {settingsView === "count" && <div>
                  <Label className="text-sm font-medium mb-2 block">
                    Number of Questions: <span className="text-accent font-bold">{questionCountInput || "Not set"}</span>
                  </Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={questionCountInput}
                    onChange={(e) => {
                      const rawValue = e.target.value;
                      if (questionCountAnalysisTimerRef.current !== null) window.clearTimeout(questionCountAnalysisTimerRef.current);
                      questionCountAnalysisTimerRef.current = null;
                      setQuestionCountInput(rawValue);
                      // Clearing is an in-progress manual edit, not a request to restore the recommendation.
                      isQuestionCountManualRef.current = true;
                      setIsQuestionCountManual(true);
                      setQuestionCountError(null);
                      if (rawValue === "") {
                        setNumQuestions(null);
                        return;
                      }
                      if (/^\d+$/.test(rawValue)) setNumQuestions(Number.parseInt(rawValue, 10));
                    }}
                    onBlur={() => {
                      if (questionCountInput === "") {
                        setNumQuestions(null);
                        return;
                      }
                      const parsedValue = Number.parseInt(questionCountInput, 10);
                      if (!/^\d+$/.test(questionCountInput) || !Number.isInteger(parsedValue) || parsedValue < 1 || parsedValue > 100) {
                        setQuestionCountError("Enter a whole number from 1 to 100.");
                        return;
                      }
                      setNumQuestions(parsedValue);
                      setQuestionCountError(null);
                    }}
                    placeholder="10"
                  />
                  {questionCountError && <p className="mt-2 text-xs text-destructive" role="alert">{questionCountError}</p>}
                  {showTopicCapacityWarning && estimatedTopicCapacity !== null && parsedQuestionCountForCapacity !== null && (
                    <Alert role="status" className="mt-3 border-amber-500/35 bg-amber-500/10 text-amber-950 dark:text-amber-100" data-testid="topic-capacity-warning">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-amber-900/85 dark:text-amber-100/85">
                        This source has about <strong>{estimatedTopicCapacity} distinct examinable topics</strong>, but you requested <strong>{parsedQuestionCountForCapacity} questions</strong>. You can continue, but generation may ask for a broader approved source or fewer questions rather than repeat the same concept.
                      </AlertDescription>
                    </Alert>
                  )}
                  {contentAnalysis && numQuestions && (
                    <div className="mt-3 space-y-2">
                      <Slider
                        value={[numQuestions]}
                        min={1}
                        max={100}
                        step={1}
                        onValueChange={([value]) => {
                          if (questionCountAnalysisTimerRef.current !== null) window.clearTimeout(questionCountAnalysisTimerRef.current);
                          questionCountAnalysisTimerRef.current = null;
                          isQuestionCountManualRef.current = true;
                          setIsQuestionCountManual(true);
                          setNumQuestions(value);
                          setQuestionCountInput(String(value));
                          setQuestionCountError(null);
                        }}
                        aria-label="Number of questions"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Min 1</span>
                        <span>Recommended {contentAnalysis.recommended?.optimal}</span>
                        <span>Max 100</span>
                      </div>
                    </div>
                  )}
                </div>}
                {settingsView === "count" && <div className="flex items-center justify-between gap-3 border-t border-border pt-3"><Button type="button" variant="outline" size="sm" onClick={() => setActiveStep(2)}><ChevronLeft className="mr-1 h-4 w-4" />Back</Button><Button type="button" size="sm" onClick={() => setSettingsView("difficulty")}>Continue<ChevronRight className="ml-1 h-4 w-4" /></Button></div>}

                {/* Teacher context */}
                <div className="hidden" aria-hidden="true">
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
                        <SelectItem value="single_chapter">An approved chapter</SelectItem>
                        <SelectItem value="half_chapter">Part of an approved chapter</SelectItem>
                        <SelectItem value="multiple_chapters">Several approved chapters</SelectItem>
                        <SelectItem value="half_syllabus">An approved half-syllabus range</SelectItem>
                        <SelectItem value="block">An approved study block</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>}

                  {gradeLevel === "10" && !activeScopeCatalog && !scopeCatalogQuery.isLoading && (
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

                  {gradeLevel === "10" && activeScopeCatalog && (
                    <p className="text-xs text-muted-foreground">Active source: <span className="font-medium text-foreground">{activeScopeCatalog.curriculumSet.label}</span>{activeScopeCatalog.curriculumSet.editionLabel ? ` — ${activeScopeCatalog.curriculumSet.editionLabel}` : ""}</p>
                  )}
                </div>

                {/* Difficulty */}
                {assessmentMode === "mcq" && settingsView === "difficulty" && <div>
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
                </div>}

                {assessmentMode === "mcq" && settingsView === "difficulty" && <div className="flex items-center justify-between gap-3 border-t border-border pt-3"><Button type="button" variant="outline" size="sm" onClick={() => setActiveStep(2)}><ChevronLeft className="mr-1 h-4 w-4" />Back to source</Button><Button type="button" variant="ghost" size="sm" onClick={() => setSettingsView("count")}>Edit count</Button></div>}

                {assessmentMode !== "mcq" && <div className="rounded-xl border border-primary/20 bg-primary/[0.04] p-3 text-sm leading-6 text-muted-foreground">
                  <p className="font-semibold text-foreground">{ASSESSMENT_MODE_LABELS[assessmentMode]} review framework</p>
                  <p className="mt-1">The system will require explicit marks, source references, learning objectives, and a reviewable marking structure before this format can be saved. No automatic question content is produced here yet.</p>
                </div>}

                {/* Generate Button */}
                {settingsView === "difficulty" && <Button
                  onClick={handleGenerate}
                  aria-label="Generate MCQs"
                  disabled={!isAutomaticMcqMode || gradeLevel !== "10" || isGenerating || isProcessingFile || !hasGenerationSource || !quizTitle.trim()}
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
                      {isAutomaticMcqMode ? "Generate MCQ Draft" : `${ASSESSMENT_MODE_LABELS[assessmentMode]} generation is not enabled yet`}
                    </>
                  )}
                </Button>}

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
            </Card>}


          </div>
        </div>
      </main>
      <AlertDialog open={showLeaveGenerationConfirm} onOpenChange={setShowLeaveGenerationConfirm}>
        <AlertDialogContent className="leave-generation-dialog-motion">
          <AlertDialogHeader>
            <AlertDialogTitle>Leave while MCQs are generating?</AlertDialogTitle>
            <AlertDialogDescription>
              Your request is still being prepared. Leaving now will remove this in-progress draft from this screen before you can review or save it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row" data-testid="leave-generation-actions">
            <AlertDialogCancel className="min-h-11 w-full border-primary bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground sm:w-auto">Keep generating</AlertDialogCancel>
            <AlertDialogAction className="min-h-11 w-full border border-destructive/40 bg-background text-destructive hover:bg-destructive/10 hover:text-destructive sm:w-auto" onClick={() => navigate("/")}>Leave generation</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AcademyShell>
  );
}

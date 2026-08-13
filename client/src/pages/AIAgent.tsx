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
type AssessmentMode = "mcq" | "short" | "long" | "full_paper";
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

const SUBJECT_LABELS: Record<FbiseSubject, string> = {
  physics: "Physics",
  chemistry: "Chemistry",
  computer_science: "Computer Science",
};

const ASSESSMENT_MODE_LABELS: Record<AssessmentMode, string> = {
  mcq: "MCQ",
  short: "Short questions",
  long: "Long questions",
  full_paper: "Full paper",
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

  const generateMutation = trpc.aiAgent.generateMCQs.useMutation();
  const saveMutation = trpc.aiAgent.saveGeneratedQuiz.useMutation();
  const saveAssessmentDraftMutation = trpc.assessment.saveDraft.useMutation();
  const reviseAssessmentDraftMutation = trpc.assessment.reviseDraft.useMutation();
  const pdfExtractMutation = trpc.pdfUpload.extractPdfText.useMutation();
  const scopeCatalogQuery = trpc.curriculum.getActiveScopeCatalog.useQuery({ subject }, { enabled: gradeLevel === "10" });
  const assessmentAvailabilityQuery = trpc.assessment.getAvailability.useQuery({ subject }, { enabled: gradeLevel === "10" });
  const assessmentDraftQuery = trpc.assessment.getDraft.useQuery({ assessmentDraftId: requestedReviewDraftId || 0 }, { enabled: requestedReviewDraftId !== null });
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
    const draft = assessmentDraftQuery.data;
    if (!draft || !requestedReviewDraftId) return;
    try {
      const payload = JSON.parse(draft.draftPayload);
      setAssessmentMode(payload.mode as AssessmentMode);
      setQuizTitle(payload.title ?? draft.title);
      setSavedAssessmentDraftId(draft.id);
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
  const assessmentAvailability = assessmentAvailabilityQuery.data;
  const isSelectedModeAvailable = assessmentAvailability
    ? assessmentAvailability.supportedModes[assessmentMode]
    : assessmentMode === "mcq";
  const isAutomaticMcqMode = assessmentMode === "mcq";
  const activeFullPaperSection = fullPaperSections.find((section) => section.id === activeFullPaperSectionId) ?? fullPaperSections[0];

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

  const handleSaveManualAssessmentDraft = async () => {
    if (assessmentMode === "mcq" || assessmentMode === "full_paper") return;
    if (!savedAssessmentDraftId && (scopeType === "uploaded_content" || !hasValidStoredScope)) {
      toast.error("Short and long drafts must use selected approved textbook chapters.");
      return;
    }
    if (!quizTitle.trim() || !draftQuestion.trim() || !draftMarks || !draftSourceReference.trim() || !draftLearningObjective.trim()) {
      toast.error("Add a title, question, marks, source reference, and learning objective before saving the draft.");
      return;
    }

    const item = buildManualDraftItem(assessmentMode);
    if (!item) return;

    try {
      const payload = { mode: assessmentMode, title: quizTitle.trim(), estimatedDurationMinutes: null, items: [item] };
      if (savedAssessmentDraftId) {
        await reviseAssessmentDraftMutation.mutateAsync({ assessmentDraftId: savedAssessmentDraftId, payload });
        toast.success(`${ASSESSMENT_MODE_LABELS[assessmentMode]} draft updated for Portal Admin review.`);
      } else {
        const result = await saveAssessmentDraftMutation.mutateAsync({
          assessmentMode,
          scope: {
            subject,
            scopeType: generationScopeType,
            chapterIds: selectedChapterIds,
            segmentIds: selectedSegmentId ? [selectedSegmentId] : [],
            scopeTemplateId: selectedScopeTemplateId ?? undefined,
          },
          payload,
        });
        setSavedAssessmentDraftId(result.assessmentDraftId);
        toast.success(`${ASSESSMENT_MODE_LABELS[assessmentMode]} draft saved for Portal Admin review.`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The assessment draft could not be saved.");
    }
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
    if (!savedAssessmentDraftId && (scopeType === "uploaded_content" || !hasValidStoredScope)) {
      toast.error("A full-paper draft must use selected approved textbook chapters.");
      return;
    }
    if (!selectedPatternSourceIds.length || !quizTitle.trim()) {
      toast.error("Select an approved paper source and enter a draft title before saving.");
      return;
    }
    if (!fullPaperSections.length || fullPaperSections.some((section) => !section.label.trim() || !section.instructions.trim() || !section.items.length)) {
      toast.error("Every full-paper section needs a label, instructions, and at least one saved item.");
      return;
    }
    const selectedPatternReferences = (assessmentAvailability?.paperSources ?? [])
      .filter((source) => selectedPatternSourceIds.includes(source.id))
      .map((source) => `${source.sourceKind}${source.academicYear ? ` ${source.academicYear}` : ""}: ${source.originalFileName}`);
    const totalMarks = fullPaperSections.reduce((paperTotal, section) => paperTotal + section.items.reduce((sectionTotal, item) => sectionTotal + item.marks, 0), 0);

    try {
      const payload = {
        mode: "full_paper" as const,
        title: quizTitle.trim(),
        estimatedDurationMinutes: null,
        patternReferences: selectedPatternReferences,
        totalMarks,
        sections: fullPaperSections.map(({ label, instructions, items }) => ({ label, instructions, items })),
      };
      if (savedAssessmentDraftId) {
        await reviseAssessmentDraftMutation.mutateAsync({ assessmentDraftId: savedAssessmentDraftId, payload });
        toast.success("Full-paper draft updated for Portal Admin review.");
      } else {
        const result = await saveAssessmentDraftMutation.mutateAsync({
          assessmentMode: "full_paper",
          scope: {
            subject,
            scopeType: generationScopeType,
            chapterIds: selectedChapterIds,
            segmentIds: selectedSegmentId ? [selectedSegmentId] : [],
            scopeTemplateId: selectedScopeTemplateId ?? undefined,
          },
          paperPatternSourceIds: selectedPatternSourceIds,
          payload,
        });
        setSavedAssessmentDraftId(result.assessmentDraftId);
        toast.success("Full-paper review draft saved for Portal Admin review.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The full-paper draft could not be saved.");
    }
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

  return (
    <AcademyShell eyebrow="Assessment Draft Studio">
      <main className="container py-8 sm:py-10">
        <div className="mb-8 rounded-2xl border border-border/80 bg-card px-5 py-6 shadow-sm sm:px-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-primary"><GraduationCap className="h-4 w-4" />Teacher preparation</p>
              <h1 className="mt-2 text-3xl font-bold text-foreground sm:text-4xl">{!isContextEditing && gradeLevel === "10" ? `Prepare Grade 10 ${SUBJECT_LABELS[subject]} ${ASSESSMENT_MODE_LABELS[assessmentMode]} draft` : "Prepare an assessment draft"}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Choose a source and assessment format. Every draft remains under academy review before students use it.</p>
            </div>
            <div className="rounded-xl border border-primary/15 bg-primary/5 px-3 py-2 text-right">
              <p className="text-xs font-semibold text-primary">Assessment type</p>
              <p className="mt-0.5 text-sm font-bold text-foreground">{ASSESSMENT_MODE_LABELS[assessmentMode]} draft</p>
            </div>
          </div>
        </div>

        <Card className="mb-6 border-border/80 bg-card shadow-sm">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Label htmlFor="review-draft-id" className="mb-2 block text-sm font-medium">Open saved assessment draft</Label>
              <Input id="review-draft-id" inputMode="numeric" value={reviewDraftId ?? ""} onChange={(event) => setReviewDraftId(Number(event.target.value) || null)} placeholder="Assessment draft ID" />
            </div>
            <Button type="button" variant="outline" onClick={handleLoadAssessmentDraft} disabled={assessmentDraftQuery.isFetching}>{assessmentDraftQuery.isFetching ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading…</> : "Load for review"}</Button>
            {savedAssessmentDraftId && <p className="text-xs font-medium text-primary">Editing saved draft #{savedAssessmentDraftId}</p>}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-border/80 bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">1</span>
                  Choose assessment format
                </CardTitle>
                <CardDescription>Formats are visible now, but a format can only draft from an active approved source. Full papers also require reviewed model or past-paper evidence.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 sm:grid-cols-2" aria-label="Choose assessment format">
                  {(Object.keys(ASSESSMENT_MODE_LABELS) as AssessmentMode[]).map((mode) => {
                    const available = assessmentAvailability ? assessmentAvailability.supportedModes[mode] : mode === "mcq";
                    const selected = assessmentMode === mode;
                    return <button
                      key={mode}
                      type="button"
                      aria-pressed={selected}
                      disabled={gradeLevel !== "10" || !available}
                      onClick={() => setAssessmentMode(mode)}
                      className={`rounded-xl border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-55 ${selected ? "border-primary bg-primary/[0.055] shadow-sm" : "border-border bg-muted/30 hover:border-primary/40"}`}
                    >
                      <span className="block text-sm font-bold text-foreground">{ASSESSMENT_MODE_LABELS[mode]}</span>
                      <span className="mt-1 block text-xs leading-5 text-muted-foreground">{available ? "Approved source required" : mode === "full_paper" ? "Needs active textbook and reviewed paper evidence" : "Needs active approved textbook source"}</span>
                    </button>;
                  })}
                </div>
                {!isSelectedModeAvailable && <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-5 text-muted-foreground">This format is locked because the required supplied source evidence is not active for {SUBJECT_LABELS[subject]}.</p>}
                {assessmentMode !== "mcq" && isSelectedModeAvailable && <p className="mt-3 rounded-lg border border-primary/20 bg-primary/[0.04] p-3 text-xs leading-5 text-muted-foreground">The source-safe draft and review contract is ready for this format. Automatic question generation remains intentionally unavailable in this MCQ builder until its dedicated review workflow is connected; no unsupported questions will be created.</p>}
              </CardContent>
            </Card>

            {/* Content Input Card */}
            <Card className="border-border/80 bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">2</span>
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

            {assessmentMode !== "mcq" && assessmentMode !== "full_paper" && isSelectedModeAvailable && <Card className="border-primary/20 bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">3</span>
                  Reviewable {ASSESSMENT_MODE_LABELS[assessmentMode].toLowerCase()} draft
                </CardTitle>
                <CardDescription>Write or paste only content grounded in your selected approved chapters. Every saved item requires marks, a source reference, and a learning objective.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!savedAssessmentDraftId && (scopeType === "uploaded_content" || !hasValidStoredScope) ? <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-6 text-muted-foreground">Select at least one approved textbook chapter above before saving a {ASSESSMENT_MODE_LABELS[assessmentMode].toLowerCase()} draft. Custom pasted material is not used for this review workflow.</div> : <>
                  <div>
                    <Label htmlFor="assessment-question" className="mb-2 block text-sm font-medium">Question</Label>
                    <Textarea id="assessment-question" value={draftQuestion} onChange={(event) => setDraftQuestion(event.target.value)} placeholder="Enter a source-grounded question for review." className="min-h-28 resize-none" />
                  </div>
                  {assessmentMode === "short" && <div>
                    <Label htmlFor="expected-answer" className="mb-2 block text-sm font-medium">Expected answer</Label>
                    <Textarea id="expected-answer" value={draftExpectedAnswer} onChange={(event) => setDraftExpectedAnswer(event.target.value)} placeholder="State the concise expected answer." className="min-h-24 resize-none" />
                  </div>}
                  <div>
                    <Label htmlFor="marking-points" className="mb-2 block text-sm font-medium">{assessmentMode === "short" ? "Marking guide" : "Expected key points"}</Label>
                    <Textarea id="marking-points" value={draftMarkingPoints} onChange={(event) => setDraftMarkingPoints(event.target.value)} placeholder="One marking point per line" className="min-h-24 resize-none" />
                  </div>
                  {assessmentMode === "long" && <div>
                    <Label htmlFor="marking-rubric" className="mb-2 block text-sm font-medium">Marking rubric</Label>
                    <Textarea id="marking-rubric" value={draftRubric} onChange={(event) => setDraftRubric(event.target.value)} placeholder="One criterion per line using: criterion | marks" className="min-h-24 resize-none" />
                  </div>}
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <Label htmlFor="assessment-marks" className="mb-2 block text-sm font-medium">Marks</Label>
                      <Input id="assessment-marks" type="number" min={1} value={draftMarks} onChange={(event) => setDraftMarks(Number(event.target.value) || 0)} />
                    </div>
                    <div className="sm:col-span-2">
                      <Label htmlFor="source-reference" className="mb-2 block text-sm font-medium">Source reference</Label>
                      <Input id="source-reference" value={draftSourceReference} onChange={(event) => setDraftSourceReference(event.target.value)} placeholder="e.g., selected chapter heading and page range" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="learning-objective" className="mb-2 block text-sm font-medium">Learning objective</Label>
                    <Input id="learning-objective" value={draftLearningObjective} onChange={(event) => setDraftLearningObjective(event.target.value)} placeholder="Describe the knowledge or skill this item assesses." />
                  </div>
                  <Button type="button" onClick={handleSaveManualAssessmentDraft} disabled={saveAssessmentDraftMutation.isPending} className="w-full bg-primary text-primary-foreground font-semibold shadow-sm hover:bg-primary/90">
                    {saveAssessmentDraftMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving review draft…</> : `Save ${ASSESSMENT_MODE_LABELS[assessmentMode]} draft for review`}
                  </Button>
                  {savedAssessmentDraftId && <div className="rounded-lg border border-accent/30 bg-accent/10 p-3 text-sm text-foreground"><strong>Draft saved.</strong> Assessment draft #{savedAssessmentDraftId} is awaiting Portal Admin review.</div>}
                </>}
              </CardContent>
            </Card>}

            {assessmentMode === "full_paper" && isSelectedModeAvailable && <Card className="border-primary/20 bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">3</span>
                  Full-paper review draft
                </CardTitle>
                <CardDescription>Start a reviewable paper section only from selected approved textbook chapters and active supplied paper sources. The structure remains a draft until Portal Admin review.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!savedAssessmentDraftId && (scopeType === "uploaded_content" || !hasValidStoredScope) ? <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-6 text-muted-foreground">Select at least one approved textbook chapter above before starting a full-paper draft.</div> : <>
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

            {/* Content Analysis Card */}
            {assessmentMode === "mcq" && contentAnalysis && (
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
                {assessmentMode === "mcq" && <div>
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

                {assessmentMode !== "mcq" && <div className="rounded-xl border border-primary/20 bg-primary/[0.04] p-3 text-sm leading-6 text-muted-foreground">
                  <p className="font-semibold text-foreground">{ASSESSMENT_MODE_LABELS[assessmentMode]} review framework</p>
                  <p className="mt-1">The system will require explicit marks, source references, learning objectives, and a reviewable marking structure before this format can be saved. No automatic question content is produced here yet.</p>
                </div>}

                {/* Generate Button */}
                <Button
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

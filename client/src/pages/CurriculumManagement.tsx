import { useEffect, useMemo, useState } from "react";
import React from "react";
import { AlertTriangle, ArrowLeft, BookMarked, CheckCircle2, FileText, FolderPlus, Loader2, Plus, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { AcademyShell } from "@/components/AcademyShell";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";

type Subject = string;
type ScopeKind = "half_syllabus" | "block";
type PaperPatternKind = "model_paper" | "past_paper";
type PatternReviewStatus = "draft" | "reviewed" | "needs_revision";
type PaperPatternProfileForm = {
  sectionAInstruction: string;
  sectionBInstruction: string;
  sectionCInstruction: string;
  mcqCount: string;
  mcqMarksEach: string;
  shortOrPairCount: string;
  shortMarksEach: string;
  longOrPairCount: string;
  longMarksEach: string;
  totalMarks: string;
  durationMinutes: string;
  orRule: string;
  profileEvidenceNotes: string;
  reviewStatus: PatternReviewStatus;
};

const emptyPaperPatternProfile: PaperPatternProfileForm = {
  sectionAInstruction: "", sectionBInstruction: "", sectionCInstruction: "", mcqCount: "", mcqMarksEach: "", shortOrPairCount: "", shortMarksEach: "", longOrPairCount: "", longMarksEach: "", totalMarks: "", durationMinutes: "", orRule: "", profileEvidenceNotes: "", reviewStatus: "draft",
};

const subjectLabels: Record<string, string> = {
  physics: "Physics",
  chemistry: "Chemistry",
  computer_science: "Computer Science",
};

const formatSubjectLabel = (subject: string) => subjectLabels[subject] ?? subject.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      if (typeof dataUrl !== "string") return reject(new Error("The file could not be read."));
      const base64 = dataUrl.split(",")[1];
      if (!base64) return reject(new Error("The file could not be prepared for upload."));
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("The file could not be read."));
    reader.readAsDataURL(file);
  });
}

export default function CurriculumManagement() {
  const [, navigate] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const isPortalAdmin = user?.role === "admin";
  const requestedGrade = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("grade") : null;
  const requestedSetId = typeof window !== "undefined" ? Number(new URLSearchParams(window.location.search).get("set")) || null : null;
  const isFocusedSubjectIntake = requestedGrade !== null && new URLSearchParams(window.location.search).get("intake") === "subject";
  const utils = trpc.useUtils();
  const [selectedSetId, setSelectedSetId] = useState<number | null>(null);
  const [setProgrammeId, setSetProgrammeId] = useState<number | null>(null);
  const [programmeBoard, setProgrammeBoard] = useState("FBISE");
  const [programmeGrade, setProgrammeGrade] = useState("");
  const [programmeSubject, setProgrammeSubject] = useState("");
  const [programmeTeacherLabel, setProgrammeTeacherLabel] = useState("");
  const [setLabel, setSetLabel] = useState("");
  const [editionLabel, setEditionLabel] = useState("");
  const [replacementLabel, setReplacementLabel] = useState("");
  const [replacementEditionLabel, setReplacementEditionLabel] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingPattern, setIsUploadingPattern] = useState(false);
  const [paperPatternKind, setPaperPatternKind] = useState<PaperPatternKind>("past_paper");
  const [paperPatternYear, setPaperPatternYear] = useState("");
  const [selectedPatternSourceId, setSelectedPatternSourceId] = useState<number | null>(null);
  const [paperPatternProfile, setPaperPatternProfile] = useState<PaperPatternProfileForm>(emptyPaperPatternProfile);
  const [chapterSourceId, setChapterSourceId] = useState<number | null>(null);
  const [proposalSourceId, setProposalSourceId] = useState<number | null>(null);
  const [chapterSequence, setChapterSequence] = useState("1");
  const [chapterCode, setChapterCode] = useState("");
  const [chapterTitle, setChapterTitle] = useState("");
  const [chapterText, setChapterText] = useState("");
  const [selectedChapterId, setSelectedChapterId] = useState<number | null>(null);
  const [firstHalfText, setFirstHalfText] = useState("");
  const [secondHalfText, setSecondHalfText] = useState("");
  const [scopeKind, setScopeKind] = useState<ScopeKind>("block");
  const [scopeLabel, setScopeLabel] = useState("");
  const [scopeChapterIds, setScopeChapterIds] = useState<number[]>([]);
  const [focusedIntakeSetId, setFocusedIntakeSetId] = useState<number | null>(null);
  const [teacherApprovalEmail, setTeacherApprovalEmail] = useState("");

  const setsQuery = trpc.curriculum.listSets.useQuery(undefined, { enabled: isPortalAdmin });
  const programmesQuery = trpc.curriculum.listProgrammes.useQuery(undefined, { enabled: isPortalAdmin });
  const detailsQuery = trpc.curriculum.getManagementDetails.useQuery(
    { curriculumSetId: selectedSetId ?? 0 },
    { enabled: isPortalAdmin && selectedSetId !== null, refetchInterval: 5000 }
  );
  const chapterProposalsQuery = trpc.curriculum.proposeChaptersFromSource.useQuery(
    { curriculumSetId: selectedSetId ?? 0, sourceId: proposalSourceId ?? 0 },
    { enabled: isPortalAdmin && selectedSetId !== null && proposalSourceId !== null }
  );
  const createSet = trpc.curriculum.createSet.useMutation();
  const replaceActiveSet = trpc.curriculum.replaceActiveSet.useMutation();
  const ingestSource = trpc.curriculum.ingestSource.useMutation();
  const ingestPaperPatternSource = trpc.curriculum.ingestPaperPatternSource.useMutation();
  const activatePaperPatternSource = trpc.curriculum.activatePaperPatternSource.useMutation();
  const savePaperPatternProfile = trpc.curriculum.savePaperPatternProfile.useMutation();
  const createChapter = trpc.curriculum.createChapter.useMutation();
  const saveSegments = trpc.curriculum.saveHalfChapterSegments.useMutation();
  const createScope = trpc.curriculum.createScopeTemplate.useMutation();
  const activateSet = trpc.curriculum.activateSet.useMutation();
  const reviewSourcePage = trpc.curriculum.reviewSourcePage.useMutation();
  const createProgramme = trpc.curriculum.createProgramme.useMutation();
  const activateProgramme = trpc.curriculum.activateProgramme.useMutation();
  const staffDirectoryQuery = trpc.staff.listRoleDirectory.useQuery(undefined, { enabled: isPortalAdmin });
  const updateStaffRole = trpc.staff.updateRole.useMutation();
  const teacherProvisionRulesQuery = trpc.staff.listTeacherProvisionRules.useQuery(undefined, { enabled: isPortalAdmin });
  const approveTeacherEmail = trpc.staff.approveTeacherEmail.useMutation();
  const removeTeacherEmailApproval = trpc.staff.removeTeacherEmailApproval.useMutation();

  useEffect(() => {
    if (selectedSetId !== null || !setsQuery.data?.length) return;
    const requestedSet = requestedSetId ? setsQuery.data.find((set) => set.id === requestedSetId) : undefined;
    setSelectedSetId(requestedSet?.id ?? setsQuery.data[0].id);
  }, [selectedSetId, setsQuery.data, requestedSetId]);

  useEffect(() => {
    if (isFocusedSubjectIntake && requestedGrade) setProgrammeGrade(requestedGrade);
  }, [isFocusedSubjectIntake, requestedGrade]);

  useEffect(() => {
    if (setProgrammeId === null && programmesQuery.data?.length) setSetProgrammeId(programmesQuery.data[0].id);
  }, [setProgrammeId, programmesQuery.data]);

  const details = detailsQuery.data;
  const curriculumSets = setsQuery.data ?? [];
  const programmes = programmesQuery.data ?? [];
  const statusCounts = {
    active: curriculumSets.filter((set) => set.status === "active").length,
    draft: curriculumSets.filter((set) => set.status === "draft").length,
    archived: curriculumSets.filter((set) => set.status === "archived").length,
  };
  const selectedChapter = useMemo(
    () => details?.chapters.find((chapter) => chapter.id === selectedChapterId),
    [details?.chapters, selectedChapterId]
  );
  const selectedPatternSource = useMemo(
    () => details?.paperPatternSources.find((source) => source.id === selectedPatternSourceId),
    [details?.paperPatternSources, selectedPatternSourceId]
  );
  const selectedSetProgramme = useMemo(() => details ? programmes.find((programme) => (
    programme.board === details.curriculumSet.board
    && programme.grade === details.curriculumSet.grade
    && programme.subject === details.curriculumSet.subject
  )) : undefined, [details, programmes]);
  const hasPendingTextbookOcr = Boolean(details?.sources.some((source) => source.extractionStatus === "pending"));
  const hasFailedTextbookOcr = Boolean(details?.sources.some((source) => source.extractionStatus === "failed"));

  useEffect(() => {
    if (!details?.paperPatternSources.length) {
      setSelectedPatternSourceId(null);
      return;
    }
    if (!selectedPatternSourceId || !details.paperPatternSources.some((source) => source.id === selectedPatternSourceId)) {
      setSelectedPatternSourceId(details.paperPatternSources[0].id);
    }
  }, [details?.paperPatternSources, selectedPatternSourceId]);

  useEffect(() => {
    if (!selectedPatternSourceId) {
      setPaperPatternProfile(emptyPaperPatternProfile);
      return;
    }
    const profile = details?.paperPatternProfiles.find((item) => item.patternSourceId === selectedPatternSourceId);
    setPaperPatternProfile(profile ? {
      sectionAInstruction: profile.sectionAInstruction ?? "", sectionBInstruction: profile.sectionBInstruction ?? "", sectionCInstruction: profile.sectionCInstruction ?? "", mcqCount: profile.mcqCount?.toString() ?? "", mcqMarksEach: profile.mcqMarksEach?.toString() ?? "", shortOrPairCount: profile.shortOrPairCount?.toString() ?? "", shortMarksEach: profile.shortMarksEach?.toString() ?? "", longOrPairCount: profile.longOrPairCount?.toString() ?? "", longMarksEach: profile.longMarksEach?.toString() ?? "", totalMarks: profile.totalMarks?.toString() ?? "", durationMinutes: profile.durationMinutes?.toString() ?? "", orRule: profile.orRule ?? "", profileEvidenceNotes: profile.profileEvidenceNotes ?? "", reviewStatus: profile.reviewStatus,
    } : emptyPaperPatternProfile);
  }, [details?.paperPatternProfiles, selectedPatternSourceId]);

  const refreshManagementData = async () => {
    await Promise.all([
      utils.curriculum.listSets.invalidate(),
      utils.curriculum.listProgrammes.invalidate(),
      selectedSetId ? utils.curriculum.getManagementDetails.invalidate({ curriculumSetId: selectedSetId }) : Promise.resolve(),
    ]);
  };

  const handleCreateSet = async () => {
    if (!setProgrammeId) return toast.error("Create or select a Programme Catalogue entry first.");
    if (!setLabel.trim()) return toast.error("Enter a clear curriculum-set label first.");
    try {
      const created = await createSet.mutateAsync({ programmeId: setProgrammeId, label: setLabel.trim(), editionLabel: editionLabel.trim() || undefined });
      setSelectedSetId(created.id);
      setSetLabel("");
      setEditionLabel("");
      await utils.curriculum.listSets.invalidate();
      toast.success("Curriculum set created. Add one source file at a time, then review its chapters.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create the curriculum set.");
    }
  };

  const handleCreateProgramme = async () => {
    if (!programmeBoard.trim() || !programmeGrade.trim() || !programmeSubject.trim() || !programmeTeacherLabel.trim()) {
      return toast.error("Enter the board, grade, subject identifier, and teacher-facing label.");
    }
    try {
      const programme = await createProgramme.mutateAsync({
        board: programmeBoard.trim(),
        grade: programmeGrade.trim(),
        subject: programmeSubject.trim().toLowerCase().replace(/\s+/g, "_"),
        teacherLabel: programmeTeacherLabel.trim(),
      });
      setSetProgrammeId(programme.id);
      setProgrammeGrade("");
      setProgrammeSubject("");
      setProgrammeTeacherLabel("");
      await utils.curriculum.listProgrammes.invalidate();
      toast.success("Programme created as intake-only. Add and activate a reviewed curriculum edition before making it teacher-ready.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The programme could not be created.");
    }
  };

  const handleCreateFocusedProgramme = async () => {
    if (!requestedGrade || !programmeSubject.trim()) return toast.error("Enter the subject name first.");
    const subjectName = programmeSubject.trim();
    try {
      const programme = await createProgramme.mutateAsync({
        board: "FBISE",
        grade: requestedGrade,
        subject: subjectName.toLowerCase().replace(/\s+/g, "_"),
        teacherLabel: subjectName,
      });
      const set = await createSet.mutateAsync({
        programmeId: programme.id,
        label: `Grade ${requestedGrade} ${subjectName} textbook`,
        editionLabel: "Intake draft",
      });
      setSetProgrammeId(programme.id);
      setSelectedSetId(set.id);
      setFocusedIntakeSetId(set.id);
      setProgrammeSubject("");
      await Promise.all([utils.curriculum.listProgrammes.invalidate(), utils.curriculum.listSets.invalidate()]);
      toast.success("Subject created. Upload its textbook next.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The subject could not be created.");
    }
  };

  const handleActivateProgramme = async (programmeId: number) => {
    try {
      await activateProgramme.mutateAsync({ programmeId });
      await utils.curriculum.listProgrammes.invalidate();
      toast.success("Programme is ready for teachers. Only its approved curriculum sources can be selected in the builder.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The programme cannot be activated yet.");
    }
  };

  const handleSourceUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedSetId) return;
    if (!["application/pdf", "text/plain", "image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Upload a PDF, TXT, JPG, PNG, or WEBP textbook source.");
      return;
    }
    if (file.size > 30 * 1024 * 1024) {
      toast.error("Keep each source under 30MB.");
      return;
    }
    setIsUploading(true);
    try {
      const fileBuffer = await fileToBase64(file);
      const source = await ingestSource.mutateAsync({
        curriculumSetId: selectedSetId,
        fileName: file.name,
        mimeType: file.type as "application/pdf" | "text/plain" | "image/jpeg" | "image/png" | "image/webp",
        fileBuffer,
      });
      setChapterSourceId(source.id);
      setChapterText(source.extractedText ?? "");
      await utils.curriculum.getManagementDetails.invalidate({ curriculumSetId: selectedSetId });
      toast.success(source.extractionStatus === "pending" ? "Scanned source stored. OCR is queued and this screen will update as pages are processed." : "Source stored and extracted. Review it before saving a chapter.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The source could not be stored or extracted.");
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  const handleCreateReplacement = async () => {
    if (!details || details.curriculumSet.status !== "active") return;
    if (!replacementLabel.trim()) return toast.error("Enter a clear label for the replacement edition.");
    try {
      const replacement = await replaceActiveSet.mutateAsync({ currentSetId: details.curriculumSet.id, label: replacementLabel.trim(), editionLabel: replacementEditionLabel.trim() || undefined });
      setSelectedSetId(replacement.id);
      setReplacementLabel("");
      setReplacementEditionLabel("");
      await utils.curriculum.listSets.invalidate();
      toast.success("Replacement edition created as a draft. The active book remains unchanged until the replacement is reviewed and activated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The replacement edition could not be created.");
    }
  };

  const handlePaperPatternUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !details) return;
    if (!selectedSetProgramme) return toast.error("Create the matching Programme Catalogue entry before adding paper-pattern sources.");
    if (!["application/pdf", "text/plain"].includes(file.type)) return toast.error("Only text-based PDF and TXT paper sources are supported.");
    if (file.size > 30 * 1024 * 1024) return toast.error("Keep each paper source under 30MB.");
    setIsUploadingPattern(true);
    try {
      const fileBuffer = await fileToBase64(file);
      const created = await ingestPaperPatternSource.mutateAsync({ programmeId: selectedSetProgramme.id, sourceKind: paperPatternKind, academicYear: paperPatternYear.trim() || undefined, fileName: file.name, mimeType: file.type as "application/pdf" | "text/plain", fileBuffer });
      setSelectedPatternSourceId(created.id);
      setPaperPatternYear("");
      await utils.curriculum.getManagementDetails.invalidate({ curriculumSetId: details.curriculumSet.id });
      toast.success("Paper-pattern source stored as a draft. Review it, then activate it only when the file and year are correct.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The paper-pattern source could not be stored or extracted.");
    } finally {
      setIsUploadingPattern(false);
      event.target.value = "";
    }
  };

  const handleActivatePaperPattern = async (sourceId: number) => {
    if (!details) return;
    try {
      await activatePaperPatternSource.mutateAsync({ sourceId });
      await utils.curriculum.getManagementDetails.invalidate({ curriculumSetId: details.curriculumSet.id });
      toast.success("Paper-pattern source activated. It can guide style but never supply question content.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The paper-pattern source could not be activated.");
    }
  };

  const updatePaperPatternProfile = <K extends keyof PaperPatternProfileForm>(key: K, value: PaperPatternProfileForm[K]) => {
    setPaperPatternProfile((current) => ({ ...current, [key]: value }));
  };

  const toOptionalNumber = (value: string) => value.trim() ? Number(value) : undefined;

  const handleSavePaperPatternProfile = async () => {
    if (!selectedPatternSourceId) return toast.error("Select an extracted paper-pattern source first.");
    try {
      await savePaperPatternProfile.mutateAsync({
        patternSourceId: selectedPatternSourceId,
        sectionAInstruction: paperPatternProfile.sectionAInstruction.trim() || undefined,
        sectionBInstruction: paperPatternProfile.sectionBInstruction.trim() || undefined,
        sectionCInstruction: paperPatternProfile.sectionCInstruction.trim() || undefined,
        mcqCount: toOptionalNumber(paperPatternProfile.mcqCount),
        mcqMarksEach: toOptionalNumber(paperPatternProfile.mcqMarksEach),
        shortOrPairCount: toOptionalNumber(paperPatternProfile.shortOrPairCount),
        shortMarksEach: toOptionalNumber(paperPatternProfile.shortMarksEach),
        longOrPairCount: toOptionalNumber(paperPatternProfile.longOrPairCount),
        longMarksEach: toOptionalNumber(paperPatternProfile.longMarksEach),
        totalMarks: toOptionalNumber(paperPatternProfile.totalMarks),
        durationMinutes: toOptionalNumber(paperPatternProfile.durationMinutes),
        orRule: paperPatternProfile.orRule.trim() || undefined,
        profileEvidenceNotes: paperPatternProfile.profileEvidenceNotes.trim(),
        reviewStatus: paperPatternProfile.reviewStatus,
      });
      await utils.curriculum.getManagementDetails.invalidate({ curriculumSetId: selectedSetId! });
      toast.success(paperPatternProfile.reviewStatus === "reviewed" ? "Pattern profile reviewed. This paper can now be activated as style guidance." : "Pattern profile saved for further review.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The paper-pattern profile could not be saved.");
    }
  };

  const loadSourceForReview = (sourceId: number) => {
    const source = details?.sources.find((item) => item.id === sourceId);
    if (!source?.extractedText) return toast.error("This source has no usable extracted text.");
    setChapterSourceId(source.id);
    setChapterText(source.extractedText);
  };

  const loadProposedChapterForReview = (proposal: { sequence: number; code: string; title: string; contentText: string }) => {
    if (!proposalSourceId) return;
    setChapterSourceId(proposalSourceId);
    setChapterSequence(String(proposal.sequence));
    setChapterCode(proposal.code);
    setChapterTitle(proposal.title);
    setChapterText(proposal.contentText);
    toast.success("Chapter proposal loaded for review. Confirm or amend it, then save it explicitly.");
  };

  const handleCreateChapter = async () => {
    if (!selectedSetId || !chapterSourceId || !chapterTitle.trim() || chapterText.trim().length < 100) {
      toast.error("Select an extracted source, give the chapter a title, and review at least 100 characters of source text.");
      return;
    }
    try {
      const chapter = await createChapter.mutateAsync({
        curriculumSetId: selectedSetId,
        sourceId: chapterSourceId,
        sequence: Number(chapterSequence) || 1,
        code: chapterCode.trim() || undefined,
        title: chapterTitle.trim(),
        contentText: chapterText.trim(),
      });
      setSelectedChapterId(chapter.id);
      const midpoint = Math.ceil(chapterText.length / 2);
      setFirstHalfText(chapterText.slice(0, midpoint));
      setSecondHalfText(chapterText.slice(midpoint));
      setChapterTitle("");
      setChapterCode("");
      setChapterSequence(String((Number(chapterSequence) || 1) + 1));
      await utils.curriculum.getManagementDetails.invalidate({ curriculumSetId: selectedSetId });
      toast.success("Reviewed chapter saved. Confirm its two half-chapter segments if you need partial-chapter drafts.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The chapter could not be saved.");
    }
  };

  const handleSaveSegments = async () => {
    if (!selectedChapterId || firstHalfText.trim().length < 100 || secondHalfText.trim().length < 100) {
      toast.error("Select a chapter and confirm two substantial reviewed segments.");
      return;
    }
    try {
      await saveSegments.mutateAsync({
        chapterId: selectedChapterId,
        firstHalf: { label: "First half", contentText: firstHalfText.trim() },
        secondHalf: { label: "Second half", contentText: secondHalfText.trim() },
      });
      await utils.curriculum.getManagementDetails.invalidate({ curriculumSetId: selectedSetId! });
      toast.success("Half-chapter segments saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The chapter segments could not be saved.");
    }
  };

  const toggleScopeChapter = (chapterId: number, checked: boolean) => {
    setScopeChapterIds((ids) => checked ? [...ids, chapterId] : ids.filter((id) => id !== chapterId));
  };

  const handleCreateScope = async () => {
    if (!selectedSetId || !scopeLabel.trim() || !scopeChapterIds.length) {
      toast.error("Name the scope and select one or more reviewed chapters.");
      return;
    }
    try {
      await createScope.mutateAsync({ curriculumSetId: selectedSetId, scopeKind, label: scopeLabel.trim(), chapterIds: scopeChapterIds });
      setScopeLabel("");
      setScopeChapterIds([]);
      await utils.curriculum.getManagementDetails.invalidate({ curriculumSetId: selectedSetId });
      toast.success("Reusable curriculum scope saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The reusable scope could not be saved.");
    }
  };

  const handleActivate = async () => {
    if (!selectedSetId) return;
    try {
      await activateSet.mutateAsync({ curriculumSetId: selectedSetId });
      await refreshManagementData();
      toast.success("Curriculum activated. It is now available in the quiz builder.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The curriculum could not be activated.");
    }
  };

  const handleStaffRoleChange = async (userId: number, role: "teacher" | "admin") => {
    try {
      await updateStaffRole.mutateAsync({ userId, role });
      await staffDirectoryQuery.refetch();
      toast.success(role === "teacher" ? "Teacher access granted." : "Portal Admin access granted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The staff role could not be updated.");
    }
  };

  const handleApproveTeacherEmail = async () => {
    const email = teacherApprovalEmail.trim();
    if (!email) return;
    try {
      await approveTeacherEmail.mutateAsync({ email });
      setTeacherApprovalEmail("");
      await teacherProvisionRulesQuery.refetch();
      toast.success("Teacher email approved. It will receive Teacher access after the next sign-in.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The teacher email could not be approved.");
    }
  };

  const handleRemoveTeacherEmailApproval = async (ruleId: number) => {
    try {
      await removeTeacherEmailApproval.mutateAsync({ ruleId });
      await teacherProvisionRulesQuery.refetch();
      toast.success("Automatic teacher access removed for this email.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The teacher email approval could not be removed.");
    }
  };

  const handleReviewSourcePage = async (sourceId: number, pageNumber: number) => {
    if (!selectedSetId) return;
    try {
      await reviewSourcePage.mutateAsync({ curriculumSetId: selectedSetId, sourceId, pageNumber });
      await utils.curriculum.getManagementDetails.invalidate({ curriculumSetId: selectedSetId });
      toast.success(`Page ${pageNumber} marked as reviewed.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The OCR page review could not be saved.");
    }
  };

  const focusedStep = !focusedIntakeSetId ? 1 : !details?.sources.length ? 2 : 3;

  if (!authLoading && user?.role !== "admin") {
    return <AcademyShell eyebrow="Teacher MCQ Workspace"><main className="container py-8 sm:py-10"><Card className="mx-auto max-w-xl border-amber-300/60 bg-amber-50/40"><CardHeader><CardTitle>Portal Admin access required</CardTitle><CardDescription>Teachers can build and export assessments from approved curricula. Textbook intake, OCR review, activation, and staff access are managed only by Portal Admin.</CardDescription></CardHeader><CardContent><Button type="button" onClick={() => navigate("/")}>Return to Quiz Centre</Button></CardContent></Card></main></AcademyShell>;
  }

  if (isFocusedSubjectIntake && requestedGrade) {
    return (
      <AcademyShell eyebrow="Portal Admin" showAdministration>
        <main className="container py-7 sm:py-10">
          <section className="mx-auto max-w-2xl space-y-5">
            <Button type="button" variant="ghost" className="academy-back-button" onClick={() => navigate("/")}><ArrowLeft className="h-4 w-4" />Back to Grade {requestedGrade}</Button>
            <div className="rounded-[1.5rem] border border-primary/15 bg-card p-6 shadow-sm sm:p-8">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-primary">Grade {requestedGrade} · Subject intake</p>
              <h1 className="mt-3 text-3xl font-extrabold tracking-[-0.05em] text-foreground">Add one subject at a time.</h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Only the current task is shown. A subject remains unavailable to teachers until its textbook is extracted, reviewed, and deliberately activated.</p>
              <div className="mt-6 grid grid-cols-3 gap-2" aria-label="Subject intake progress">{["Subject", "Textbook", "Review"].map((label, index) => <div key={label} className={`rounded-xl border px-3 py-2 text-center text-xs font-bold ${focusedStep === index + 1 ? "border-primary bg-primary/10 text-primary" : focusedStep > index + 1 ? "border-primary/20 bg-primary/[0.03] text-primary" : "border-border bg-muted/30 text-muted-foreground"}`}>{index + 1}. {label}</div>)}</div>
            </div>

            {focusedStep === 1 && <Card className="border-primary/15"><CardHeader><CardTitle>What subject are you adding?</CardTitle><CardDescription>Enter one clear subject name. Grade and board are already set to Grade {requestedGrade} and FBISE.</CardDescription></CardHeader><CardContent className="space-y-4"><div><Label htmlFor="focused-subject-name">Subject name</Label><Input id="focused-subject-name" value={programmeSubject} onChange={(event) => setProgrammeSubject(event.target.value)} placeholder="e.g. Biology" autoFocus /></div><Button type="button" className="w-full" onClick={handleCreateFocusedProgramme} disabled={createProgramme.isPending || createSet.isPending}>{createProgramme.isPending || createSet.isPending ? "Creating subject…" : "Continue to textbook upload"}</Button></CardContent></Card>}

            {focusedStep === 2 && <Card className="border-primary/15"><CardHeader><CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5 text-primary" />Upload the textbook</CardTitle><CardDescription>Upload the official book as a PDF, TXT, JPG, PNG, or WEBP file. Scanned pages are queued for Urdu-and-English OCR before review.</CardDescription></CardHeader><CardContent className="space-y-4"><Input aria-label="Focused curriculum source upload" type="file" accept=".pdf,.txt,.jpg,.jpeg,.png,.webp" onChange={handleSourceUpload} disabled={isUploading} />{isUploading && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Storing the textbook and preparing extraction…</p>}<p className="text-xs leading-5 text-muted-foreground">Scanned PDFs and photographed pages are read in small Urdu-and-English OCR batches. Weak pages remain blocked for Portal Admin review before activation.</p></CardContent></Card>}

            {focusedStep === 3 && <Card className={hasPendingTextbookOcr ? "border-primary/30 bg-primary/[0.04]" : hasFailedTextbookOcr || !details?.readiness.ocrReviewComplete ? "border-amber-300/70 bg-amber-50/40" : "border-emerald-300/60 bg-emerald-50/40"}><CardHeader><CardTitle>{hasPendingTextbookOcr ? "Textbook OCR in progress" : hasFailedTextbookOcr ? "Textbook extraction needs attention" : details?.readiness.ocrReviewComplete ? "Textbook intake complete" : "Textbook quality review"}</CardTitle><CardDescription>{hasPendingTextbookOcr ? "The stored scan is being read in small batches. This page refreshes automatically; chapter review remains unavailable until extraction finishes." : hasFailedTextbookOcr ? "Extraction did not complete. Open the detailed review workspace to see the recorded failure before re-uploading or correcting the source." : details?.readiness.ocrReviewComplete ? "The source was stored and extraction checks completed. Continue to the controlled chapter-review workspace." : "Some pages need review before this book can be activated for teachers."}</CardDescription></CardHeader><CardContent className="space-y-4"><div className="rounded-xl border border-border/60 bg-background/70 p-3 text-sm text-foreground"><strong>{details?.sources.length ?? 0} textbook file</strong> stored for this subject.{hasPendingTextbookOcr && details?.ocrJobs?.length ? ` OCR progress: page ${details.ocrJobs[0].nextPage} of ${details.ocrJobs[0].totalPages}.` : details?.readiness.weakOcrPages ? ` ${details.readiness.weakOcrPages} page${details.readiness.weakOcrPages === 1 ? "" : "s"} still need review.` : ""}</div><Button type="button" className="w-full" onClick={() => navigate(`/curriculum?set=${focusedIntakeSetId}`)} disabled={hasPendingTextbookOcr}>{hasPendingTextbookOcr ? "OCR in progress" : "Continue to book review"}</Button></CardContent></Card>}
          </section>
        </main>
      </AcademyShell>
    );
  }

  return (
    <AcademyShell eyebrow="Portal Admin" showAdministration>
      <main className="container py-8 sm:py-10">
        <div className="mb-8 rounded-2xl border border-border/80 bg-card px-5 py-6 shadow-sm sm:px-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Portal Admin</p>
            <h1 className="mt-2 text-3xl font-bold text-foreground">Curriculum Library</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">Manage the approved books, editions, reviewed chapters, and reusable scopes that teachers can use for source-grounded assessment drafts.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a href="#programme-catalogue" className="inline-flex items-center rounded-xl border border-primary/20 bg-primary/[0.04] px-3 py-2 text-xs font-extrabold text-primary no-underline transition-colors hover:bg-primary/[0.09]">Add another grade</a>
            {details && <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleActivate} disabled={activateSet.isPending || details.curriculumSet.status === "active"}><CheckCircle2 className="mr-2 h-4 w-4" />{details.curriculumSet.status === "active" ? "Active Curriculum" : "Activate Curriculum"}</Button>}
          </div>
          </div>
        </div>

        {setsQuery.error && <Card className="mb-6 border-destructive/50"><CardContent className="py-4 text-sm text-destructive">Curriculum management is restricted to administrators. Sign in with the Paramount Academy administrator account, then return to this page.</CardContent></Card>}

        <section id="programme-catalogue" className="mb-6 scroll-mt-24" aria-label="Add another grade"><Card className="border-primary/20 bg-primary/[0.025]">
          <CardHeader><CardTitle className="flex items-center gap-2"><BookMarked className="h-5 w-5 text-primary" />Add another grade or subject</CardTitle><CardDescription>Create one separate programme for each board, grade, and subject. Use this Portal Admin control for a future grade; it remains intake-only until its own textbook chapters are reviewed. Grade 9 never shares Grade 10 evidence.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[130px_100px_1fr_1fr_auto]"><Input aria-label="Programme board" value={programmeBoard} onChange={(event) => setProgrammeBoard(event.target.value)} placeholder="Board" /><Input aria-label="Programme grade" value={programmeGrade} onChange={(event) => setProgrammeGrade(event.target.value)} placeholder="Grade" /><Input aria-label="Programme subject identifier" value={programmeSubject} onChange={(event) => setProgrammeSubject(event.target.value)} placeholder="Subject identifier" /><Input aria-label="Programme teacher label" value={programmeTeacherLabel} onChange={(event) => setProgrammeTeacherLabel(event.target.value)} placeholder="Teacher-facing subject label" /><Button type="button" onClick={handleCreateProgramme} disabled={createProgramme.isPending}><Plus className="mr-2 h-4 w-4" />Add programme</Button></div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{programmes.map((programme) => { const hasActiveEdition = curriculumSets.some((set) => set.board === programme.board && set.grade === programme.grade && set.subject === programme.subject && set.status === "active"); return <div key={programme.id} className="rounded-xl border border-border/70 bg-background/75 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">{programme.board} · Grade {programme.grade}</p><p className="mt-1 font-semibold text-foreground">{programme.teacherLabel}</p><p className="mt-1 text-xs text-muted-foreground">{programme.subject}</p></div><span className={`rounded-full px-2 py-1 text-[11px] font-bold ${programme.status === "ready" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{programme.status === "ready" ? "teacher-ready" : "intake only"}</span></div><p className="mt-3 text-xs text-muted-foreground">{hasActiveEdition ? "Reviewed active edition available" : "Requires an active reviewed edition"}</p>{programme.status === "intake_only" && <Button type="button" size="sm" variant="outline" className="mt-3" onClick={() => handleActivateProgramme(programme.id)} disabled={!hasActiveEdition || activateProgramme.isPending}>Activate programme</Button>}</div>; })}</div>
              {!programmes.length && !programmesQuery.isLoading && <p className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">No programmes exist yet. Create one above before creating its first curriculum edition.</p>}
            </CardContent>
        </Card></section>

        <section className="mb-6" aria-label="Staff access">
          <Card className="border-primary/15 bg-card">
            <CardHeader>
              <CardTitle>Staff access</CardTitle>
              <CardDescription>Only Portal Admin can manage books, OCR review, subject intake, activation, and staff roles. Teachers can build and export assessments from approved curricula.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="rounded-xl border border-primary/15 bg-primary/[0.03] p-4">
                <Label htmlFor="teacher-approval-email" className="font-semibold text-foreground">Automatic teacher sign-in</Label>
                <p className="mt-1 text-sm text-muted-foreground">Add a teacher’s exact sign-in email before they log in. A matching successful sign-in receives Teacher access automatically; this never grants Portal Admin access.</p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <Input id="teacher-approval-email" type="email" value={teacherApprovalEmail} onChange={(event) => setTeacherApprovalEmail(event.target.value)} placeholder="teacher@example.com" />
                  <Button type="button" onClick={handleApproveTeacherEmail} disabled={!teacherApprovalEmail.trim() || approveTeacherEmail.isPending}>Approve teacher email</Button>
                </div>
                {teacherProvisionRulesQuery.isLoading ? <p className="mt-3 text-sm text-muted-foreground">Loading approved teacher emails…</p> : teacherProvisionRulesQuery.error ? <p className="mt-3 text-sm text-destructive">Teacher email approvals could not be loaded.</p> : (teacherProvisionRulesQuery.data ?? []).length === 0 ? <p className="mt-3 text-sm text-muted-foreground">No teacher emails are approved for automatic access yet.</p> : <div className="mt-3 space-y-2">{(teacherProvisionRulesQuery.data ?? []).map((rule) => <div key={rule.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/70 px-3 py-2"><span className="min-w-0 truncate text-sm font-medium text-foreground">{rule.email}</span><Button type="button" size="sm" variant="outline" onClick={() => handleRemoveTeacherEmailApproval(rule.id)} disabled={removeTeacherEmailApproval.isPending}>Remove</Button></div>)}</div>}
              </div>
              {staffDirectoryQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading staff access…</p> : staffDirectoryQuery.error ? <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">Staff roles could not be loaded.</p> : <div className="space-y-2">{(staffDirectoryQuery.data ?? []).map((staffMember) => <div key={staffMember.id} className="flex flex-col gap-3 rounded-xl border border-border/60 p-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="truncate text-sm font-bold text-foreground">{staffMember.name || staffMember.email || "Unlabelled account"}</p><p className="mt-1 text-xs text-muted-foreground">{staffMember.email || "No email available"} · {staffMember.role === "admin" ? "Portal Admin" : staffMember.role === "teacher" ? "Teacher" : "No staff role"}</p></div><Select value={staffMember.role} onValueChange={(value) => { if (value === "teacher" || value === "admin") void handleStaffRoleChange(staffMember.id, value); }} disabled={updateStaffRole.isPending}><SelectTrigger aria-label={`Role for ${staffMember.name || staffMember.email || `account ${staffMember.id}`}`} className="w-full sm:w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="user" disabled>No staff access</SelectItem><SelectItem value="teacher">Teacher</SelectItem><SelectItem value="admin">Portal Admin</SelectItem></SelectContent></Select></div>)}</div>}
            </CardContent>
          </Card>
        </section>

        <section className="mb-6" aria-label="Curriculum Library overview">
          <div className="grid gap-3 sm:grid-cols-3">
            {[{ label: "Active editions", value: statusCounts.active, tone: "border-emerald-200 bg-emerald-50 text-emerald-800" }, { label: "Draft editions", value: statusCounts.draft, tone: "border-amber-200 bg-amber-50 text-amber-800" }, { label: "Archived editions", value: statusCounts.archived, tone: "border-slate-200 bg-slate-50 text-slate-700" }].map((item) => <Card key={item.label} className={item.tone}><CardContent className="p-4"><p className="text-xs font-bold uppercase tracking-[0.12em]">{item.label}</p><p className="mt-1 text-2xl font-bold">{item.value}</p></CardContent></Card>)}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Curriculum editions">
            {curriculumSets.map((set) => <button key={set.id} type="button" onClick={() => setSelectedSetId(set.id)} className={`rounded-xl border p-4 text-left transition-colors ${selectedSetId === set.id ? "border-primary bg-primary/[0.055] shadow-sm" : "border-border bg-card hover:border-primary/35"}`}><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">Grade {set.grade} · {formatSubjectLabel(set.subject)}</p><p className="mt-1 font-bold text-foreground">{set.label}</p></div><span className={`rounded-full px-2 py-1 text-[11px] font-bold ${set.status === "active" ? "bg-emerald-100 text-emerald-800" : set.status === "draft" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"}`}>{set.status}</span></div><p className="mt-2 text-xs text-muted-foreground">{set.editionLabel || "Edition label pending"}</p></button>)}
            {!curriculumSets.length && !setsQuery.isLoading && <Card className="border-dashed sm:col-span-2 xl:col-span-3"><CardContent className="p-5 text-sm text-muted-foreground">No curriculum edition has been created yet. Create a draft edition below, then upload its official source file.</CardContent></Card>}
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader><CardTitle className="flex items-center gap-2"><FolderPlus className="h-5 w-5 text-accent" />Curriculum Sets</CardTitle><CardDescription>One versioned set per subject and textbook edition.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              <Select value={selectedSetId?.toString() ?? "__none__"} onValueChange={(value) => setSelectedSetId(Number(value))}>
                <SelectTrigger aria-label="Selected curriculum set"><SelectValue placeholder="Select a curriculum set" /></SelectTrigger>
                <SelectContent>{setsQuery.data?.map((set) => <SelectItem key={set.id} value={set.id.toString()}>{formatSubjectLabel(set.subject)} — {set.label} ({set.status})</SelectItem>)}</SelectContent>
              </Select>
              <Label htmlFor="set-programme">New set programme</Label>
              <Select value={setProgrammeId?.toString() ?? "__none__"} onValueChange={(value) => setSetProgrammeId(Number(value))}><SelectTrigger id="set-programme"><SelectValue placeholder="Select a programme" /></SelectTrigger><SelectContent>{programmes.map((programme) => <SelectItem key={programme.id} value={programme.id.toString()}>Grade {programme.grade} · {programme.teacherLabel} ({programme.status})</SelectItem>)}</SelectContent></Select>
              <Input aria-label="Curriculum set label" value={setLabel} onChange={(event) => setSetLabel(event.target.value)} placeholder="e.g. FBISE Grade 10 Physics" />
              <Input aria-label="Edition label" value={editionLabel} onChange={(event) => setEditionLabel(event.target.value)} placeholder="e.g. 2026 edition" />
              <Button className="w-full" onClick={handleCreateSet} disabled={createSet.isPending}><Plus className="mr-2 h-4 w-4" />Create Draft Set</Button>
            </CardContent>
          </Card>

          <div className="space-y-6 lg:col-span-2">
            {!selectedSetId && <Card><CardContent className="py-12 text-center text-muted-foreground">Create or select a curriculum set to begin.</CardContent></Card>}
            {selectedSetId && detailsQuery.isLoading && <Card><CardContent className="flex items-center gap-2 py-8 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Loading curriculum details…</CardContent></Card>}
            {details && <>
              <Card className="border-primary/15 bg-primary/[0.025]"><CardContent className="grid gap-3 p-4 sm:grid-cols-4"><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">Selected edition</p><p className="mt-1 text-sm font-bold text-foreground">{details.curriculumSet.editionLabel || details.curriculumSet.label}</p></div><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">Source files</p><p className="mt-1 text-sm font-bold text-foreground">{details.sources.length}</p></div><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">Reviewed chapters</p><p className="mt-1 text-sm font-bold text-foreground">{details.chapters.length}</p></div><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">Reusable scopes</p><p className="mt-1 text-sm font-bold text-foreground">{details.scopeTemplates.length}</p></div></CardContent></Card>
              <Card className={details.readiness.sourceExtracted && details.readiness.reviewedActiveChapters > 0 ? "border-emerald-300/70 bg-emerald-50/50" : "border-amber-300/70 bg-amber-50/50"}>
                <CardHeader><CardTitle className="text-base">Edition readiness checklist</CardTitle><CardDescription>Activation remains a deliberate admin action. This list only shows what has been verified for the selected book.</CardDescription></CardHeader>
                <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
                  {[{ label: "Textbook source stored", done: details.readiness.sourceStored }, { label: "Textbook extraction completed", done: details.readiness.sourceExtracted }, { label: "OCR page-quality review complete", done: details.readiness.ocrReviewComplete }, { label: "At least one reviewed active chapter", done: details.readiness.reviewedActiveChapters > 0 }, { label: "Pattern profile reviewed (optional for book activation)", done: details.readiness.patternProfilesReviewed > 0 }].map((item) => <div key={item.label} className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/70 px-3 py-2"><CheckCircle2 className={`h-4 w-4 shrink-0 ${item.done ? "text-emerald-600" : "text-muted-foreground"}`} /><span className={item.done ? "text-foreground" : "text-muted-foreground"}>{item.label}</span></div>)}
                </CardContent>
              </Card>
              {details.curriculumSet.status === "active" && <Card className="border-amber-400/35 bg-amber-50/60"><CardHeader><CardTitle className="text-base">Replace this active book safely</CardTitle><CardDescription>Creates a linked draft edition. Teachers keep using the active book until the replacement has been reviewed and deliberately activated.</CardDescription></CardHeader><CardContent className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]"><Input aria-label="Replacement curriculum label" value={replacementLabel} onChange={(event) => setReplacementLabel(event.target.value)} placeholder="Replacement book title" /><Input aria-label="Replacement edition label" value={replacementEditionLabel} onChange={(event) => setReplacementEditionLabel(event.target.value)} placeholder="e.g. 2027 edition" /><Button type="button" variant="outline" onClick={handleCreateReplacement} disabled={replaceActiveSet.isPending}>Create replacement draft</Button></CardContent></Card>}
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5 text-accent" />1. Add One Source File</CardTitle><CardDescription>{details.curriculumSet.label} is currently <strong>{details.curriculumSet.status}</strong>. PDF, TXT, and photographed textbook pages are stored securely; scans enter Urdu-and-English OCR review before activation.</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                  <Input aria-label="Curriculum source upload" type="file" accept=".pdf,.txt,.jpg,.jpeg,.png,.webp" onChange={handleSourceUpload} disabled={isUploading} />
                  {isUploading && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Storing source and preparing extraction…</p>}
                  <div className="space-y-2">{details.sources.map((source) => { const ocrJob = details.ocrJobs?.find((job) => job.sourceId === source.id); return <button key={source.id} onClick={() => loadSourceForReview(source.id)} className="flex w-full items-center justify-between rounded-lg border border-border/60 p-3 text-left hover:border-accent/50"><span className="flex min-w-0 items-center gap-2"><FileText className="h-4 w-4 shrink-0 text-accent" /><span className="truncate text-sm">{source.originalFileName}</span></span><span className="text-right text-xs text-muted-foreground">{source.extractionStatus}{source.pageCount ? ` • ${source.pageCount} pages` : ""}{ocrJob && ocrJob.status !== "completed" ? ` • OCR page ${ocrJob.nextPage}/${ocrJob.totalPages}` : ""}</span></button>; })}</div>
                </CardContent>
              </Card>
              {details.readiness.weakOcrPages > 0 && <Card className="border-amber-300/80 bg-amber-50/60">
                <CardHeader><CardTitle className="flex items-center gap-2 text-base"><AlertTriangle className="h-5 w-5 text-amber-700" />OCR pages need review</CardTitle><CardDescription>{details.readiness.weakOcrPages} page{details.readiness.weakOcrPages === 1 ? "" : "s"} had limited readable text. Confirm each against the stored PDF before activating this edition.</CardDescription></CardHeader>
                <CardContent className="space-y-2">{details.sourcePageReviews.filter((page) => page.reviewStatus === "needs_review").map((page) => {
                  const source = details.sources.find((candidate) => candidate.id === page.sourceId);
                  return <div key={`${page.sourceId}-${page.pageNumber}`} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-background/80 p-3"><div><p className="text-sm font-semibold text-foreground">{source?.originalFileName ?? "Textbook source"} · page {page.pageNumber}</p><p className="mt-1 text-xs text-muted-foreground">Quality signal {page.qualityScore}/100{page.reviewReasons ? ` · ${page.reviewReasons}` : ""}</p></div><Button type="button" size="sm" variant="outline" onClick={() => handleReviewSourcePage(page.sourceId, page.pageNumber)} disabled={reviewSourcePage.isPending}>Mark reviewed</Button></div>;
                })}</CardContent>
              </Card>}

              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><BookMarked className="h-5 w-5 text-accent" />2. Propose Chapters from Extracted Text</CardTitle><CardDescription>For a new textbook edition, this reads only explicit <strong>CHAPTER</strong> or <strong>UNIT</strong> headings in the supplied extracted file. It never saves or activates chapters automatically.</CardDescription></CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto]"><Select value={proposalSourceId?.toString() ?? "__none__"} onValueChange={(value) => setProposalSourceId(Number(value))}><SelectTrigger aria-label="Textbook source for automatic chapter proposals"><SelectValue placeholder="Select an extracted textbook source" /></SelectTrigger><SelectContent>{details.sources.filter((source) => source.extractionStatus === "extracted" && source.extractedText?.trim()).map((source) => <SelectItem key={source.id} value={source.id.toString()}>{source.originalFileName}{source.pageCount ? ` · ${source.pageCount} pages` : ""}</SelectItem>)}</SelectContent></Select><Button type="button" variant="outline" onClick={() => chapterProposalsQuery.refetch()} disabled={!proposalSourceId || chapterProposalsQuery.isFetching}>{chapterProposalsQuery.isFetching ? "Parsing chapters…" : "Propose chapters"}</Button></div>
                  {chapterProposalsQuery.error && <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">{chapterProposalsQuery.error.message}</p>}
                  {chapterProposalsQuery.data && <div className="space-y-2"><p className="text-sm text-muted-foreground">{chapterProposalsQuery.data.proposals.length} proposed boundar{chapterProposalsQuery.data.proposals.length === 1 ? "y" : "ies"} from <span className="font-medium text-foreground">{chapterProposalsQuery.data.originalFileName}</span>. Load each one, review it, and save it individually below.</p>{chapterProposalsQuery.data.proposals.map((proposal) => <div key={`${proposal.sequence}-${proposal.code}`} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 p-3"><div><p className="text-sm font-semibold text-foreground">{proposal.code}: {proposal.title}</p><p className="mt-1 text-xs text-muted-foreground">{proposal.contentText.length.toLocaleString()} extracted characters</p></div><Button type="button" size="sm" variant="outline" onClick={() => loadProposedChapterForReview(proposal)}>Load for review</Button></div>)}</div>}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-accent" />Paper Pattern Sources</CardTitle><CardDescription>Upload supplied model or past papers to guide section balance and question style. They never become question-content sources.</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3"><Select value={paperPatternKind} onValueChange={(value) => setPaperPatternKind(value as PaperPatternKind)}><SelectTrigger aria-label="Paper pattern source kind"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="past_paper">Past paper</SelectItem><SelectItem value="model_paper">Model paper</SelectItem></SelectContent></Select><Input aria-label="Paper pattern academic year" value={paperPatternYear} onChange={(event) => setPaperPatternYear(event.target.value)} placeholder="e.g. 2026" /><Input aria-label="Paper pattern source upload" type="file" accept=".pdf,.txt" onChange={handlePaperPatternUpload} disabled={isUploadingPattern} /></div>
                  {isUploadingPattern && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Storing and extracting paper text…</p>}
                  <div className="space-y-2">{details.paperPatternSources.length ? details.paperPatternSources.map((source) => <div key={source.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 p-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-foreground">{source.originalFileName}</p><p className="mt-1 text-xs text-muted-foreground">{source.sourceKind === "model_paper" ? "Model paper" : "Past paper"}{source.academicYear ? ` · ${source.academicYear}` : ""} · extraction: {source.extractionStatus}</p></div><div className="flex items-center gap-2"><span className={`rounded-full px-2 py-1 text-xs font-bold ${source.status === "active" ? "bg-emerald-100 text-emerald-800" : source.status === "draft" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"}`}>{source.status}</span>{source.status === "draft" && source.extractionStatus === "extracted" && <Button type="button" size="sm" variant="outline" onClick={() => handleActivatePaperPattern(source.id)} disabled={activatePaperPatternSource.isPending}>Activate</Button>}</div></div>) : <p className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">No paper-pattern source is attached to this subject yet.</p>}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-accent" />Review Paper-Pattern Profile</CardTitle><CardDescription>Record only structure verified in this supplied paper. These values guide exam format; they never become question-content evidence.</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                  {!details.paperPatternSources.length && <p className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">Upload and extract a supplied model or past paper before creating its profile.</p>}
                  {details.paperPatternSources.length > 0 && <>
                    <Select value={selectedPatternSourceId?.toString() ?? "__none__"} onValueChange={(value) => setSelectedPatternSourceId(Number(value))}><SelectTrigger aria-label="Paper pattern source for profile review"><SelectValue placeholder="Select a paper-pattern source" /></SelectTrigger><SelectContent>{details.paperPatternSources.map((source) => <SelectItem key={source.id} value={source.id.toString()}>{source.originalFileName} ({source.status})</SelectItem>)}</SelectContent></Select>
                    {selectedPatternSource && <><div className="rounded-lg border border-border/70 bg-muted/20 p-3 text-sm"><p className="font-semibold text-foreground">{selectedPatternSource.originalFileName}</p><p className="mt-1 text-muted-foreground">{selectedPatternSource.sourceKind === "model_paper" ? "Model paper" : "Past paper"}{selectedPatternSource.academicYear ? ` · ${selectedPatternSource.academicYear}` : ""} · extraction: {selectedPatternSource.extractionStatus}</p></div>
                    {selectedPatternSource.extractionStatus !== "extracted" ? <p className="text-sm text-amber-700">Profile review is blocked until this supplied paper has been extracted successfully.</p> : <><div className="grid gap-3 sm:grid-cols-3"><Input aria-label="MCQ count" type="number" min="0" value={paperPatternProfile.mcqCount} onChange={(event) => updatePaperPatternProfile("mcqCount", event.target.value)} placeholder="MCQ count" /><Input aria-label="MCQ marks each" type="number" min="0" value={paperPatternProfile.mcqMarksEach} onChange={(event) => updatePaperPatternProfile("mcqMarksEach", event.target.value)} placeholder="MCQ marks each" /><Input aria-label="Total paper marks" type="number" min="1" value={paperPatternProfile.totalMarks} onChange={(event) => updatePaperPatternProfile("totalMarks", event.target.value)} placeholder="Total marks" /></div>
                    <div className="grid gap-3 sm:grid-cols-3"><Input aria-label="Short OR pair count" type="number" min="0" value={paperPatternProfile.shortOrPairCount} onChange={(event) => updatePaperPatternProfile("shortOrPairCount", event.target.value)} placeholder="Short OR pairs" /><Input aria-label="Short marks each" type="number" min="0" value={paperPatternProfile.shortMarksEach} onChange={(event) => updatePaperPatternProfile("shortMarksEach", event.target.value)} placeholder="Short marks each" /><Input aria-label="Duration minutes" type="number" min="1" value={paperPatternProfile.durationMinutes} onChange={(event) => updatePaperPatternProfile("durationMinutes", event.target.value)} placeholder="Duration (minutes)" /></div>
                    <div className="grid gap-3 sm:grid-cols-2"><Input aria-label="Long OR pair count" type="number" min="0" value={paperPatternProfile.longOrPairCount} onChange={(event) => updatePaperPatternProfile("longOrPairCount", event.target.value)} placeholder="Long OR pairs" /><Input aria-label="Long marks each" type="number" min="0" value={paperPatternProfile.longMarksEach} onChange={(event) => updatePaperPatternProfile("longMarksEach", event.target.value)} placeholder="Long marks each" /></div>
                    <Textarea aria-label="Section A instruction" value={paperPatternProfile.sectionAInstruction} onChange={(event) => updatePaperPatternProfile("sectionAInstruction", event.target.value)} placeholder="Section A instruction recorded from the supplied paper" className="min-h-20" /><Textarea aria-label="Section B instruction" value={paperPatternProfile.sectionBInstruction} onChange={(event) => updatePaperPatternProfile("sectionBInstruction", event.target.value)} placeholder="Section B instruction recorded from the supplied paper" className="min-h-20" /><Textarea aria-label="Section C instruction" value={paperPatternProfile.sectionCInstruction} onChange={(event) => updatePaperPatternProfile("sectionCInstruction", event.target.value)} placeholder="Section C instruction recorded from the supplied paper" className="min-h-20" /><Textarea aria-label="OR rule" value={paperPatternProfile.orRule} onChange={(event) => updatePaperPatternProfile("orRule", event.target.value)} placeholder="Describe the OR/choice rule exactly as verified in this paper" className="min-h-20" />
                    <div className="grid gap-3 sm:grid-cols-[200px_1fr]"><Select value={paperPatternProfile.reviewStatus} onValueChange={(value) => updatePaperPatternProfile("reviewStatus", value as PatternReviewStatus)}><SelectTrigger aria-label="Paper pattern profile review status"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="draft">Draft profile</SelectItem><SelectItem value="needs_revision">Needs revision</SelectItem><SelectItem value="reviewed">Reviewed and confirmed</SelectItem></SelectContent></Select><Textarea aria-label="Pattern profile evidence notes" value={paperPatternProfile.profileEvidenceNotes} onChange={(event) => updatePaperPatternProfile("profileEvidenceNotes", event.target.value)} placeholder="Required: cite the relevant page/section in this supplied paper and explain what you confirmed." className="min-h-20" /></div>
                    <Button type="button" onClick={handleSavePaperPatternProfile} disabled={savePaperPatternProfile.isPending}>{savePaperPatternProfile.isPending ? "Saving profile…" : paperPatternProfile.reviewStatus === "reviewed" ? "Save reviewed profile" : "Save profile draft"}</Button></>}
                    </>}
                  </>}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><BookMarked className="h-5 w-5 text-accent" />3. Review and Save a Chapter</CardTitle><CardDescription>Select an extracted source or load a proposal, then confirm or amend the chapter title and text before saving approved evidence.</CardDescription></CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-3"><Input aria-label="Chapter sequence" type="number" min="1" value={chapterSequence} onChange={(event) => setChapterSequence(event.target.value)} /><Input aria-label="Chapter code" value={chapterCode} onChange={(event) => setChapterCode(event.target.value)} placeholder="e.g. Ch. 10" /><Input aria-label="Chapter title" value={chapterTitle} onChange={(event) => setChapterTitle(event.target.value)} placeholder="Chapter title" /></div>
                  <Textarea aria-label="Reviewed chapter source text" value={chapterText} onChange={(event) => setChapterText(event.target.value)} placeholder="Select an extracted source above; review or adjust its chapter text here." className="min-h-52" />
                  <Button onClick={handleCreateChapter} disabled={createChapter.isPending}><Plus className="mr-2 h-4 w-4" />Save Reviewed Chapter</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>3. Confirm Half-Chapter Segments</CardTitle><CardDescription>Use this only when you want administrators to generate from the first or second half of one reviewed chapter.</CardDescription></CardHeader>
                <CardContent className="space-y-3">
                  <Select value={selectedChapterId?.toString() ?? undefined} onValueChange={(value) => { const chapterId = Number(value); setSelectedChapterId(chapterId); const chapter = details.chapters.find((item) => item.id === chapterId); if (chapter) { const midpoint = Math.ceil(chapter.contentText.length / 2); setFirstHalfText(chapter.contentText.slice(0, midpoint)); setSecondHalfText(chapter.contentText.slice(midpoint)); } }}><SelectTrigger aria-label="Chapter for segment review"><SelectValue placeholder="Select a reviewed chapter" /></SelectTrigger><SelectContent>{details.chapters.map((chapter) => <SelectItem key={chapter.id} value={chapter.id.toString()}>{chapter.code ? `${chapter.code}: ` : ""}{chapter.title}</SelectItem>)}</SelectContent></Select>
                  {selectedChapter && <><Textarea aria-label="First-half chapter source text" value={firstHalfText} onChange={(event) => setFirstHalfText(event.target.value)} className="min-h-32" /><Textarea aria-label="Second-half chapter source text" value={secondHalfText} onChange={(event) => setSecondHalfText(event.target.value)} className="min-h-32" /><Button onClick={handleSaveSegments} disabled={saveSegments.isPending}>Save First and Second Half</Button></>}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>4. Build a Reusable Half-Syllabus or Block Scope</CardTitle><CardDescription>These saved groups become selectable in the Quiz Builder. They always resolve to the reviewed chapter records below.</CardDescription></CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2"><Select value={scopeKind} onValueChange={(value) => setScopeKind(value as ScopeKind)}><SelectTrigger aria-label="Scope template kind"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="block">Full block</SelectItem><SelectItem value="half_syllabus">Half syllabus</SelectItem></SelectContent></Select><Input aria-label="Scope template label" value={scopeLabel} onChange={(event) => setScopeLabel(event.target.value)} placeholder="e.g. First-term Physics" /></div>
                  <div className="space-y-2 rounded-lg border border-border/60 p-3">{details.chapters.map((chapter) => <label key={chapter.id} className="flex items-center gap-2 text-sm"><Checkbox checked={scopeChapterIds.includes(chapter.id)} onCheckedChange={(checked) => toggleScopeChapter(chapter.id, checked === true)} />{chapter.code ? `${chapter.code}: ` : ""}{chapter.title}</label>)}</div>
                  <Button onClick={handleCreateScope} disabled={createScope.isPending}>Save Reusable Scope</Button>
                </CardContent>
              </Card>
            </>}
          </div>
        </div>
      </main>
    </AcademyShell>
  );
}

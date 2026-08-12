export const GENERATION_STEPS = [
  { threshold: 0, label: "Preparing your quiz request", detail: "Checking your selected content and settings." },
  { threshold: 16, label: "Analyzing study material", detail: "Identifying the main concepts and learning outcomes." },
  { threshold: 38, label: "Planning question coverage", detail: "Balancing topics and the selected difficulty profile." },
  { threshold: 62, label: "Writing exam-style MCQs", detail: "Creating questions and realistic answer choices." },
  { threshold: 82, label: "Checking quiz quality", detail: "Validating coverage, clarity, and answer structure." },
] as const;

export function getGenerationStep(progress: number) {
  const normalizedProgress = Math.max(0, Math.min(100, progress));
  return [...GENERATION_STEPS].reverse().find((step) => normalizedProgress >= step.threshold) ?? GENERATION_STEPS[0];
}

export function getNextSimulatedProgress(currentProgress: number) {
  if (currentProgress >= 92) return currentProgress;
  const increment = currentProgress < 35 ? 6 : currentProgress < 70 ? 3 : 1;
  return Math.min(92, currentProgress + increment);
}

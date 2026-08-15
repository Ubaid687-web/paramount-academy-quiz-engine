export type PaperSourceIdentityCandidate = {
  id: number;
  originalFileName: string;
  academicYear: string | null;
  extractedText: string | null;
};

const normalize = (value: string) => value
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, " ")
  .replace(/\s+/g, " ")
  .trim();

function wordWindows(value: string, windowSize = 8): Set<string> {
  const words = normalize(value).split(" ").filter(Boolean);
  const windows = new Set<string>();
  for (let index = 0; index <= words.length - windowSize; index += 1) {
    windows.add(words.slice(index, index + windowSize).join(" "));
  }
  return windows;
}

export function findSubstantiallyOverlappingPaperSource(input: {
  extractedText: string;
  academicYear: string | null | undefined;
  candidates: PaperSourceIdentityCandidate[];
}): PaperSourceIdentityCandidate | undefined {
  const incomingWindows = wordWindows(input.extractedText);
  if (incomingWindows.size < 8) return undefined;

  return input.candidates.find((candidate) => {
    if (input.academicYear && candidate.academicYear && input.academicYear !== candidate.academicYear) return false;
    if (!candidate.extractedText) return false;

    const candidateWindows = wordWindows(candidate.extractedText);
    if (!candidateWindows.size) return false;
    const overlapCount = Array.from(incomingWindows).filter((window) => candidateWindows.has(window)).length;
    const incomingCoverage = overlapCount / incomingWindows.size;

    // A transcript containing one or more full paper sections can be a subset of a complete paper.
    // This deterministic threshold stops it becoming a second paper record while leaving short common
    // instructions and unrelated papers unaffected.
    return incomingCoverage >= 0.7;
  });
}

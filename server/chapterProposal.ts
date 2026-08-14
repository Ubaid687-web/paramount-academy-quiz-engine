export type ProposedCurriculumChapter = {
  sequence: number;
  code: string;
  title: string;
  contentText: string;
};

const chapterHeading = /^(?:chapter|unit)\s+([0-9]{1,2}|[IVXLC]+)\s*(?:[:.\-–—]\s*|\s+)([^\r\n]{2,160})$/gim;

function cleanTitle(value: string) {
  return value.replace(/\s+/g, " ").replace(/\s+\d{1,3}\s*$/, "").trim();
}

/**
 * Proposes chapter boundaries only where the extracted textbook text itself contains
 * an explicit CHAPTER or UNIT heading. It never invents a heading, writes data, or
 * changes activation state; Portal Admin must inspect and save every proposal.
 */
export function proposeChaptersFromExtractedText(extractedText: string): ProposedCurriculumChapter[] {
  const text = extractedText.replace(/\u0000/g, "").replace(/\r\n/g, "\n").trim();
  if (text.length < 500) {
    throw new Error("The extracted textbook text is too short to propose reliable chapter boundaries. Review the PDF extraction or enter chapters manually.");
  }

  const matches = Array.from(text.matchAll(chapterHeading)).map((match) => ({
    index: match.index ?? 0,
    code: `Ch. ${match[1]}`,
    title: cleanTitle(match[2]),
  })).filter((match) => match.title.length >= 2);

  const uniqueMatches = matches.filter((match, index) => index === 0 || match.index > matches[index - 1].index && `${match.code}|${match.title}` !== `${matches[index - 1].code}|${matches[index - 1].title}`);
  const proposals = uniqueMatches.map((match, index) => {
    const nextBoundary = uniqueMatches[index + 1]?.index ?? text.length;
    const contentText = text.slice(match.index, nextBoundary).trim();
    return { sequence: index + 1, code: match.code, title: match.title, contentText };
  }).filter((proposal) => proposal.contentText.length >= 100);

  if (!proposals.length) {
    throw new Error("No explicit CHAPTER or UNIT headings were found in this extracted textbook. Confirm the PDF text or add chapters manually; no chapters were created.");
  }
  return proposals;
}

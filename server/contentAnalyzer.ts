/**
 * Intelligent Content Analyzer
 * Analyzes document content to determine optimal MCQ generation parameters
 */

export interface ContentAnalysis {
  totalCharacters: number;
  totalWords: number;
  estimatedReadingTime: number; // in minutes
  complexity: "simple" | "moderate" | "complex" | "advanced";
  recommendedQuestions: {
    minimum: number;
    optimal: number;
    maximum: number;
  };
  keyTopics: string[];
  sections: ContentSection[];
}

export interface ContentSection {
  title: string;
  wordCount: number;
  complexity: number;
  suggestedQuestions: number;
}

/**
 * Analyze content and recommend MCQ generation parameters
 */
export function analyzeContent(text: string): ContentAnalysis {
  // Basic metrics
  const totalCharacters = text.length;
  const totalWords = text.split(/\s+/).filter(w => w.length > 0).length;
  const estimatedReadingTime = Math.ceil(totalWords / 200); // Average reading speed: 200 wpm

  // Complexity analysis
  const complexity = determineComplexity(text, totalWords);

  // Extract potential topics/sections
  const keyTopics = extractKeyTopics(text);
  const sections = identifySections(text);

  // Calculate recommended question counts based on content depth
  const recommendedQuestions = calculateRecommendedQuestions(
    totalWords,
    complexity,
    sections.length,
    keyTopics.length
  );

  return {
    totalCharacters,
    totalWords,
    estimatedReadingTime,
    complexity,
    recommendedQuestions,
    keyTopics,
    sections,
  };
}

/**
 * Determine content complexity based on various factors
 */
function determineComplexity(
  text: string,
  wordCount: number
): "simple" | "moderate" | "complex" | "advanced" {
  // Calculate average word length
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / words.length;

  // Count technical terms (words with capital letters, numbers, special chars)
  const technicalTerms = (text.match(/[A-Z][a-z]+|[0-9]+|[_-]/g) || []).length;
  const technicalDensity = technicalTerms / wordCount;

  // Count sentences
  const sentences = (text.match(/[.!?]+/g) || []).length;
  const avgSentenceLength = wordCount / Math.max(sentences, 1);

  // Determine complexity
  if (avgWordLength < 4.5 && technicalDensity < 0.05 && avgSentenceLength < 15) {
    return "simple";
  } else if (avgWordLength < 5.5 && technicalDensity < 0.15 && avgSentenceLength < 20) {
    return "moderate";
  } else if (avgWordLength < 6.5 && technicalDensity < 0.25 && avgSentenceLength < 25) {
    return "complex";
  } else {
    return "advanced";
  }
}

/**
 * Extract key topics from content using simple heuristics
 */
function extractKeyTopics(text: string): string[] {
  const topics: Set<string> = new Set();

  // Extract capitalized phrases (likely topic names)
  const capitalizedPhrases = text.match(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g) || [];
  capitalizedPhrases.forEach(phrase => {
    if (phrase.length > 3) {
      topics.add(phrase);
    }
  });

  // Extract words after common keywords
  const keywords = ["is", "are", "involves", "includes", "consists", "defines", "means"];
  keywords.forEach(keyword => {
    const regex = new RegExp(`${keyword}\\s+([A-Za-z\\s]+?)(?:[.,;:]|$)`, "gi");
    let match;
    while ((match = regex.exec(text)) !== null) {
      const term = match[1].trim();
      if (term.length > 3 && term.length < 50) {
        topics.add(term);
      }
    }
  });

  // Return top 10 topics
  return Array.from(topics).slice(0, 10);
}

/**
 * Identify major sections in the content
 */
function identifySections(text: string): ContentSection[] {
  const sections: ContentSection[] = [];
  
  // Split by common section markers
  const sectionMarkers = text.split(/\n(?:#{1,6}\s+|[0-9]+\.\s+|[A-Z][A-Z\s]+\n)/);
  
  sectionMarkers.forEach((section, index) => {
    if (section.trim().length > 100) {
      const wordCount = section.split(/\s+/).length;
      const complexity = calculateSectionComplexity(section);
      const suggestedQuestions = Math.max(2, Math.ceil(wordCount / 150));
      
      sections.push({
        title: `Section ${index + 1}`,
        wordCount,
        complexity,
        suggestedQuestions,
      });
    }
  });

  return sections;
}

/**
 * Calculate complexity score for a section (0-1)
 */
function calculateSectionComplexity(section: string): number {
  const words = section.split(/\s+/).length;
  const sentences = (section.match(/[.!?]+/g) || []).length;
  const avgSentenceLength = words / Math.max(sentences, 1);
  
  // Normalize to 0-1 range
  return Math.min(1, avgSentenceLength / 30);
}

/**
 * Calculate recommended MCQ generation parameters
 */
function calculateRecommendedQuestions(
  totalWords: number,
  complexity: string,
  sectionCount: number,
  topicCount: number
): { minimum: number; optimal: number; maximum: number } {
  // Base calculation: 1 question per ~150 words
  const baseQuestions = Math.ceil(totalWords / 150);

  // Complexity multiplier
  const complexityMultiplier: Record<string, number> = {
    simple: 0.8,
    moderate: 1.0,
    complex: 1.3,
    advanced: 1.6,
  };
  const multiplier = complexityMultiplier[complexity] || 1.0;

  // Section and topic coverage
  const coverageBonus = Math.ceil((sectionCount + topicCount) / 2);

  // Calculate ranges
  const optimal = Math.max(10, Math.ceil(baseQuestions * multiplier + coverageBonus));
  const minimum = Math.max(5, Math.ceil(optimal * 0.6));
  const maximum = Math.ceil(optimal * 1.8);

  return {
    minimum,
    optimal,
    maximum,
  };
}

/**
 * Split content into intelligent chunks for MCQ generation
 */
export function chunkContent(
  text: string,
  targetChunks: number = 5
): string[] {
  const words = text.split(/\s+/);
  const wordsPerChunk = Math.ceil(words.length / targetChunks);
  const chunks: string[] = [];

  for (let i = 0; i < words.length; i += wordsPerChunk) {
    const chunk = words.slice(i, i + wordsPerChunk).join(" ");
    if (chunk.trim().length > 50) {
      chunks.push(chunk);
    }
  }

  return chunks.length > 0 ? chunks : [text];
}

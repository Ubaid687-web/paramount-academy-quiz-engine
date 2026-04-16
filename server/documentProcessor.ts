import * as fs from "fs";
import * as path from "path";
import mammoth from "mammoth";

let pdfParse: any;
try {
  pdfParse = require("pdf-parse");
} catch (e) {
  // Fallback for ESM
  pdfParse = null;
}

interface DocumentExtractionResult {
  text: string;
  pageCount?: number;
  metadata?: Record<string, any>;
}

export async function extractTextFromPDF(filePath: string): Promise<DocumentExtractionResult> {
  if (!pdfParse) {
    throw new Error("PDF parsing library not available");
  }
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(fileBuffer);
    
    return {
      text: pdfData.text,
      pageCount: pdfData.numpages,
      metadata: {
        producer: pdfData.info?.Producer,
        creator: pdfData.info?.Creator,
        creationDate: pdfData.info?.CreationDate,
      },
    };
  } catch (error) {
    throw new Error(`Failed to extract PDF: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

export async function extractTextFromDOCX(filePath: string): Promise<DocumentExtractionResult> {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const result = await mammoth.extractRawText({ buffer: fileBuffer });
    
    return {
      text: result.value,
      metadata: {
        warnings: result.messages.map(m => m.message),
      },
    };
  } catch (error) {
    throw new Error(`Failed to extract DOCX: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

export async function extractTextFromTXT(filePath: string): Promise<DocumentExtractionResult> {
  try {
    const text = fs.readFileSync(filePath, "utf-8");
    
    return {
      text,
      metadata: {
        encoding: "utf-8",
      },
    };
  } catch (error) {
    throw new Error(`Failed to extract TXT: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

export async function extractTextFromDocument(filePath: string, mimeType: string): Promise<DocumentExtractionResult> {
  const ext = path.extname(filePath).toLowerCase();
  
  switch (mimeType) {
    case "application/pdf":
    case ".pdf":
      return extractTextFromPDF(filePath);
    
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    case ".docx":
      return extractTextFromDOCX(filePath);
    
    case "text/plain":
    case ".txt":
      return extractTextFromTXT(filePath);
    
    default:
      throw new Error(`Unsupported file type: ${mimeType}`);
  }
}

export function cleanAndNormalizeText(text: string): string {
  // Remove extra whitespace
  let cleaned = text.replace(/\s+/g, " ").trim();
  
  // Remove special characters but keep punctuation
  cleaned = cleaned.replace(/[^\w\s.,!?;:\-()[\]{}'"]/g, "");
  
  // Fix common issues
  cleaned = cleaned.replace(/\n\n+/g, "\n");
  cleaned = cleaned.replace(/\s+\n/g, "\n");
  
  return cleaned;
}

export function chunkText(text: string, chunkSize: number = 3000, overlap: number = 500): string[] {
  const chunks: string[] = [];
  let start = 0;
  
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.substring(start, end));
    start = end - overlap;
    
    if (start < 0) start = 0;
  }
  
  return chunks;
}

export function extractKeyPhrases(text: string, limit: number = 20): string[] {
  // Simple keyword extraction based on frequency and position
  const words = text.toLowerCase().split(/\s+/);
  const phrases: Map<string, number> = new Map();
  
  // Extract 2-3 word phrases
  for (let i = 0; i < words.length - 2; i++) {
    const phrase = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
    if (!isStopword(words[i]) && !isStopword(words[i + 1])) {
      phrases.set(phrase, (phrases.get(phrase) || 0) + 1);
    }
  }
  
  // Sort by frequency and return top phrases
  return Array.from(phrases.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([phrase]) => phrase);
}

function isStopword(word: string): boolean {
  const stopwords = new Set([
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "up", "about", "into", "through", "during",
    "is", "are", "was", "were", "be", "been", "being", "have", "has", "had",
    "do", "does", "did", "will", "would", "could", "should", "may", "might",
    "can", "this", "that", "these", "those", "i", "you", "he", "she", "it",
    "we", "they", "what", "which", "who", "when", "where", "why", "how"
  ]);
  return stopwords.has(word);
}

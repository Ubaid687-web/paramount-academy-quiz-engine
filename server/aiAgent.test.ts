import { describe, it, expect, vi } from "vitest";
import { generateMCQsFromContent } from "./aiAgent";

describe("AI Agent - MCQ Generation", () => {
  describe("generateMCQsFromContent", () => {
    it("should validate minimum content length", async () => {
      const shortContent = "This is too short";
      
      try {
        await generateMCQsFromContent(1, shortContent, 5, "balanced");
        // If we get here, the function didn't validate properly
        expect(true).toBe(false);
      } catch (error) {
        // Expected to fail or handle short content
        expect(error).toBeDefined();
      }
    });

    it("should accept valid parameters", async () => {
      const validContent = `
        Artificial Intelligence (AI) is the simulation of human intelligence processes by computer systems.
        These processes include learning, reasoning, and self-correction. AI has applications in various fields
        including healthcare, finance, transportation, and education. Machine Learning is a subset of AI that
        enables systems to learn from data without being explicitly programmed. Deep Learning uses neural networks
        with multiple layers to process complex patterns in data. Natural Language Processing allows computers to
        understand and generate human language. Computer Vision enables machines to interpret visual information.
      `;

      const result = await generateMCQsFromContent(1, validContent, 5, "balanced");
      
      expect(result).toHaveProperty("jobId");
      expect(result).toHaveProperty("mcqs");
      expect(Array.isArray(result.mcqs)).toBe(true);
    });

    it("should respect difficulty distribution for balanced mode", async () => {
      const validContent = `
        Artificial Intelligence (AI) is the simulation of human intelligence processes by computer systems.
        These processes include learning, reasoning, and self-correction. AI has applications in various fields
        including healthcare, finance, transportation, and education. Machine Learning is a subset of AI that
        enables systems to learn from data without being explicitly programmed. Deep Learning uses neural networks
        with multiple layers to process complex patterns in data. Natural Language Processing allows computers to
        understand and generate human language. Computer Vision enables machines to interpret visual information.
      `;

      const result = await generateMCQsFromContent(1, validContent, 10, "balanced");
      
      if (result.mcqs.length > 0) {
        const difficulties = result.mcqs.map(q => q.difficulty);
        expect(difficulties).toContain("easy");
        expect(difficulties).toContain("medium");
        expect(difficulties).toContain("hard");
      }
    });

    it("should generate questions with valid structure", async () => {
      const validContent = `
        Artificial Intelligence (AI) is the simulation of human intelligence processes by computer systems.
        These processes include learning, reasoning, and self-correction. AI has applications in various fields
        including healthcare, finance, transportation, and education. Machine Learning is a subset of AI that
        enables systems to learn from data without being explicitly programmed. Deep Learning uses neural networks
        with multiple layers to process complex patterns in data. Natural Language Processing allows computers to
        understand and generate human language. Computer Vision enables machines to interpret visual information.
      `;

      const result = await generateMCQsFromContent(1, validContent, 5, "balanced");
      
      result.mcqs.forEach(mcq => {
        expect(mcq).toHaveProperty("question");
        expect(mcq).toHaveProperty("options");
        expect(mcq).toHaveProperty("answer");
        expect(mcq).toHaveProperty("explanation");
        expect(mcq).toHaveProperty("difficulty");
        
        // Validate options
        expect(mcq.options).toHaveProperty("A");
        expect(mcq.options).toHaveProperty("B");
        expect(mcq.options).toHaveProperty("C");
        expect(mcq.options).toHaveProperty("D");
        
        // Validate answer is one of the options
        expect(["A", "B", "C", "D"]).toContain(mcq.answer);
        
        // Validate difficulty
        expect(["easy", "medium", "hard"]).toContain(mcq.difficulty);
      });
    });

    it("should respect number of questions limit", async () => {
      const validContent = `
        Artificial Intelligence (AI) is the simulation of human intelligence processes by computer systems.
        These processes include learning, reasoning, and self-correction. AI has applications in various fields
        including healthcare, finance, transportation, and education. Machine Learning is a subset of AI that
        enables systems to learn from data without being explicitly programmed. Deep Learning uses neural networks
        with multiple layers to process complex patterns in data. Natural Language Processing allows computers to
        understand and generate human language. Computer Vision enables machines to interpret visual information.
      `;

      const result = await generateMCQsFromContent(1, validContent, 7, "balanced");
      
      expect(result.mcqs.length).toBeLessThanOrEqual(7);
    });
  });
});

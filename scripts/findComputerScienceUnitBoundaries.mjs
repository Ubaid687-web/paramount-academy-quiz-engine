import { readFile } from "node:fs/promises";

const transcriptPath = "/home/ubuntu/webdev-static-assets/paramount-curriculum-sources/fbise-grade10-computer-science-2022-23-ocr-transcript.txt";
const transcript = await readFile(transcriptPath, "utf8");
const pages = transcript.split("\f");
const targets = [
  ["Unit 1", /machine level representation|computer systems/i],
  ["Unit 2", /computational thinking|computing problems/i],
  ["Unit 3", /web development/i],
  ["Unit 4", /data science/i],
  ["Unit 5", /internet of things|\biot\b/i],
  ["Unit 6", /technology addiction/i],
  ["Unit 7", /information collection|digital literacy/i],
  ["Unit 8", /qualitative vs\. quantitative research|market validation/i],
];

for (const [unit, pattern] of targets) {
  const candidates = pages
    .map((page, index) => ({ page: index + 1, text: page }))
    .filter(({ text }) => pattern.test(text))
    .slice(0, 12)
    .map(({ page }) => page);
  console.log(`${unit}: ${candidates.join(", ")}`);
}

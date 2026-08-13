import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const paperId = process.argv[2];
const papers = {
  "chemistry-model": {
    sourcePath: "/home/ubuntu/upload/class10chemistrymodelquestionpapernewsyllabus.pdf",
    transcriptName: "fbise-grade10-chemistry-model-paper-ocr-transcript.txt",
  },
  "physics-model": {
    sourcePath: "/home/ubuntu/upload/class10physicsmodelquestionpapernewsyllabus.pdf",
    transcriptName: "fbise-grade10-physics-model-paper-ocr-transcript.txt",
  },
  "computer-science-model": {
    sourcePath: "/home/ubuntu/upload/class10computersciencemodelquestionpapernewsyllabus.pdf",
    transcriptName: "fbise-grade10-computer-science-model-paper-ocr-transcript.txt",
  },
  "chemistry-2025": {
    sourcePath: "/home/ubuntu/upload/class10chemistryfbisepastpaper2025(1).pdf",
    transcriptName: "fbise-grade10-chemistry-2025-past-paper-ocr-transcript.txt",
  },
  "chemistry-2024": {
    sourcePath: "/home/ubuntu/upload/class-10-chemistry-fbise-past-paper-2024(1).pdf",
    transcriptName: "fbise-grade10-chemistry-2024-past-paper-ocr-transcript.txt",
  },
};
const paper = papers[paperId];
if (!paper) throw new Error(`Unsupported paper ID: ${paperId}`);

const outputDirectory = "/home/ubuntu/webdev-static-assets/paramount-assessment-pattern-sources";
const outputPath = join(outputDirectory, paper.transcriptName);
const temporaryDirectory = await mkdtemp(join(tmpdir(), `paramount-${paperId}-ocr-`));
const imagePrefix = join(temporaryDirectory, "page");

try {
  await mkdir(outputDirectory, { recursive: true });
  await execFileAsync("pdftoppm", ["-r", "250", "-png", paper.sourcePath, imagePrefix], { maxBuffer: 8 * 1024 * 1024 });
  const pageImages = (await readdir(temporaryDirectory))
    .filter((fileName) => fileName.endsWith(".png"))
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
  if (!pageImages.length) throw new Error(`No pages were rendered from ${paper.sourcePath}.`);

  const pages = [];
  for (let index = 0; index < pageImages.length; index += 1) {
    const pagePath = join(temporaryDirectory, pageImages[index]);
    const { stdout } = await execFileAsync("tesseract", [pagePath, "stdout", "-l", "eng", "--psm", "6"], { maxBuffer: 8 * 1024 * 1024 });
    pages.push(`--- SOURCE PDF PAGE ${index + 1} ---\n${stdout.trim()}`);
  }

  const transcript = pages.join("\n\f\n");
  await writeFile(outputPath, transcript, "utf8");
  console.log(JSON.stringify({ paperId, outputPath, pageCount: pageImages.length, characterCount: transcript.length }, null, 2));
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}

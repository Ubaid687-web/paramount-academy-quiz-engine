import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const year = process.argv[2];
const sources = {
  "2024": "/home/ubuntu/upload/class-10-computer-science-past-paper-2024.pdf",
  "2025": "/home/ubuntu/upload/class10computersciencefbisepastpaper2025.pdf",
};
const sourcePath = sources[year];

if (!sourcePath) {
  throw new Error("Pass a supported paper year: 2024 or 2025.");
}

const outputDirectory = "/home/ubuntu/webdev-static-assets/paramount-assessment-pattern-sources";
const outputPath = join(outputDirectory, `fbise-grade10-computer-science-${year}-past-paper-ocr-transcript.txt`);
const temporaryDirectory = await mkdtemp(join(tmpdir(), `paramount-cs-${year}-paper-ocr-`));
const imagePrefix = join(temporaryDirectory, "page");

try {
  await mkdir(outputDirectory, { recursive: true });
  await execFileAsync("pdftoppm", ["-r", "250", "-png", sourcePath, imagePrefix], { maxBuffer: 8 * 1024 * 1024 });
  const pageImages = (await readdir(temporaryDirectory))
    .filter((fileName) => fileName.endsWith(".png"))
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));

  if (pageImages.length === 0) {
    throw new Error(`No pages were rendered from ${sourcePath}.`);
  }

  const pages = [];
  for (let index = 0; index < pageImages.length; index += 1) {
    const pageNumber = index + 1;
    const pagePath = join(temporaryDirectory, pageImages[index]);
    const { stdout } = await execFileAsync("tesseract", [pagePath, "stdout", "-l", "eng", "--psm", "6"], { maxBuffer: 8 * 1024 * 1024 });
    pages.push(`--- SOURCE PDF PAGE ${pageNumber} ---\n${stdout.trim()}`);
  }

  const transcript = pages.join("\n\f\n");
  await writeFile(outputPath, transcript, "utf8");
  console.log(JSON.stringify({ year, outputPath, pageCount: pageImages.length, characterCount: transcript.length }, null, 2));
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}

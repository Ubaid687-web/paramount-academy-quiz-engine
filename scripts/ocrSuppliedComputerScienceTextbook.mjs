import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const sourcePath = "/home/ubuntu/upload/class10computerbookpdffederalboard.pdf";
const outputDirectory = "/home/ubuntu/webdev-static-assets/paramount-curriculum-sources";
const outputPath = join(outputDirectory, "fbise-grade10-computer-science-2022-23-ocr-transcript.txt");
const temporaryDirectory = await mkdtemp(join(tmpdir(), "paramount-cs-ocr-"));
const imagePrefix = join(temporaryDirectory, "page");

try {
  await mkdir(outputDirectory, { recursive: true });
  await execFileAsync("pdftoppm", ["-r", "200", "-png", sourcePath, imagePrefix], { maxBuffer: 8 * 1024 * 1024 });

  const pageImages = (await readdir(temporaryDirectory))
    .filter((fileName) => fileName.endsWith(".png"))
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));

  if (pageImages.length < 250) {
    throw new Error(`Expected at least 250 rendered textbook pages; found ${pageImages.length}.`);
  }

  const pages = [];
  for (let index = 0; index < pageImages.length; index += 1) {
    const pageNumber = index + 1;
    const pagePath = join(temporaryDirectory, pageImages[index]);
    const { stdout } = await execFileAsync("tesseract", [pagePath, "stdout", "-l", "eng", "--psm", "6"], { maxBuffer: 8 * 1024 * 1024 });
    pages.push(`--- SOURCE PDF PAGE ${pageNumber} ---\n${stdout.trim()}`);
    if (pageNumber % 25 === 0 || pageNumber === pageImages.length) {
      console.log(`OCR completed for ${pageNumber}/${pageImages.length} pages`);
    }
  }

  const transcript = pages.join("\n\f\n");
  await writeFile(outputPath, transcript, "utf8");
  console.log(JSON.stringify({
    outputPath,
    pageCount: pageImages.length,
    characterCount: transcript.length,
  }, null, 2));
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}

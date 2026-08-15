import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { storagePut } from "../server/storage.ts";

const inputPath = "/home/ubuntu/ai-quiz-platform/GRADE10_COMPUTER_SCIENCE_CURRENT_READINESS_MAP.md";
const fileBuffer = await readFile(inputPath);
const contentHash = createHash("sha256").update(fileBuffer).digest("hex");
const stored = await storagePut(
  `programme-evidence/fbise/10/computer_science/${randomUUID()}.md`,
  fileBuffer,
  "text/markdown",
);

console.log(JSON.stringify({
  storageKey: stored.key,
  storageUrl: stored.url,
  contentHash,
  fileName: "GRADE10_COMPUTER_SCIENCE_CURRENT_READINESS_MAP.md",
}, null, 2));

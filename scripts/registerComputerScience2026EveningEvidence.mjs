import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { storagePut } from "../server/storage.ts";

const inputPath = "/home/ubuntu/upload/class10_computer_science_2026.md";
const fileBuffer = await readFile(inputPath);
const contentHash = createHash("sha256").update(fileBuffer).digest("hex");
const stored = await storagePut(
  `paper-patterns/fbise/10/computer_science/${randomUUID()}.md`,
  fileBuffer,
  "text/markdown",
);

console.log(JSON.stringify({
  storageKey: stored.key,
  storageUrl: stored.url,
  contentHash,
  fileName: "class10_computer_science_2026.md",
}, null, 2));

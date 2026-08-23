import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, extname, join } from "node:path";

const root = process.cwd();
const outputDir = process.env.AUDIT_PACKAGE_OUTPUT_DIR || "/home/ubuntu/technical-audit-package";
const evidenceDir = process.env.AUDIT_EVIDENCE_DIR || join(root, ".audit-evidence");
const packagePath = join(outputDir, "TECHNICAL_AUDIT_PACKAGE.md");
const manifestPath = join(outputDir, "TECHNICAL_AUDIT_PACKAGE_MANIFEST.md");
const tick = String.fromCharCode(96);
const fence = tick.repeat(3);
const code = (value) => `${tick}${value}${tick}`;
const hash = (value) => createHash("sha256").update(value).digest("hex");
const run = (command, args) => execFileSync(command, args, { cwd: root, encoding: "utf8" }).trim();

const excludedPrefixes = [".git/", "node_modules/", "dist/", "coverage/", "storage/", "uploads/", "sources/", ".manus-logs/", ".audit-evidence/", "client/public/uploads/", "client/src/assets/"];
const excludedNames = new Set([".env", ".env.local", ".env.production", ".env.development"]);
const excludedExtensions = new Set([".pdf", ".doc", ".docx", ".xlsx", ".xls", ".ppt", ".pptx", ".zip", ".gz", ".tar", ".png", ".jpg", ".jpeg", ".webp", ".mp3", ".mp4", ".webm"]);
const lockfiles = new Set(["pnpm-lock.yaml", "package-lock.json", "yarn.lock"]);
const fullExtensions = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs", ".json", ".sql", ".css", ".html", ".md", ".yaml", ".yml", ".toml", ".txt"]);

function classify(file) {
  const normalized = file.replaceAll("\\", "/");
  const name = basename(normalized);
  const extension = extname(normalized).toLowerCase();
  if (excludedPrefixes.some((prefix) => normalized.startsWith(prefix)) || excludedNames.has(name) || name.startsWith(".env.") || excludedExtensions.has(extension)) {
    return { category: "excluded", reason: "Protected data, secret file, runtime artifact, dependency artifact, or binary content" };
  }
  if (lockfiles.has(name)) return { category: "metadata", reason: "Dependency lockfile represented by package checksum and manifest metadata" };
  if (normalized.startsWith("docs/") || normalized.startsWith("notes/") || normalized === "journal.md" || normalized === "todo.md") return { category: "metadata", reason: "Private documentation or task history represented by path and checksum; full text is out of the external package scope" };
  if (fullExtensions.has(extension) || name === ".gitignore" || !extension) return { category: "full", reason: "Project-owned source or configuration" };
  return { category: "metadata", reason: "Non-binary project artifact represented by manifest metadata" };
}

function redact(raw) {
  const records = [];
  let text = raw;
  const replace = (pattern, label) => {
    text = text.replace(pattern, (match) => {
      records.push({ label, fingerprint: hash(match).slice(0, 12) });
      return `<REDACTED_${label}>`;
    });
  };
  replace(/-----BEGIN(?: [A-Z]+)? PRIVATE KEY-----[\s\S]*?-----END(?: [A-Z]+)? PRIVATE KEY-----/g, "PRIVATE_KEY");
  replace(/\b(?:mysql|postgres(?:ql)?):\/\/[^\s'"<>]+/gi, "DATABASE_DSN");
  replace(/\bAIza[0-9A-Za-z_-]{20,}\b/g, "API_KEY");
  replace(/\b(?:sk|rk|pk)_[A-Za-z0-9_-]{16,}\b/g, "API_KEY");
  replace(/\bBearer\s+[A-Za-z0-9._~+/=-]{16,}\b/gi, "BEARER_TOKEN");
  replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, "EMAIL");
  replace(/https?:\/\/[^\s'"<>]*(?:storage|s3|blob|uploads?)[^\s'"<>]*/gi, "STORAGE_URL");
  return { text, records };
}

function language(file) {
  return ({ ".ts": "ts", ".tsx": "tsx", ".js": "js", ".mjs": "js", ".json": "json", ".sql": "sql", ".css": "css", ".html": "html", ".yaml": "yaml", ".yml": "yaml", ".md": "md", ".toml": "toml" })[extname(file).toLowerCase()] || "text";
}

function sourceFiles() {
  return [...new Set(run("git", ["ls-files", "-co", "--exclude-standard"]).split("\n").map((item) => item.trim()).filter(Boolean))]
    .filter((file) => existsSync(join(root, file)) && statSync(join(root, file)).isFile())
    .sort((a, b) => a.localeCompare(b));
}

function environmentTable(entries) {
  const refs = new Map();
  const expression = /(?:process\.env|import\.meta\.env|ENV)\.([A-Z][A-Z0-9_]+)/g;
  for (const entry of entries) {
    for (const match of entry.raw.matchAll(expression)) {
      if (!refs.has(match[1])) refs.set(match[1], new Set());
      refs.get(match[1]).add(entry.file);
    }
  }
  const known = ["DATABASE_URL", "JWT_SECRET", "OAUTH_SERVER_URL", "OWNER_OPEN_ID", "OWNER_NAME", "BUILT_IN_FORGE_API_URL", "BUILT_IN_FORGE_API_KEY", "GEMINI_API_KEY", "VITE_APP_ID", "VITE_APP_LOGO", "VITE_APP_TITLE", "VITE_ANALYTICS_ENDPOINT", "VITE_ANALYTICS_WEBSITE_ID", "VITE_FRONTEND_FORGE_API_KEY", "VITE_FRONTEND_FORGE_API_URL", "VITE_OAUTH_PORTAL_URL"];
  for (const name of known) if (!refs.has(name)) refs.set(name, new Set(["Infrastructure contract / injected runtime"]));
  return [...refs.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([name, paths]) => {
    const exposure = name.startsWith("VITE_") ? "Client-visible configuration; do not use for a private credential" : "Server or infrastructure runtime configuration";
    return `| ${code(name)} | ${exposure} | ${[...paths].map(code).join(", ")} | Omitted |`;
  }).join("\n");
}

function diagnostics() {
  if (!existsSync(evidenceDir)) return "No diagnostics were available at package-generation time.";
  const names = readdirSync(evidenceDir).filter((name) => statSync(join(evidenceDir, name)).isFile()).sort();
  if (!names.length) return "No diagnostics were available at package-generation time.";
  return names.map((name) => {
    const { text, records } = redact(readFileSync(join(evidenceDir, name), "utf8"));
    return `### ${name}\n\nRedactions applied: ${records.length}.\n\n${fence}text\n${text.trim()}\n${fence}`;
  }).join("\n\n");
}

function sourceAppendix(entries) {
  return entries.map((entry) => {
    const note = entry.redactions.length ? `\n> Redaction note: ${entry.redactions.length} protected value(s) were replaced. The manifest provides only category and non-reversible fingerprint.\n` : "";
    return `## ${code(entry.file)}\n\n| Attribute | Value |\n| --- | --- |\n| Classification | Full project-owned source/configuration |\n| Sanitized SHA-256 | ${code(entry.sanitizedHash)} |\n| Original byte length | ${entry.raw.length} |\n${note}\n${fence}${language(entry.file)}\n${entry.sanitized}\n${fence}`;
  }).join("\n\n");
}

mkdirSync(outputDir, { recursive: true });
const files = sourceFiles();
const classifications = new Map(files.map((file) => [file, classify(file)]));
const entries = files.filter((file) => classifications.get(file).category === "full").map((file) => {
  const raw = readFileSync(join(root, file), "utf8");
  const { text: sanitized, records: redactions } = redact(raw);
  return { file, raw, sanitized, redactions, sanitizedHash: hash(sanitized) };
});
const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const commit = run("git", ["rev-parse", "HEAD"]);
const redactionRecords = entries.flatMap((entry) => entry.redactions.map((record) => ({ file: entry.file, ...record })));
const dependencyRows = [["Runtime dependencies", packageJson.dependencies || {}], ["Development dependencies", packageJson.devDependencies || {}]]
  .flatMap(([group, dependencies]) => Object.entries(dependencies).sort(([a], [b]) => a.localeCompare(b)).map(([name, version]) => `| ${group} | ${code(name)} | ${code(version)} |`)).join("\n");
const lockRows = files.filter((file) => lockfiles.has(basename(file))).map((file) => `| ${code(file)} | ${code(hash(readFileSync(join(root, file))))} |`).join("\n") || "| None | Not present |";
const tree = files.map((file) => {
  const current = classifications.get(file);
  return `- ${code(file)} — **${current.category}**: ${current.reason}`;
}).join("\n");
const fullCount = entries.length;
const metadataCount = files.filter((file) => classifications.get(file).category === "metadata").length;
const excludedCount = files.filter((file) => classifications.get(file).category === "excluded").length;

const document = `# Paramount Academy Quiz Engine — Technical Audit Package

> **Handling notice.** This source-inclusive package is for an authorised external security auditor. It excludes credentials, live database data, protected textbook/OCR content, uploads, and uncontrolled runtime logs. Share it only through a secure channel.

## 1. Document Control

| Field | Value |
| --- | --- |
| Project | Paramount Academy Quiz Engine |
| Generated (UTC) | ${new Date().toISOString()} |
| Git commit | ${code(commit)} |
| Included full files | ${fullCount} |
| Metadata-only files | ${metadataCount} |
| Excluded files | ${excludedCount} |
| Classification | Security-auditor technical handoff |

### Scope and redaction policy

This package includes complete contents of project-owned files classified as **full**. It excludes environment files, credentials, protected educational sources, uploads, database rows/dumps, dependency folders, build artifacts, and runtime logs. Credential-like values, database DSNs, storage links, and personal email addresses detected in in-scope source/configuration are replaced with stable redaction markers. Full dependency lockfiles are represented by checksum, which keeps the package readable while preserving reproducibility.

## 2. System Overview and Technology Inventory

The project is a TypeScript full-stack web application. The client uses React, Wouter, TanStack React Query, Tailwind CSS, Radix UI, React Hook Form, and Zod. The server uses Express, tRPC, SuperJSON, and cookie/session helpers. Persistence is MySQL/TiDB-compatible through Drizzle ORM and MySQL2. It uses managed object storage, protected chunked upload/OCR processing, controlled AI-provider routing, Manus OAuth/infrastructure APIs, and PDF generation for printable papers. Source appendix entries provide the exact implementation.

| Layer | Technology / responsibility |
| --- | --- |
| Language/runtime | TypeScript, Node.js, pnpm |
| Client | React, Wouter, TanStack React Query, Tailwind CSS, Radix UI |
| Server/API | Express, tRPC, SuperJSON, cookie handling, OAuth session integration |
| Persistence | MySQL/TiDB-compatible database through Drizzle ORM and MySQL2 |
| Source intake | Managed storage, protected resumable upload, PDF extraction, OCR review |
| AI generation | Provider-neutral orchestrator; managed provider primary and classified Gemini fallback |
| Document output | PDFKit-backed direct protected PDF download |
| Tooling | Vitest, TypeScript compiler, Vite, esbuild, Drizzle Kit |

### Declared dependencies

| Group | Dependency | Declared version |
| --- | --- | --- |
${dependencyRows}

### Runtime and package metadata

| Item | Value |
| --- | --- |
| Package manager declaration | ${code(packageJson.packageManager || "Not declared")} |
| Package name | ${code(packageJson.name)} |
| Package version | ${code(packageJson.version)} |
| Python requirements file | No tracked ${code("requirements.txt")} file; application runtime is Node/TypeScript. |

## 3. Complete Repository Classification Tree

${tree}

## 4. Environment and Configuration Contract (Sanitized)

No environment file or secret value is included. The table is a source-derived environment-example-style contract: provision each value in the target environment rather than copying a value from this document.

| Variable | Exposure / policy | Referenced by | Value |
| --- | --- | --- | --- |
${environmentTable(entries)}

### Security configuration review map

The source appendix contains the authoritative implementation. Review server bootstrap/HTTP route registration under ${code("server/_core/")}; tRPC guards in ${code("server/_core/trpc.ts")}; session/OAuth/cookie modules under ${code("server/_core/")}; environment boundaries in ${code("server/_core/env.ts")}; storage in ${code("server/storage.ts")}; and protected direct PDF export in ${code("server/pdfExportRoute.ts")}. Verify CORS at the bootstrap/gateway boundary, cookie attributes in the cookie helper, route authorization at each procedure or HTTP route, and no-store attachment semantics at the PDF route.

| Control | Observed implementation | Auditor focus |
| --- | --- | --- |
| CORS | No application-level ${code("cors")} middleware or explicit CORS policy is registered in the Express bootstrap. | Confirm the managed gateway’s origin/credential policy and ensure direct service access is not exposed outside its intended proxy. |
| Security headers | No explicit ${code("helmet")} middleware is registered in project server code. | Inspect gateway/CDN headers and consider an explicit header baseline if the service becomes directly internet-reachable. |
| Request parsing | Query parser is set to ${code("simple")}; JSON and URL-encoded bodies are limited to 50 MB; the textbook binary endpoint accepts PDF only with a 150 MB limit and applies its own authorization/validation. | Verify large-body limits and denial-of-service behavior against gateway limits. |
| Session cookies | HTTP-only, path-scoped, secure-on-HTTPS, ${code("SameSite=None")} session cookie policy. | Confirm cross-site OAuth behavior, TLS termination headers, and host/domain scope. |
| Development logging | Vite development collector stores bounded browser/network/session logs in excluded ${code(".manus-logs/")} files and does not inject its collector in production. | Confirm deployment logging/redaction/retention independently; raw logs are intentionally excluded from this package. |
| Host/filesystem controls | Vite dev server uses an explicit allowed-host list and strict filesystem access with dotfile denial. | Confirm production host routing and static-file exposure separately. |

## 5. Architecture, Data Flow, and Trust Boundaries

${fence}mermaid
flowchart LR
  Teacher[Teacher or Portal Admin] --> Client[React client]
  Client --> API[tRPC procedures and protected HTTP download]
  API --> Auth[OAuth session and role guards]
  Auth --> Scope[Active curriculum scope resolver]
  Scope --> DB[(MySQL or TiDB via Drizzle)]
  Scope --> Store[Managed source storage and OCR review]
  Scope --> Gen[Source-grounded generation orchestrator]
  Gen --> Managed[Managed generation provider]
  Gen -. classified quota exhaustion only .-> Gemini[Gemini fallback]
  Gen --> Job[Server-held generation job and result]
  Job --> PDF[Direct protected PDF route]
  PDF --> Teacher
${fence}

| Boundary | Required control to inspect |
| --- | --- |
| Session and identity | OAuth callback, signed cookie construction, protected-procedure middleware |
| Teacher and Portal Admin | Server-side ${code("teacherProcedure")} and ${code("adminProcedure")} checks |
| Textbook to generation | Active curriculum scope, source snapshot, citations, and source-derived chapter/segment content |
| Pattern material to facts | Pattern papers guide style only; reviewed textbook source remains factual authority |
| Provider to persistence/export | Server validation, job ownership, server-held result payload, direct export bound to a completed job |
| Browser upload to OCR | Owner-bound signed chunk protocol, strict ordering, final validation, durable state, and page-review gate |
| Runtime logs to audit evidence | Sanitized command-level summaries only; raw request/application logs excluded |

## 6. Diagnostics and Reproducibility Evidence

The following evidence is bounded and sanitized. It records commands, result summaries, and non-sensitive warnings; it is not a raw terminal-history or application-log export.

${diagnostics()}

### Reproduction commands

${fence}bash
pnpm install --frozen-lockfile
pnpm check
pnpm test
pnpm build
pnpm audit --prod --audit-level=moderate
pnpm drizzle-kit migrate
${fence}

## 7. Known Audit Findings and Current Release Gate

Private Phase 136/137 audit records document resolution of migration-ledger, source-authority, browser-payload, PDF export, and cross-teacher prior-question-exclusion defects. The current implementation and regression tests are included for independent review. The remaining operational acceptance gate is owner-controlled: upload the actual Grade 9 Chemistry textbook through Portal Admin and verify extraction/OCR/recovery before activating a Grade 9 source. No textbook, OCR transcript, upload, or live user data is included here.

## 8. Auditor Verification Checklist

| Review area | Suggested independent verification |
| --- | --- |
| Identity and roles | Trace OAuth callback, user refresh, protected/teacher/admin procedures; test unauthorised callers. |
| Textbook-only governance | Confirm generation requires active scoped curriculum and rejects raw browser text. |
| Generation integrity | Confirm saved quiz and PDF output are derived from owned completed server-held generation results. |
| Upload/OCR | Exercise ordered chunk upload, interrupted recovery, expiry, validation, review, and activation. |
| AI safety | Inspect source spans, citations, provider classification, retry/circuit behavior, cache scope, and fallback constraint. |
| Data layer | Reconcile schema, migrations, migration ledger, ownership joins, and active-source filters. |
| PDF/publication | Confirm direct no-store route, authorization, attachment behavior, and absent prepared-export state. |
| Supply chain | Re-run commands above and reconcile lockfile checksum/overrides. |
| Privacy | Confirm redaction record and inspect deployment secret manager separately. |

## 9. Full Project-Owned Source and Configuration Appendix

${sourceAppendix(entries)}

## 10. References

[1]: https://www.typescriptlang.org/ "TypeScript"
[2]: https://react.dev/ "React"
[3]: https://trpc.io/ "tRPC"
[4]: https://orm.drizzle.team/ "Drizzle ORM"
[5]: https://expressjs.com/ "Express"
[6]: https://vitest.dev/ "Vitest"
`;

const manifest = `# Technical Audit Package Manifest

| Field | Value |
| --- | --- |
| Package file | ${code("TECHNICAL_AUDIT_PACKAGE.md")} |
| Package SHA-256 | ${code(hash(document))} |
| Git commit | ${code(commit)} |
| Generated (UTC) | ${new Date().toISOString()} |
| Full source/config files | ${entries.length} |
| Redacted values | ${redactionRecords.length} |

## Redaction record

| File | Category | Non-reversible fingerprint |
| --- | --- | --- |
${redactionRecords.length ? redactionRecords.map((record) => `| ${code(record.file)} | ${record.label} | ${code(record.fingerprint)} |`).join("\n") : "| None | None | None |"}

## Lockfile metadata

| File | SHA-256 |
| --- | --- |
${lockRows}

## Classification summary

| Path | Classification | Reason |
| --- | --- | --- |
${files.map((file) => {
  const current = classifications.get(file);
  return `| ${code(file)} | ${current.category} | ${current.reason} |`;
}).join("\n")}
`;

writeFileSync(packagePath, document, "utf8");
writeFileSync(manifestPath, manifest, "utf8");
console.log(JSON.stringify({ packagePath, manifestPath, packageSha256: hash(document), includedFiles: entries.length, redactions: redactionRecords.length }, null, 2));

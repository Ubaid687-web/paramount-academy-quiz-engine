from pathlib import Path
import re

corpus = Path("sources/paper_geometry_corpus.txt").read_text(encoding="utf-8")
blocks = re.split(r"(?=^===== SOURCE \d+ .*$)", corpus, flags=re.MULTILINE)
out = ["# Stored Section A excerpts\n", "These are source transcripts only. No content has been edited or normalized.\n"]
for block in blocks:
    header = re.match(r"^===== SOURCE ([^\n]+) =====", block)
    if not header:
        continue
    source_label = header.group(1)
    body = block[header.end():]
    if re.search(r"section.?a|q1|multiple.?choice", body, flags=re.IGNORECASE) is None:
        continue
    start_match = re.search(r"(?im)^(?:section\s*[-—]?\s*a|q1\.)[^\n]*", body)
    if not start_match:
        start = 0
    else:
        start = start_match.start()
    stop_matches = list(re.finditer(r"(?im)^\s*section\s*[-—]?\s*b\b|^\s*SECTION\s*[-—]\s*B\b", body[start:]))
    stop = start + stop_matches[0].start() if stop_matches else min(len(body), start + 16000)
    excerpt = body[start:stop].strip()
    out.extend([f"\n## {source_label}\n", "```text\n", excerpt, "\n```\n"])
Path("sources/paper_section_a_excerpts.md").write_text("\n".join(out), encoding="utf-8")
print(f"Wrote {len(out)} output fragments to sources/paper_section_a_excerpts.md")

import { readFile } from "node:fs/promises";

const sourcePath = "/home/ubuntu/webdev-static-assets/paramount-curriculum-sources/fbise-grade10-physics-2025-ocr.txt";
const text = await readFile(sourcePath, "utf8");
const pages = text.split("\f");

const units = [
  [10, "HEAT CAPACITY AND MODES OF HEAT TRANSFER"],
  [11, "THERMAL EXPANSION AND CHANGE OF STATE"],
  [12, "WAVES"],
  [13, "SOUND"],
  [14, "OPTICS"],
  [15, "ELECTROSTATICS"],
  [16, "CURRENT ELECTRICITY"],
  [17, "ELECTRIC CIRCUITS"],
  [18, "ELECTRONICS"],
  [19, "ELECTROMAGNETISM"],
  [20, "ELECTROMAGNETIC WAVES"],
  [21, "NUCLEAR PHYSICS"],
];

const result = units.map(([number, title]) => {
  const normalizedTitle = title.replace(/\s+/g, " ");
  const candidates = pages
    .map((page, index) => ({
      pdfPage: index + 1,
      text: page.replace(/\s+/g, " ").trim(),
    }))
    .filter(({ text: page }) => page.includes(normalizedTitle) && new RegExp(`UNIT\\s*${number}|${number}\\s*[:.]?\\s*${normalizedTitle}`, "i").test(page))
    .map(({ pdfPage, text: page }) => ({ pdfPage, preview: page.slice(0, 220) }));

  return { unit: number, title, candidates };
});

console.log(JSON.stringify({ totalPdfPages: pages.length, units: result }, null, 2));

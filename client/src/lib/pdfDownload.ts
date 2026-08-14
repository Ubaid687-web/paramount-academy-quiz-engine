const PDF_MIME_TYPE = "application/pdf";
const CLEANUP_DELAY_MS = 60_000;

function decodeBase64Pdf(data: string) {
  if (!data.trim()) throw new Error("The generated PDF was empty.");
  const bytes = Uint8Array.from(window.atob(data), (character) => character.charCodeAt(0));
  if (!bytes.length) throw new Error("The generated PDF was empty.");
  return new Blob([bytes], { type: PDF_MIME_TYPE });
}

export function downloadPdfFile(data: string, fileName: string) {
  if (!fileName.trim()) throw new Error("The generated PDF did not include a file name.");
  const url = URL.createObjectURL(decodeBase64Pdf(data));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`;
  anchor.type = PDF_MIME_TYPE;
  anchor.style.display = "none";
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();

  // Android browsers can begin the save asynchronously. Revoking a Blob URL in
  // the same tick can therefore leave a success toast but no file in Downloads.
  window.setTimeout(() => {
    anchor.remove();
    URL.revokeObjectURL(url);
  }, CLEANUP_DELAY_MS);

  return anchor.download;
}

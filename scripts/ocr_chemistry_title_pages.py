from pathlib import Path

from pdf2image import convert_from_path
import pytesseract

pages = [7, 14, 26, 45, 63, 74, 82, 95, 109, 123, 130, 137, 150]
out = Path("sources/chemistry_title_pages_ocr.txt")
with out.open("w", encoding="utf-8") as handle:
    for page in pages:
        images = convert_from_path(
            "/home/ubuntu/upload/class10chemistrybookpdffederalboard.pdf",
            first_page=page,
            last_page=page,
            dpi=180,
            thread_count=1,
        )
        text = pytesseract.image_to_string(images[0], config="--psm 6")
        handle.write(f"--- PAGE {page} ---\n{text}\n")
        handle.flush()
        del images
        print(f"OCR title page {page}", flush=True)

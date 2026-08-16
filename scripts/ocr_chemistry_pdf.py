from __future__ import annotations

import argparse
from pathlib import Path

from pdf2image import convert_from_path
import pytesseract


def main() -> None:
    parser = argparse.ArgumentParser(description="OCR a page range of the supplied Chemistry PDF")
    parser.add_argument("--start", type=int, required=True)
    parser.add_argument("--end", type=int, required=True)
    parser.add_argument("--dpi", type=int, default=150)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    images = convert_from_path(
        "/home/ubuntu/upload/class10chemistrybookpdffederalboard.pdf",
        first_page=args.start,
        last_page=args.end,
        dpi=args.dpi,
        thread_count=2,
    )
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", encoding="utf-8") as output:
        for offset, image in enumerate(images):
            page_number = args.start + offset
            text = pytesseract.image_to_string(image, config="--psm 3")
            output.write(f"\n--- PAGE {page_number} ---\n{text}\n")
            output.flush()
            print(f"OCR page {page_number}/{args.end}", flush=True)


if __name__ == "__main__":
    main()


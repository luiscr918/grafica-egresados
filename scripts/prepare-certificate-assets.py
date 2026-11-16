"""Prepare clean backgrounds and embedded fonts from the supplied Canva exports.

Run once with Python + PyMuPDF. Runtime generation happens entirely in JavaScript.
Original documents are never modified; no recipient data is copied to public/.
"""
from pathlib import Path
import struct
import zipfile

import pymupdf


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "material_para_certificados"
DESTINATION = ROOT / "public" / "certificados"


def main():
    DESTINATION.mkdir(parents=True, exist_ok=True)
    fonts = {
        "font17.fntdata": "NewIconScript.otf",
        "font18.fntdata": "BeatrixAntiqua.otf",
        "font19.fntdata": "Poppins-Regular.ttf",
        "font20.fntdata": "Poppins-Bold.ttf",
    }
    with zipfile.ZipFile(SOURCE / "certificados_power_point.pptx") as archive:
        for source_name, target_name in fonts.items():
            eot = archive.read(f"ppt/fonts/{source_name}")
            length = struct.unpack_from("<I", eot, 4)[0]
            font = eot[-length:]
            if font[:4] not in (b"OTTO", b"\x00\x01\x00\x00"):
                raise ValueError(f"Invalid embedded font: {source_name}")
            (DESTINATION / target_name).write_bytes(font)

    with pymupdf.open(SOURCE / "CERTIFICADOS VACANTES.pdf") as original:
        backgrounds = pymupdf.open()
        for page_index in (0, 3, 6):
            backgrounds.insert_pdf(original, from_page=page_index, to_page=page_index)
            page = backgrounds[-1]
            # Remove ALL text (including decorative duplicate name layers), but
            # retain vector ornaments, medallion and institutional logo images.
            page.add_redact_annot(page.rect, fill=False)
            page.apply_redactions(images=0, graphics=0, text=0)
            if page.get_text().strip():
                raise ValueError("The background still contains text")
        backgrounds.set_metadata({"title": "Fondos de certificados URI ITSQMET"})
        backgrounds.save(DESTINATION / "fondos.pdf", garbage=4, deflate=True)
        backgrounds.close()
    print(f"Prepared 3 backgrounds and 4 fonts in {DESTINATION}")


if __name__ == "__main__":
    main()

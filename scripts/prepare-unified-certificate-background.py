"""Prepare the single background from nuevo_modelo.pdf (Python + PyMuPDF).

Keep vectors/images intact. Remove only text so CERTIFICADO remains editable.
The supplied original is never modified.
"""
from pathlib import Path
import pymupdf

ROOT = Path(__file__).resolve().parents[1]
with pymupdf.open(ROOT / "nuevo_modelo.pdf") as source:
    if len(source) != 1:
        raise ValueError("Expected a single-page certificate model")
    page = source[0]
    page.add_redact_annot(page.rect, fill=False)
    page.apply_redactions(images=0, graphics=0, text=0)
    if page.get_text().strip():
        raise ValueError("The background still contains text")
    source.set_metadata({"title": "Modelo único de certificados URI"})
    source.save(ROOT / "public" / "certificados" / "fondo-unico.pdf", garbage=4, deflate=True)
print("Prepared fondo-unico.pdf; original unchanged")

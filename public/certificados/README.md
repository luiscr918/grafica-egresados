# Recursos de certificados URI

- `fondos.pdf`: tres páginas sin texto variable, en orden organizadora, ponente y participante. Conservan las imágenes y adornos vectoriales del PDF proporcionado por el usuario.
- `NewIconScript.otf`, `BeatrixAntiqua.otf`, `Poppins-Regular.ttf`, `Poppins-Bold.ttf`: fuentes incrustadas en el PowerPoint exportado desde Canva y recuperadas de sus contenedores EOT.

Preparación reproducible: `python scripts/prepare-certificate-assets.py`, con PyMuPDF instalado y los originales `CERTIFICADOS VACANTES.pdf` y `certificados_power_point.pptx` en `material_para_certificados/`. Los archivos originales no se modifican. Este paso no es necesario para ejecutar ni compilar la aplicación: los recursos preparados ya están incluidos.

No colocar los Excel de Forms, CSV de Teams ni certificados personalizados en esta carpeta pública.

# Recursos de certificados URI

- `fondo-unico.pdf`: fondo vigente de una página para todos los roles, sin logos institucionales fijos. Preparado desde `nuevo_modelo.pdf` en la raíz, conservando adornos, imágenes y vectores. Se retira el texto del original para mantener el título CERTIFICADO editable y evitar duplicarlo.
- `fondos.pdf`: recurso histórico de tres páginas, ya no utilizado por el generador.
- `NewIconScript.otf`, `BeatrixAntiqua.otf`, `Poppins-Regular.ttf`, `Poppins-Bold.ttf`: fuentes incrustadas en el PowerPoint exportado desde Canva y recuperadas de sus contenedores EOT.

Preparación del fondo vigente: `python scripts/prepare-unified-certificate-background.py`, con PyMuPDF y `nuevo_modelo.pdf` en la raíz. Preparación histórica de fuentes y fondos anteriores: `python scripts/prepare-certificate-assets.py`, con los originales `CERTIFICADOS VACANTES.pdf` y `certificados_power_point.pptx` en `material_para_certificados/`. Los archivos originales no se modifican. Estos pasos no son necesarios para ejecutar ni compilar la aplicación: los recursos preparados ya están incluidos.

No colocar los Excel de Forms, CSV de Teams ni certificados personalizados en esta carpeta pública.

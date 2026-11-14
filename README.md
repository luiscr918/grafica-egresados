# Portal de herramientas internas ITSQMET

Portal único para las herramientas internas de USEGBE, URI y UFC. Todo el procesamiento ocurre en el navegador: no hay backend, variables de entorno ni APIs externas.

## Herramientas

- **General:** bitácora semanal e informe mensual consolidado de actividades.
- **USEGBE:** gráficos de seguimiento a egresados, matriz comparativa de períodos y solicitud de marketing para la bolsa de empleo.
- **Encuestas a graduados:** consolida archivos XLSX de las carreras, ignora datos personales, genera gráficos y análisis de 19 preguntas, y permite descargar un Excel consolidado, ZIP de imágenes o PDF.
- **URI:** área preparada para futuras herramientas.
- **UFC:** área preparada para futuras herramientas.

El generador de gráficos conserva la carga de Excel ancho y largo, incluyendo un solo archivo con varias carreras, normalización, detección de duplicados, gráficos por pregunta/carrera, exportación PNG, copia de imágenes y descarga de ZIP y PDF. Todo se procesa localmente en el navegador.

La herramienta **Solicitud de marketing – Bolsa de empleo** analiza el correo de ITSQMET, propone los datos del requerimiento, permite editarlos, genera una vista previa y descarga un `.docx` con hipervínculos e imágenes opcionales.

La herramienta **Bitácora e informe mensual de actividades** requiere iniciar sesión con Firebase Authentication. Permite importar una exportación JSON de Trello, corregir fechas de referencia, clasificar actividades de URI/UFC/USEGBE, refinar localmente la redacción, guardar informes en Firestore y descargar el informe personal o una base para revisión de jefatura en `.docx`.

Antes de importar Trello, completar **Fecha inicial** y **Fecha final**. La importación toma únicamente tarjetas cuya fecha de referencia esté dentro del rango (ambos extremos incluidos): vencimiento de la tarjeta o, si no tiene una fecha válida de vencimiento, última actividad. Las tarjetas sin fecha válida se omiten y se contabilizan en el resumen.

Para completar el mismo informe cada semana, abrir su borrador guardado e importar la nueva exportación del tablero. Las tarjetas se identifican por su ID de Trello: se agregan las nuevas y se actualizan los campos importados que no hayas corregido, sin duplicar las ya registradas. Se conservan las evidencias y la selección «Incluir». Los registros antiguos sin historial de importación conservan sus campos editables. Las actividades existentes no se eliminan por faltar en una exportación posterior o quedar fuera del rango de la nueva importación. Guardar en Firebase después de revisar los cambios.

El botón **Vista previa** muestra el contenido consolidado de la versión personal o de jefatura antes de descargarlo. Las actividades se agrupan por unidad y categoría, sin fechas individuales.

Comprobaciones de importación: `node --test src/tools/general/informe-actividades/lib/trello.test.js`.

La herramienta **Matriz comparativa de períodos** carga un Excel anterior y uno actual, calcula el top 3 de respuestas por pregunta, aplica el catálogo de indicadores institucionales, expresa las variaciones en puntos porcentuales y descarga una matriz consolidada junto con hojas separadas por carrera y modalidad.

## Instalación y comandos

Requiere Node.js 18 o superior y npm 9 o superior.

Configura las variables de Firebase de `.env.example` en `.env` antes de ejecutar la herramienta de informes. `.env` está excluido del repositorio.

```bash
npm install
npm run dev
npm run build
npm run preview
```

## Agregar una herramienta

1. Crea una carpeta en `src/tools/<area>/<herramienta>/`.
2. Exporta el componente principal desde esa carpeta.
3. Registra la herramienta en `src/config/tools.js` con `id`, `nombre`, `descripcion`, `icono` y `componente: lazy(() => import(...))`.
4. La ruta se genera automáticamente como `/<area>/<herramienta>`.

## Prueba rápida del parser

Los dos correos de referencia están exportados desde `src/tools/usegbe/solicitud-marketing/lib/parseSolicitud.js` junto con `runParserExamples()`. Se pueden comprobar con:

```bash
node --input-type=module -e "import { runParserExamples } from './src/tools/usegbe/solicitud-marketing/lib/parseSolicitud.js'; const result = runParserExamples(); console.log(result); if (!result.passed) process.exit(1)"
```

## Despliegue en Netlify

La configuración está en `netlify.toml`:

| Configuración | Valor |
| --- | --- |
| Build command | `npm run build` |
| Publish directory | `dist` |

El archivo incluye el redirect SPA necesario para `BrowserRouter`. Netlify instalará las dependencias y compilará el sitio al conectarlo directamente con GitHub.

```bash
git add .
git commit -m "feat: convertir USEGBE en portal de herramientas"
git push
```

## Contexto persistente en OpenCode (Windows)

El MCP Codebase Memory está configurado en `opencode.json`, solo para este proyecto. Para instalar el binario local en una nueva copia del repositorio:

```powershell
pwsh -NoProfile -File .opencode/setup-codebase-memory.ps1
```

Cierra y vuelve a abrir OpenCode desde este proyecto para cargar el MCP. El binario se guarda en `.opencode/bin/` y el índice en `.codebase-memory/cache/`, excluidos de Git. El lanzador limita la indexación a este repositorio. No modifica la configuración global.

La bitácora compartida está en `docs/PROJECT_MEMORY.md`; `AGENTS.md` indica consultarla y actualizarla entre tareas. El índice conserva contexto del código y `manage_adr` permite guardar decisiones; no archiva automáticamente cada conversación.

Para consultar la instalación por terminal:

```powershell
pwsh -NoProfile -File .opencode/codebase-memory.ps1 cli list_projects
```

## Tecnologías utilizadas

React 19, Vite 6, React Router, Tailwind CSS, Lucide React, SweetAlert2, Chart.js, XLSX, JSZip, jsPDF, FileSaver y docx.

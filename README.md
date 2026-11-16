# Portal de herramientas internas ITSQMET

Portal único para las herramientas internas de General, USEGBE, URI y UFC. Los archivos y documentos se procesan en el navegador. La bitácora y los certificados utilizan Firebase Authentication y Firestore para el acceso y guardado de expedientes.

## Herramientas

- **General:** bitácora semanal e informe mensual consolidado de actividades.
- **USEGBE:** gráficos de seguimiento a egresados, matriz comparativa de períodos y solicitud de marketing para la bolsa de empleo.
- **Encuestas a graduados:** consolida archivos XLSX de las carreras, ignora datos personales, genera gráficos y análisis de 19 preguntas, y permite descargar un Excel consolidado, ZIP de imágenes o PDF.
- **URI:** certificados de clases magistrales con cruce de Forms y Teams, evaluación de asistencia, revisión de nombres y roles, PDF individuales o por lote e informes Excel.
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

Requiere Node.js 22.13 o superior (recomendado Node.js 24 LTS) y npm 9 o superior, por la versión de PDF.js usada en la vista previa editable.

Configura las variables de Firebase de `.env.example` en `.env` antes de ejecutar informes o certificados. `.env` está excluido del repositorio. Para los permisos de certificados, consultar [docs/FIREBASE_CERTIFICADOS.md](docs/FIREBASE_CERTIFICADOS.md).

```bash
npm install
npm run dev
npm run build
npm run preview
```

## Certificados de clases magistrales (URI)

Ruta: `/uri/generador-certificados`. Utiliza la misma cuenta autorizada que los informes.

1. **Evento:** completar tema, institución, enfoque, fecha, horas y firmantes. Los modelos El Chaco, Grupo KFC y Universidad Israel ayudan a completar textos. Horas iniciales editables: organizadora 40, ponentes 3 y participantes 3.
2. **Archivos:** seleccionar y aplicar el Excel original de Forms y el CSV/Excel de Teams. Permite escoger hoja y columnas de Forms y el orden de fechas de Teams. Reconoce los CSV UTF-16 tabulados de Teams con sus tres secciones. Aplicar un archivo reconstruye la revisión; hacerlo antes de corregir los nombres.
3. **Evento:** revisar y confirmar el tramo sugerido. La reunión completa puede permanecer abierta después de la clase. El cálculo usa segundos de conexión dentro del tramo, une solapamientos y descuenta desconexiones. Requisito inicial 80 %, tolerancia inicial 1 minuto, editable de 0 a 2 minutos.
4. **Revisión:** confirmar nombres en orden nombres/apellidos, resolver vínculos de Forms y clasificar ponentes. Los correos coincidentes se vinculan automáticamente; las coincidencias por nombre son sugerencias. Moderador de Teams no equivale a ponente. Permite fusionar registros de una persona y agregar ponentes sin Forms/Teams. Participantes requieren Forms y asistencia; organizadora/ponentes confirmados están exentos.
5. **Certificados:** editar párrafos por rol (`**negrita**` y campos `{tema}`, `{institucion}`, `{horas}`, `{enfoque}`, `{modalidad}`, `{fecha}`), revisar el PDF y descargar PDF único o ZIP de PDF individuales. Usa un único fondo, preparado desde `nuevo_modelo.pdf`, para organizadores, ponentes y participantes, sin logo institucional fijo; conserva las fuentes Canva. Ajusta nombres a una/dos líneas y textos a una página; rechaza contenido que no quepa o caracteres no soportados, sin truncarlos.
6. **Informe Excel:** hojas Resumen, Para certificados, Detalle de evaluación y Pendientes. Se puede exportar antes de completar la revisión para identificar casos pendientes.
7. **Guardar evento y acreedores:** guarda datos, logos PNG optimizados y lista final en Firebase, sin PDF ni archivos originales de Forms/Teams. Al abrirlo, se regeneran los certificados. Para reevaluar otro tramo o recuperar personas no aptas, volver a importar los originales. Los registros no aptos o pendientes no se guardan.

En **Certificados → Editor visual de distribución**, escoger una persona de muestra y arrastrar el título, nombre, redacción o cada bloque de firma (nombre y cargo juntos). Al seleccionar un bloque, las flechas lo mueven 1 punto (Mayús: 10 puntos). Ocho tiradores permiten cambiar el espacio desde cualquier lado o esquina; **Tamaño del texto (%)** reduce o amplía las letras. Se pueden introducir posiciones y medidas. Durante el arrastre aparecen guías con ajuste al centro de página y a los bordes/centros de otros bloques; Alt desactiva el ajuste.

El alcance predeterminado es **Solo este certificado**: crea una excepción individual sin modificar los demás. **Todos los certificados de este modelo** edita la plantilla del rol mostrado; cada elemento modificado reemplaza también las excepciones individuales de ese elemento, conservando las de los demás bloques. Desde un certificado personalizado, **Aplicar esta distribución a todos…** copia su distribución completa al modelo. Restaurar un certificado recupera la plantilla; restaurar el modelo recupera los valores iniciales y elimina sus excepciones. Los otros roles son independientes. La vista se actualiza con el PDF real mediante PDF.js, cargado bajo demanda. Los ajustes se aplican al PDF y ZIP y se guardan con el expediente en `event.designs` (plantillas) y `event.certificateDesigns` (excepciones por ID de persona y rol), compatibles con expedientes anteriores. El fondo decorativo es fijo. Si un bloque no cabe, se muestra el error para corregirlo antes de descargar, sin recortar contenido.

Para **editar el texto desde el lienzo**, hacer doble clic en una firma, pulsar F2 con la firma enfocada o usar **Editar texto de esta firma**. Se abre un panel sobre la vista previa para cambiar nombre/cargo con el alcance elegido. **Enter en Cargo crea un salto de línea real** que se conserva en la vista, PDF, ZIP y expediente; el ajuste automático puede dividir adicionalmente líneas demasiado anchas. Por ejemplo: `Representante GAD` + Enter + `El Chaco (Alcaldía de Napo)`. Los cambios se muestran en vivo; **Listo, ver certificado** o Escape cierra el panel conservándolos. Mover/redimensionar y aplicar la distribución a todos también conserva el texto. Restaurar el elemento recupera tanto su distribución como el texto heredado. **Editar firmantes y cargos** sigue definiendo los datos comunes del evento y ahora también respeta Enter; los textos personalizados en el lienzo tienen prioridad sobre esos datos.

### Logos PNG compartidos

En **Certificados → Editor visual de distribución → Logos compartidos de la generación**, usar **Subir logos PNG** para cargar uno o varios archivos. Seleccionar su miniatura o su bloque para moverlo con el ratón/flechas y cambiar el espacio con ocho tiradores o las medidas. Se conservan transparencia y proporciones, centrando cada imagen dentro del bloque; **Quitar** la elimina de toda la generación. Los logos siempre son comunes a todas las personas y roles, independientemente del alcance elegido para textos/firmas. Restaurar o promover distribuciones de texto no altera los logos.

Se guardan una sola vez en `event.logos` (PNG optimizado y coordenadas). Se reduce la resolución de imágenes grandes para el expediente: máximo 1 200 píxeles de lado inicial y 180 000 caracteres por PNG, hasta 550 000 caracteres entre todos los logos; si no caben, se muestra un error conservando el trabajo. El límite total del expediente sigue siendo 850 000 bytes. Los expedientes anteriores sin logos también usan el nuevo fondo al regenerarse.

Comprobación del dominio, archivos reales disponibles y generación con fuentes incluidas y fondo único:

```bash
npm run test:certificados
```

Las pruebas de los tres eventos originales se omiten si `material_para_certificados/` no está presente; el resto utiliza datos sintéticos y los recursos incluidos. Para producir un PDF de comprobación visual con los tres roles y un nombre largo:

```bash
node scripts/verify-certificate-pdf.mjs <directorio-existente-de-salida>
```

La prueba opcional `scripts/verify-certificate-ui.mjs <directorio-temporal-con-playwright>` utiliza Edge, carga los originales KFC y comprueba cruce manual, PDF, ZIP, Excel, vista móvil y conservación del trabajo ante un guardado denegado. También verifica arrastre y redimensionado del editor, reducción de letra, independencia de modelos, restauración y las posiciones/tamaños de texto en PDF y ZIP descargados, además de la regresión de revisión El Chaco. Monta el componente con un UID sintético no autorizado; no accede a Firebase real. No requiere instalar Playwright como dependencia de producción.

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

React 19, Vite 6, React Router, Tailwind CSS, Lucide React, SweetAlert2, Chart.js, XLSX/xlsx-js-style, JSZip, jsPDF, pdf-lib/fontkit, Firebase, FileSaver y docx.

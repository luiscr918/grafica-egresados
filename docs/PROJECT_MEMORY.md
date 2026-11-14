# Memoria del proyecto

## Proyecto

Portal de herramientas internas ITSQMET para General, USEGBE, URI y UFC. Aplicación React 19 con Vite 6. Las herramientas se registran en `src/config/tools.js`; el código está en `src/tools/`. Consultar `README.md` para las funcionalidades y comandos. La herramienta de informes utiliza Firebase Authentication y Firestore.

## Preferencias de trabajo

- Responder en español.
- Mantener el contexto de cambios y decisiones entre sesiones mediante esta bitácora y Codebase Memory.
- Codebase Memory se configura e instala solo a nivel de proyecto.

## Cambios realizados

### 2026-11-13 — Edición de funciones de Solicitud de marketing

- Síntoma: el campo «Principales funciones» perdía el foco al escribir o borrar una letra.
- Causa: cada fila usaba `key={`${index}-${item}`}`, dependiente del texto editable, provocando que React recreara el textarea en cada pulsación.
- Corrección: usar `key={index}` para mantener la identidad de la posición durante la edición.
- Archivo: `src/tools/usegbe/solicitud-marketing/SolicitudMarketing.jsx`.
- Verificación ejecutada: `npm run build` correcto. No se realizó prueba interactiva en navegador.
- El usuario confirmó «perfecto» antes de solicitar la instalación de memoria.

### 2026-11-13 — Vista previa del informe de actividades

- Agregado botón «Vista previa» junto a guardar y descargar. Muestra el documento consolidado y se actualiza al editar el borrador, sin tener que guardarlo o descargarlo primero.
- Permite seleccionar «Mi informe» o «Base para jefatura» y descargar la versión mostrada. Incluye contador de actividades y ayuda cuando no hay actividades exportables.
- Se mantiene el contenido agrupado por unidad y categoría, sin fechas individuales. Las fechas inicial/final siguen siendo editables y describen el período; esta tarea no incorpora filtrado automático por fecha.
- Decisión: compartir `getReportContent` entre vista previa y exportación Word para conservar los mismos textos, agrupación, orden y selección de actividades. La vista HTML aproxima la presentación; la paginación puede variar en Word.
- Archivos: `src/tools/general/informe-actividades/InformeActividades.jsx`, `ReportPreview.jsx`, `lib/reportContent.js`, `lib/generateReportDocx.js` y `src/styles.css`.
- Verificaciones ejecutadas: `npm run build` correcto (aviso de chunks grandes); `git diff --check` sin errores de whitespace; comprobación con Node/assert de período editable, agrupación, exclusión de actividades desmarcadas/sin texto/sin unidad, ausencia de fechas individuales, variantes, borrador vacío y actualización del contenido.
- Pendiente: comprobación interactiva en navegador con sesión autorizada y revisión visual del Word descargado; no realizadas en esta sesión.

### 2026-11-13 — Importación Trello por período y sin duplicados

- Nueva necesidad confirmada: importar solo tarjetas dentro del rango editable inicial/final y poder reimportar exportaciones semanales sin redundancia.
- `lib/trello.js`: valida rango completo/ordenado, JSON de tablero e IDs estables; filtra por fecha de referencia inclusiva (vencimiento válido y, en su defecto, última actividad). Omite tarjetas sin fecha válida y conserva la exclusión de plantillas.
- Fusiona por `sourceId`/ID estable de Trello. Agrega únicamente tarjetas nuevas y colapsa duplicados anteriores, conservando la primera copia. No deduplica por título ni mezcla actividades manuales.
- Guarda `trelloSnapshot` para actualizar campos importados solo si no fueron corregidos por el usuario. Respeta evidencias e inclusión; registros antiguos sin snapshot conservan sus campos editables. No elimina actividades existentes ausentes en la nueva exportación o fuera del nuevo rango: el filtrado se aplica a las tarjetas entrantes.
- `InformeActividades.jsx`: resumen visible con nuevas/existentes/fuera del período/sin fecha; explicación de la fecha empleada y protección si cambia el borrador durante la lectura del archivo.
- Archivos: `src/tools/general/informe-actividades/lib/trello.js`, `lib/trello.test.js`, `InformeActividades.jsx`, `src/styles.css`, `README.md` y esta memoria.
- Verificación ejecutada: `node --test src/tools/general/informe-actividades/lib/trello.test.js` (10 pruebas aprobadas); `npm run build` correcto con aviso de chunks grandes; `git diff --check` sin errores de whitespace.
- Pendiente: prueba interactiva con sesión autorizada y una exportación real del tablero del usuario; pruebas automatizadas realizadas con fixtures sintéticos.

## Memoria técnica

- Configuración MCP: `opencode.json`.
- Lanzador local: `.opencode/codebase-memory.ps1`.
- Instalación reproducible Windows: `.opencode/setup-codebase-memory.ps1` (v0.12.1, descarga oficial con verificación SHA256).
- Binario: `.opencode/bin/codebase-memory-mcp/`; datos: `.codebase-memory/cache/`. Ambos quedan fuera de Git.
- El índice representa código y documentación; esta bitácora conserva el resumen de trabajo y pendientes. No es una copia automática de todas las conversaciones.

### 2026-11-13 — Codebase Memory local

- Instalado Codebase Memory v0.12.1 desde el ZIP oficial de Windows, verificando su SHA256 contra `checksums.txt` de la versión.
- Archivos: `opencode.json`, `.opencode/codebase-memory.ps1`, `.opencode/setup-codebase-memory.ps1`, `AGENTS.md`, `.gitignore`, `README.md` y esta bitácora.
- OpenCode instalado: 1.19.0. `opencode mcp list` verificó `codebase-memory connected` y `context7 connected`.
- CLI mediante el lanzador local: `list_projects` comprobó ausencia inicial de índices; `index_repository` creó el índice del repositorio; `index_status` devolvió `ready`, inicialmente con 440 nodos y 1052 relaciones, cero archivos parcialmente parseados, inutilizables u omitidos por el parser. Los totales pueden cambiar al actualizar documentación.
- Exclusiones comprobadas: `.git`, `node_modules`, `dist`, `.opencode/bin`, `.codebase-memory`; `.env` se excluyó por `.gitignore`.
- Identificador del índice: `C-Users-User-Documents-ItsqmetWork-usegbe-generador-estadistica`.
- `manage_adr get` confirmó que no existían decisiones previas; `manage_adr update` guardó el contexto inicial, la instalación local y la corrección del campo de funciones.
- El CLI informa `watch.reason: cli_session`: las llamadas puntuales no mantienen vigilancia. El MCP puede mantener la actualización mientras la sesión del proyecto esté conectada; comprobar siempre frescura al comenzar.
- Los tools MCP nuevos no están disponibles directamente en la sesión que ya estaba abierta; las verificaciones se realizaron mediante CLI y una conexión real con `opencode mcp list`.

## Pendientes

- Cerrar y volver a abrir OpenCode en este proyecto para que la sesión de conversación cargue las nuevas herramientas MCP.
- La instalación actual está preparada para Windows (amd64/arm64). Si se clona el repositorio, ejecutar el script de instalación local y volver a indexar; los binarios e índices no se guardan en Git.

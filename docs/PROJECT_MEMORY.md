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

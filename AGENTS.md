# Contexto persistente del proyecto

- Al comenzar una sesión, leer `docs/PROJECT_MEMORY.md` antes de modificar código.
- Usar el MCP `codebase-memory` para consultar el índice de este repositorio. Revisar `list_projects` e `index_status`; si falta el índice, ejecutar `index_repository` sobre la raíz de este proyecto. Verificar frescura y cobertura antes de sacar conclusiones; contrastar los resultados relevantes con el código actual.
- Consultar `manage_adr` en modo `get` para recuperar las decisiones guardadas. Registrar decisiones importantes con `set_sections` o `update`, conservando el contenido anterior que siga vigente.
- Al terminar una tarea relevante, actualizar `docs/PROJECT_MEMORY.md` con el cambio, los archivos implicados, la comprobación realmente ejecutada y los pendientes conocidos. No declarar pruebas ni tareas como completadas sin haberlas realizado.
- Si el MCP no está disponible, continuar usando la bitácora y el código fuente; indicar el bloqueo sin inventar resultados del MCP.
- Mantener la instalación y los índices de Codebase Memory dentro de este proyecto. Invocar su CLI mediante `.opencode/codebase-memory.ps1` para conservar las rutas y el alcance local. No ejecutar el instalador global.

## Comandos del proyecto

- Desarrollo: `npm run dev`.
- Compilación de verificación: `npm run build`.
- Registro de herramientas: `src/config/tools.js`.
- Herramientas: `src/tools/<area>/<herramienta>/`.

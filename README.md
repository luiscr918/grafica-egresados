# Portal de herramientas internas ITSQMET

Portal único para las herramientas internas de USEGBE, URI y UFC. Todo el procesamiento ocurre en el navegador: no hay backend, variables de entorno ni APIs externas.

## Herramientas

- **USEGBE:** gráficos de seguimiento a egresados y solicitud de marketing para la bolsa de empleo.
- **URI:** área preparada para futuras herramientas.
- **UFC:** área preparada para futuras herramientas.

El generador de gráficos conserva la carga de Excel ancho y largo, incluyendo un solo archivo con varias carreras, normalización, detección de duplicados, gráficos por pregunta/carrera, exportación PNG, copia de imágenes y descarga de ZIP y PDF. Todo se procesa localmente en el navegador.

La herramienta **Solicitud de marketing – Bolsa de empleo** analiza el correo de ITSQMET, propone los datos del requerimiento, permite editarlos, genera una vista previa y descarga un `.docx` con hipervínculos e imágenes opcionales.

## Instalación y comandos

Requiere Node.js 18 o superior y npm 9 o superior.

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

## Tecnologías

React 19, Vite 6, React Router, Tailwind CSS, Lucide React, SweetAlert2, Chart.js, XLSX, JSZip, jsPDF, FileSaver y docx.

# USEGBE | Generador de gráficos de seguimiento a egresados

Aplicación web para cargar respuestas de seguimiento a egresados en formato Excel y generar gráficos institucionales por pregunta, carrera y consolidado.

## Características

- Procesamiento local en el navegador: los archivos no se envían a un servidor.
- Lectura de archivos `.xlsx` en formato ancho y formato largo.
- Normalización de las 12 preguntas de la encuesta.
- Detección y descarte de registros duplicados por número de identificación.
- Asignación de una carrera a cada archivo cargado.
- Vista individual por carrera y consolidado institucional.
- Gráficos de pastel y barras con conteos y porcentajes.
- Exportación individual a PNG, copia de imágenes y descarga completa en ZIP.
- Resolución de exportación de 1x, 2x y 3x.
- Interfaz adaptable para escritorio y dispositivos móviles.

## Requisitos

- Node.js 18 o superior.
- npm 9 o superior.

## Instalación local

```bash
npm install
npm run dev
```

Después, abre la dirección local que muestre Vite, normalmente `http://localhost:5173`.

## Uso

1. Carga uno o varios archivos `.xlsx`.
2. Asigna en **Carrera de este archivo** la carrera correspondiente a cada Excel.
3. Selecciona una carrera en **Vista por carrera** o usa **Consolidado institucional (todas)**.
4. Revisa los gráficos generados para las 12 preguntas.
5. Usa **Descargar PNG**, **Copiar imagen** o **Descargar todo (ZIP)**.
6. Selecciona la resolución de exportación. `2x` es la opción recomendada para informes.

No cargues a la vez dos versiones del mismo conjunto de respuestas, porque se contabilizarían dos veces. Por ejemplo, un archivo ancho y su equivalente largo deben probarse por separado.

## Formatos Excel admitidos

### Formato ancho

Cada fila representa a un egresado y cada pregunta aparece como una columna.

### Formato largo

Cada fila representa una respuesta, con columnas equivalentes a identificador, pregunta y respuesta.

El identificador es necesario para contar egresados y detectar duplicados. Si el archivo contiene una columna de carrera reconocible, se utiliza como valor inicial; de lo contrario, la carrera puede editarse desde la interfaz.

## Comandos

```bash
npm run dev       # Servidor de desarrollo
npm run build     # Compilación de producción
npm run preview   # Vista previa de la compilación
```

## Despliegue en Netlify

En Netlify, crea un nuevo sitio desde el repositorio y configura:

| Configuración | Valor |
| --- | --- |
| Build command | `npm run build` |
| Publish directory | `dist` |
| Base directory | Vacío, salvo que el proyecto esté dentro de una subcarpeta |

No se requieren variables de entorno ni servicios externos. Netlify ejecutará `npm install` automáticamente antes del build.

También puedes desplegar manualmente ejecutando:

```bash
npm run build
```

y seleccionando la carpeta `dist` desde la opción de despliegue manual de Netlify.

## Tecnologías

- React 19
- Vite 6
- Chart.js y `react-chartjs-2`
- `xlsx`
- `jszip` y `file-saver`
- Lucide React
- SweetAlert2
- Tailwind CSS

## Privacidad

El procesamiento de los archivos ocurre dentro del navegador del usuario. La aplicación no incluye backend, base de datos ni almacenamiento persistente de respuestas.

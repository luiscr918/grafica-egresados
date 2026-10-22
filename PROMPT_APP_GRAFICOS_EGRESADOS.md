# Instrucciones para el agente — App de gráficos de Seguimiento a Egresados (ITSQMET)

## 1. Objetivo

Construye una app web simple que permita **subir archivos Excel (.xlsx) de la encuesta de seguimiento a egresados** y genere automáticamente **los gráficos que se usan en el Informe Final de Seguimiento a Egresados (ITSQMET, USEGBE)**, listos para descargar como imagen y pegar en Word.

La app se despliega en **Netlify** como sitio estático. Es una herramienta de un solo uso interno: simple, rápida, sin cuentas ni base de datos. Lo que importa es que **los gráficos salgan correctos y se vean bien**.

## 2. Restricciones técnicas (obligatorias)

- **100 % cliente (navegador). Sin backend, sin Python, sin servidor, sin funciones serverless, sin base de datos.** Todo el procesamiento del Excel ocurre en el navegador.
- Salida de build estática lista para Netlify: `npm run build` → carpeta `dist`.
- **Stack:**
  - Vite + React (JavaScript o TypeScript, el que prefieras) + Tailwind CSS.
  - Lectura de Excel: **SheetJS (`xlsx`)**.
  - Gráficos: **Chart.js + `react-chartjs-2` + `chartjs-plugin-datalabels`** (se usa canvas porque permite exportar PNG de alta resolución con `canvas.toDataURL`, sin conversiones de SVG).
  - Exportar ZIP: **JSZip** + **file-saver**.
- Incluir `netlify.toml`:
  ```toml
  [build]
    command = "npm run build"
    publish = "dist"
  ```
- Idioma de toda la interfaz: **español (Ecuador)**.
- **Privacidad:** los archivos contienen nombres y cédulas de personas. Nunca se envían a ningún servidor, no se guardan en localStorage, no se muestran nombres ni cédulas en pantalla ni en los gráficos. Mostrar un aviso discreto: "Los archivos se procesan solo en tu navegador".

## 3. Formatos de entrada

El usuario puede subir **uno o varios .xlsx** (arrastrar y soltar o botón). La app debe **detectar automáticamente** cuál de estos dos formatos es cada archivo:

### Formato A — "ancho" (una fila por egresado)
Hoja `Hoja1`, encabezados exactos:

`numeroIdentificacion, nombreEstudiante, etnia, rango_edad, situacion_actual, formacion_carrera, satisfaccion_docente, tipo_contrato, conocimientos_utiles, plazas_empleo, trabajo_ascenso, satisfaccion_administrativo, interes_maestria, recomendaria`

Ejemplo de fila: `1004706493 | ESPAÑA TARAPUES YAMILEX PAOLA | Mestizo/blanco | 23 a 28 años | Estudia y trabaja | Neutral | Neutral | Medio tiempo | No Aplica | Si | No | Neutral | No | No`

### Formato B — "largo" (una fila por respuesta)
Hoja `Hoja1`, encabezados: `numeroIdentificacion, descripcionPregunta, respuesta`.
Cada egresado tiene 12 filas (una por pregunta). El campo `numeroIdentificacion` puede venir como número.

### Normalización
Convertir **ambos formatos a un mismo modelo interno** (formato ancho). Mapeo de `descripcionPregunta` → columna:

| descripcionPregunta (texto exacto de la encuesta) | Columna interna |
|---|---|
| ¿Cómo considera la formación adquirida en la carrera? | `formacion_carrera` |
| ¿Considera que el área de estudio dispone de un adecuado número de plazas de empleo? | `plazas_empleo` |
| ¿Cuál es su nivel de satisfacción con el personal administrativo del instituto? | `satisfaccion_administrativo` |
| ¿De acuerdo a su cultura y costumbres, su auto identificación étnica es? | `etnia` |
| ¿Ha conseguido trabajo o un ascenso gracias a los estudios obtenidos en el instituto? | `trabajo_ascenso` |
| ¿Le interesaría estudiar una maestría tecnológica en el ITSQMET? | `interes_maestria` |
| ¿Qué tan satisfecho está con la planta docente de su carrera? | `satisfaccion_docente` |
| ¿Recomendaría estudiar a un amigo o familiar en el ITSQMET? | `recomendaria` |
| En la actualidad usted: | `situacion_actual` |
| Indique, ¿en qué rango de edad se encuentra? | `rango_edad` |
| Si trabaja, ¿Qué tipo de contrato tiene? | `tipo_contrato` |
| Si trabaja, ¿los conocimientos obtenidos en el instituto le sirven para enriquecer el desempeño laboral? | `conocimientos_utiles` |

Reglas de normalización:
- Comparar encabezados y preguntas **sin distinguir mayúsculas, tildes ni espacios sobrantes** (hacer coincidencia tolerante; si una pregunta no coincide exacto, usar coincidencia por palabras clave y avisar).
- `numeroIdentificacion` siempre como **string** (conservar ceros a la izquierda). Si hay duplicados, conservar un solo registro por persona y avisar cuántos duplicados se descartaron.
- Valores: `trim`, unificar variantes: `Si`/`Sí`/`SI` → **Sí**; `No Aplica`/`No aplica`/`N/A` → **No aplica**; `Muy bueno`/`Muy buena` → **Muy bueno**; mayúscula inicial consistente.
- Ignorar filas vacías.

### Carrera (dato crítico)
**Los Excel actuales NO traen columna de carrera**, pero el informe se presenta **por carrera** (ej. "Carrera de Tecnología Superior en Enfermería"). Por eso:
- Si el archivo trae una columna `carrera` (o similar), usarla para agrupar y generar los gráficos por cada carrera más un consolidado "Todas".
- Si no la trae, **pedir al usuario un nombre de carrera por archivo** (campo de texto con autocompletado desde la lista de carreras de la sección 8; por defecto, el nombre del archivo). Cada archivo subido = una carrera.
- Permitir ver el gráfico de una carrera o el **consolidado institucional**.

## 4. Gráficos requeridos

Replicar el estilo del informe: **por cada pregunta, un gráfico circular (pie) a la izquierda y un gráfico de barras horizontales a la derecha**, uno junto al otro (como en el informe, estilo Power BI). Generar los dos para **las 12 variables**:

Orden de presentación (igual al informe):
1. `formacion_carrera` — ¿Cómo considera la formación adquirida en la carrera?
2. `plazas_empleo` — ¿Considera que el área de estudio dispone un adecuado número de plazas de empleo?
3. `satisfaccion_administrativo` — Satisfacción con el personal administrativo
4. `etnia` — Autoidentificación étnica
5. `trabajo_ascenso` — ¿Ha conseguido trabajo o ascenso gracias a los estudios?
6. `interes_maestria` — ¿Le interesaría estudiar una maestría tecnológica en el ITSQMET?
7. `satisfaccion_docente` — Satisfacción con la planta docente
8. `recomendaria` — ¿Recomendaría estudiar en el ITSQMET?
9. `situacion_actual` — En la actualidad usted: (solo estudia / estudia y trabaja)
10. `rango_edad` — Rango de edad
11. `tipo_contrato` — Tipo de contrato
12. `conocimientos_utiles` — ¿Los conocimientos le sirven para el desempeño laboral?

### Especificación visual de cada par de gráficos
- **Título del bloque:** número + texto de la pregunta (en negrita, como en el informe).
- **Pie:**
  - Etiqueta en cada porción con **conteo y porcentaje**, ej. `18 (41,86%)`.
  - Leyenda con título "Respuesta" a la izquierda del pie.
  - Una porción por categoría con respuestas (omitir categorías con 0).
- **Barras horizontales:**
  - Eje Y = categorías, eje X = **"Recuento de numeroIdentificacion"** (enteros, sin decimales), orden **descendente por conteo**.
  - Barras azules (`#118DFF`), con el valor al final de cada barra.
  - Rejilla vertical suave, fondo blanco.
- **Colores fijos por categoría** (la misma respuesta siempre del mismo color en todos los gráficos):
  - Muy bueno `#5B1A8B` (morado), Excelente `#8E6CC7` (lila), Regular `#2CA02C` (verde), Deficiente `#17BECF` (cian), Neutral `#1B7F8C` (verde azulado).
  - Sí `#118DFF`, No `#E66C37`, No aplica `#9AA0A6`.
  - Para el resto de categorías (etnia, edad, contrato, situación) usar una paleta categórica de 6–8 colores, estable por categoría.
- **Números en formato español:** coma decimal y **2 decimales** en porcentajes (`41,86%`, `9,3%` → `9,30%`).
- Tipografía sans-serif (Arial/Inter), tamaños legibles; los textos largos de pregunta no deben cortarse en el gráfico.
- Los gráficos deben verse bien con muestras pequeñas (hay archivos de solo 16 egresados) y grandes (hasta ~600).
- Mostrar también el **n total** de respuestas de la pregunta debajo de cada par (ej. `n = 43`).

## 5. Interfaz

Pantalla única, limpia, de herramienta interna:

1. **Zona de carga** (drag & drop, múltiples .xlsx). Tras cargar: resumen "X archivos · Y egresados · Z duplicados descartados" y lista de archivos con el campo **Carrera** editable por archivo.
2. **Selector de carrera** (dropdown) con la opción "Consolidado (todas)".
3. **Vista previa** de los 12 pares de gráficos en el orden de la sección 4, en una columna con scroll, cada par en una tarjeta con título.
4. **Botones por tarjeta:** "Descargar PNG" (par pie+barras en una sola imagen) y "Copiar imagen" (portapapeles, para pegar directo en Word).
5. **Botón global:** "Descargar todo (ZIP)" con todos los PNG de la carrera seleccionada, nombrados `NN_variable_carrera.png` (sin tildes ni espacios en los nombres de archivo).
6. Opción de **resolución de exportación** (1x / 2x / 3x), por defecto 2x, fondo blanco.
7. Mensajes de error claros en español: archivo no reconocido, columna faltante (indicar cuál), pregunta no mapeada, hoja vacía.
8. Diseño responsive y limpio; sin login, sin rutas complejas.

## 6. Funcionalidades opcionales (hacer solo después de que lo anterior funcione perfecto)

- **Texto de "Interpretación" automático** por pregunta, en el estilo del informe, generado con plantilla (sin IA externa), editable y copiable. Ejemplo de redacción:
  > "Los resultados reflejan que la percepción predominante sobre … corresponde a la opción “Muy bueno”, con una representación del 41,86%. En segundo lugar, se ubica … con un 20,93%…"
- **Tabla comparativa de indicadores clave por carrera** (como la del informe, página "Resumen Comparativo de indicadores"), con estas columnas calculadas en %:
  - Situación laboral = % que "Estudia y trabaja"
  - Empleabilidad = % con `trabajo_ascenso` = Sí
  - Tiempo completo = % con `tipo_contrato` = Tiempo completo
  - Competencias = % con `conocimientos_utiles` = Sí
  - Calidad docente = % Excelente + Muy bueno en `satisfaccion_docente`
  - Recursos = % Excelente + Muy bueno en `satisfaccion_administrativo`
  - Satisfacción formación = % Excelente + Muy bueno en `formacion_carrera`
  - Interés en continuidad = % Sí en `interes_maestria`
  - Recomendación = % Sí en `recomendaria`
  - Exportable a PNG y a CSV.

## 7. Estructura sugerida del proyecto

```
/
├── netlify.toml
├── package.json
├── index.html
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── lib/
    │   ├── parseExcel.js      # lectura con SheetJS + detección formato A/B
    │   ├── normalize.js       # mapeo preguntas→columnas, limpieza de valores
    │   ├── stats.js           # conteos y porcentajes por variable
    │   ├── questions.js       # definición de las 12 preguntas (orden, título, colores)
    │   └── exportImage.js     # PNG, portapapeles, ZIP
    └── components/
        ├── UploadZone.jsx
        ├── CareerSelector.jsx
        ├── QuestionCard.jsx   # par pie + barras
        └── PieChart.jsx / BarChart.jsx
```

`questions.js` debe ser la **única fuente de verdad** (clave, título, orden, paleta); agregar o cambiar una pregunta no debe requerir tocar otros archivos.

## 8. Lista de carreras (para autocompletado)

Administración · Administración (Online) · Administración de Empresas e Inteligencia de Negocios · Gestión del Talento Humano · Gestión del Talento Humano (Online) · Administración del Talento Humano · Enfermería · Contabilidad · Contabilidad (Online) · Desarrollo de Software · Desarrollo de Software (Online) · Redes y Telecomunicaciones · Redes y Telecomunicaciones (Online) · Educación Inicial · Educación Básica · Pedagogía · Procesamiento de Alimentos · Mecánica Automotriz · Estética Integral · Seguridad Ciudadana y Orden Público · Prevención de Riesgos Laborales · Marketing Digital y Comercio Electrónico · Contabilidad y Tributación

El campo debe permitir también escribir un nombre libre.

## 9. Criterios de aceptación

- Subir `lista_seguimiento_graduados_3.xlsx` (formato A, 16 egresados) y `respuestas_seguimiento.xlsx` (formato B, 16 egresados × 12 preguntas) **produce exactamente los mismos conteos** en ambos casos. Verificación con los datos de ejemplo:
  - `formacion_carrera`: Deficiente 5, Regular 4, Muy bueno 4, Neutral 2, Excelente 1
  - `satisfaccion_docente`: Muy bueno 6, Deficiente 5, Regular 3, Neutral 2
  - `recomendaria`: No 12, Sí 4
  - `interes_maestria`: No 9, Sí 7
  - `situacion_actual`: Solo estudia 12, Estudia y trabaja 4
  - `etnia`: Mestizo/blanco 16
- Los porcentajes usan coma decimal y 2 decimales, y suman 100 % (±0,01).
- Los PNG exportados se ven nítidos al pegarlos en Word (mínimo 1600 px de ancho a 2x).
- `npm run build` genera `dist/` y el sitio funciona al desplegarlo en Netlify sin configuración adicional.
- No hay llamadas de red a servidores propios ni de terceros con datos del Excel.
- Ningún nombre ni cédula aparece en la interfaz ni en las imágenes exportadas.

## 10. Fuera de alcance

Autenticación, base de datos, historial de cargas, edición de los Excel, generación del informe Word completo, análisis cualitativo (Focus Group), análisis FODA.

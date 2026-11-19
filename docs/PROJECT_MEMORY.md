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

### 2026-11-15 — Eliminación visible de informes guardados en Firebase

- Agregado botón «Eliminar» con papelera en cada entrada de «Mis informes», reutilizando `removeReport` y el mismo flujo que el botón inferior del editor.
- Confirmación con título/período y advertencia de eliminación permanente. Estado «Eliminando...», bloqueo de guardado/borrados simultáneos y manejo de errores, incluido permiso denegado.
- La lista y su contador se actualizan únicamente tras completarse `deleteDoc`; se limpia el editor solo si corresponde al informe eliminado, conservando otro borrador abierto. Cancelar o fallar mantiene los informes.
- Corregida pérdida del ID local al actualizar un informe existente, que podía ocultar la opción de eliminarlo y provocar duplicados al guardar nuevamente.
- Archivos: `src/tools/general/informe-actividades/InformeActividades.jsx`, `src/styles.css` y esta memoria.
- Verificación ejecutada: `npm run build` correcto (aviso de chunks grandes); `git diff --check` sin errores de whitespace. Consultados índice/ADR/cobertura de Codebase Memory, contrastados con código actual, y documentación oficial de Firebase mediante Context7.
- Pendiente: comprobación interactiva autenticada de confirmación, cancelación, eliminación real y permisos en Firebase; no realizada en esta sesión. No hay reglas de Firestore versionadas en el repositorio para verificar los permisos desplegados.

### 2026-11-15 — Generador de certificados URI

- Requisitos confirmados: organizadora Magali Yesenia Ortega Flores, ponentes y participantes; horas por defecto 40/3/3 editables; participantes requieren Forms y 80 % de asistencia con tolerancia inicial de 1 minuto y límite de 2. Organizadora/ponentes confirmados exentos. Guardar solo evento y acreedores, no certificados ni archivos originales.
- Analizados los tres juegos Forms/Teams y los Excel de referencia en `material_para_certificados/`, el PDF de 11 páginas, PowerPoint y cuatro capturas. El enlace Canva devolvió «Unsupported client». PowerPoint contiene las cuatro fuentes: New Icon Script, Beatrix Antiqua, Poppins regular/bold; recuperadas de contenedores EOT con cobertura de letras/tildes/ñ/números españoles. Se prepararon tres fondos sin texto variable, conservando adornos e imágenes.
- Herramienta en `/uri/generador-certificados`, registrada en `src/config/tools.js`. Interfaz por etapas Evento/Archivos/Revisión/Certificados, modelos de datos El Chaco/KFC/UISRAEL, autenticación con la misma cuenta autorizada de informes, listado/actualización/eliminación de expedientes.
- Importación XLSX y CSV UTF-16/tabulado; selector de hoja, mapeo Forms y orden de fechas Teams. Consolida Forms por cédula/correo y vincula solo correos exactos únicos; nombres similares requieren vínculo manual. Nombres propuestos editables/revisables, fusión de conexiones y alta de ponentes. Moderadores no se convierten automáticamente en ponentes. Autorizaciones negativas/contradictorias visibles para resolución.
- Asistencia en segundos civiles sin depender de zona horaria del navegador, unión de intervalos recortados al tramo confirmado, sin sumar solapamientos. Conserva el total reportado por Teams aparte. Un resumen que incluye desconexiones no se trata como conexión continua si falta detalle.
- PDF con fuentes y fondos originales, ajuste de nombres a una/dos líneas balanceadas, párrafos con campos y negritas, firmantes por rol y detección de contenido que no cabe/caracteres no soportados. Vista previa del PDF real, PDF por lote y ZIP de PDF individuales. Excel con Resumen/Para certificados/Detalle de evaluación/Pendientes. Motores PDF/Excel cargados bajo demanda.
- Firebase: un documento atómico en `users/{uid}/certificateEvents/{eventId}` con evento, acreedores finales, evidencia agregada y metadatos de origen. Sin PDF, cargas originales ni registros no aptos/pendientes. Cambiar política temporal de un expediente recuperado exige recargar originales para reevaluar participantes. Reglas y comprobación de despliegue documentadas en `docs/FIREBASE_CERTIFICADOS.md`; no se desplegaron reglas ni se escribieron/borraron datos reales.
- Archivos: `src/tools/uri/generador-certificados/` (interfaz y librerías), `public/certificados/` (fondos y fuentes), `scripts/prepare-certificate-assets.py`, `scripts/verify-certificate-pdf.mjs`, `scripts/verify-certificate-ui.mjs`, registro de herramientas, `package.json`/lock (pdf-lib y fontkit), `README.md`, documentación Firebase y esta memoria. Los originales del usuario permanecen en su carpeta.
- Verificaciones ejecutadas: `npm run test:certificados` (14 aprobadas, ninguna omitida; incluye archivos reales, decisiones revisadas y fuentes/fondos), 10 pruebas Trello aprobadas, `npm run build` correcto (aviso de chunks grandes), `git diff --check` sin errores de whitespace. CLI Python preparó recursos sin modificar originales.
- Prueba real de navegador Edge/Playwright mediante montaje local con UID sintético no autorizado: carga KFC, confirmación del tramo y ponente, vínculo manual del correo erróneo, 9 acreedores, vista previa y descarga PDF, ZIP con 9 PDF, Excel con 4 hojas, trabajo preservado ante guardado rechazado, diseño móvil sin desbordamiento horizontal y ruta pública protegida por login. Playwright instalado únicamente en directorio temporal, no como dependencia del proyecto.
- Generados y revisados visualmente los tres roles, nombre largo a dos líneas e institución larga; PyMuPDF comprobó que los bloques de texto de las cinco páginas de verificación están dentro de la página. Se ajustó la posición de los firmantes para mantener los cargos dentro del borde. Resultados en `C:\Users\User\AppData\Local\Temp\opencode`, fuera del proyecto.
- Pendiente: guardar/abrir/actualizar/eliminar un expediente de prueba con la cuenta autorizada y reglas reales de Firebase. También revisión final del usuario de redacciones y aspecto visual. No se comprobó un guardado exitoso remoto ni se realizaron envíos de certificados.

### 2026-11-15 — Aclarar por qué solo se habilitaba el certificado de la organizadora

- Reporte del usuario en El Chaco: solo aparecía Yesenia para generar aunque otras personas estaban marcadas. La asistencia sí estaba detectada; faltaba confirmar el tramo y revisar nombres. «Incluir» y «Nombre revisado» eran estados distintos poco visibles.
- Agregado `ReviewRequirements.jsx` en Revisión: muestra fecha/tramo/mínimo con tolerancia y botón «Confirmar este tramo», estado de nombres y moderadores pendientes. Columna «Seleccionar» separada de una nueva casilla «Nombre revisado» por fila; se conserva la acción de revisión masiva de nombres visibles. En Certificados se explica por qué no aparecen seleccionados pendientes y se permite volver a Revisión.
- Corregido `evaluatePerson`: excluir/desmarcar impide emitir, pero conserva segundos, total y porcentaje visibles y exportables. Antes devolvía cero antes de calcular la asistencia.
- Archivos: `GeneradorCertificados.jsx`, `ReviewRequirements.jsx`, `certificates.css`, `lib/model.js`, `lib/certificates.test.js`, `scripts/verify-certificate-ui.mjs` y esta memoria.
- Verificación ejecutada: `npm run test:certificados` (15 aprobadas, sin omitidas); `npm run build` correcto con aviso de chunks grandes. Edge/Playwright: regresión KFC completa y reproducción El Chaco con solo organizadora inicialmente; revisar nombre no omite la confirmación del tramo; exclusión conserva 0:53:00 de Lilian; confirmar tramo y nombres habilita a Lilian/Danny/Yajaira (esta última por tolerancia); confirmar a Katherine como ponente habilita quinto acreedor y descarga PDF de cinco páginas. Sin acceso a Firebase real.
- Pendiente remoto de Firebase sin cambios respecto a la tarea anterior.

### 2026-11-15 — Editor visual previo a descargar certificados URI

- Agregado «Editor visual de distribución» en Certificados. Permite seleccionar una persona de muestra y mover título, nombre, redacción y cada firma (nombre/cargo juntos); redimensionar el espacio con tirador o medidas; reducir/ampliar texto 40–200 %; mover por teclado y restaurar elemento/modelo.
- Distribución independiente por rol, común a todos los certificados de ese rol en el evento; se conserva en `event.designs` mediante el snapshot existente. Expedientes anteriores sin diseños conservan valores predeterminados. PDF único, lote y ZIP comparten estos ajustes y validaciones de límites/contenido; el fondo decorativo queda fijo.
- Vista automática del PDF real renderizada en canvas con PDF.js 5.7.284, importación diferida y worker local Vite. Espera 450 ms al editar, cancela renders obsoletos, conserva última imagen ante errores y muestra el estado de actualización. Requisito de Node documentado: 22.13+ (24 LTS recomendado).
- Archivos: `CertificateDesigner.jsx`, `lib/design.js`, `lib/certificates.js`, `GeneradorCertificados.jsx`, `certificates.css`, `lib/certificates.test.js`, `scripts/verify-certificate-ui.mjs`, `package.json`/lock, `README.md`, `docs/FIREBASE_CERTIFICADOS.md` y esta memoria.
- Verificación ejecutada: `npm run test:certificados` (16 aprobadas, ninguna omitida); `npm run build` correcto (aviso de chunks grandes) y `git diff --check` sin errores de whitespace en archivos versionados. Edge/Playwright con originales KFC/El Chaco comprobó canvas real, arrastre, redimensionado, texto al 70 %, modelos independientes, restauración, móvil sin desbordamiento y métricas de posición/tamaño de firma en PDF descargado y PDF correspondiente del ZIP; también regresión KFC9, El Chaco5, Excel y login. Captura `editor-certificados.png` inspeccionada visualmente en directorio temporal. Persistencia y reapertura de diseños verificadas con snapshot local; sin acceso real a Firebase.
- La descarga npm del paquete tuvo cortes de red; se recuperó el tarball oficial en fragmentos desde el registro y se instaló desde la caché con integridad SHA512 del lockfile. Se restauraron dependencias opcionales locales y la compilación volvió a pasar. No se añadieron scripts de descarga al repositorio.
- Pendiente: confirmar guardado/apertura remoto del diseño con la cuenta autorizada y reglas reales; se mantiene el pendiente de Firebase anterior y revisión final del usuario.

### 2026-11-15 — Certificados sin inicio de sesión (revertido posteriormente)

- A petición del usuario, `/uri/generador-certificados` abre directamente el espacio de trabajo sin login, comprobación de cuenta ni botón de salir.
- Sustituido el guardado de certificados en Firestore por `localStorage` (`uri-certificate-events-v1`): guardar, listar por actualización, abrir, reemplazar y eliminar expedientes en el mismo navegador/origen. Se conserva el snapshot de evento, diseños y acreedores finales; sin originales ni PDF ni pendientes. Si falta espacio o se bloquea el guardado, se mantiene el trabajo sin marcarlo como guardado.
- Interfaz y README explican el alcance local: no hay sincronización entre equipos y borrar datos del navegador elimina los expedientes. No se migraron ni eliminaron documentos remotos anteriores. La documentación Firebase queda como referencia histórica. Esta decisión sustituye el requisito anterior de cuenta autorizada y persistencia remota para certificados; los informes mantienen su acceso y Firebase.
- Archivos: `GeneradorCertificados.jsx`, `lib/storage.js` (sustituye `lib/firestore.js`), `scripts/verify-certificate-ui.mjs`, `README.md`, `docs/FIREBASE_CERTIFICADOS.md` y esta memoria.
- Verificación ejecutada: `npm run test:certificados` (16 aprobadas, ninguna omitida); `npm run build` correcto con aviso de chunks grandes; Edge/Playwright mediante `node scripts/verify-certificate-ui.mjs C:\Users\User\AppData\Local\Temp\opencode\certificate-ui-test`: ruta pública sin login, guardar/reabrir tras recarga/actualizar sin duplicados/eliminar y confirmar ausencia tras recarga, fallo de cuota sin perder cambios, regresión KFC9/ElChaco5, editor PDF, descargas PDF/ZIP/Excel y móvil. Sin acceso a Firebase real.
- Pendiente: revisión final del usuario de textos y presentación. Los pendientes anteriores de verificar persistencia remota de certificados ya no aplican al flujo local actual.

### 2026-11-15 — Restauración del login y Firebase de certificados

- El usuario decidió volver al funcionamiento previo: login con la misma cuenta autorizada de informes y expedientes en Firestore `users/{uid}/certificateEvents/{eventId}`. Queda revertida la decisión de acceso sin login y guardado local de la entrada anterior.
- Restaurados `CertificateLogin`, comprobación de UID, cierre de sesión, consultas/guardado/eliminación en `lib/firestore.js`, textos de interfaz, README, guía Firebase y prueba de navegador anterior. Eliminado el adaptador `lib/storage.js`.
- Archivos: `src/tools/uri/generador-certificados/GeneradorCertificados.jsx`, `lib/firestore.js`, `lib/storage.js` (retirado), `scripts/verify-certificate-ui.mjs`, `README.md`, `docs/FIREBASE_CERTIFICADOS.md` y esta memoria.
- Verificación ejecutada: `npm run test:certificados` (16 aprobadas, ninguna omitida), `npm run build` correcto (aviso de chunks grandes), Edge/Playwright con `node scripts/verify-certificate-ui.mjs C:\Users\User\AppData\Local\Temp\opencode\certificate-ui-test`: login en ruta pública, conservación del trabajo ante guardado no autorizado, editor/PDF/ZIP/Excel/móvil y regresiones KFC9/ElChaco5.
- Pendiente: comprobación autenticada de guardar/abrir/actualizar/eliminar con cuenta autorizada y reglas reales de Firebase. No se modificaron reglas desplegadas ni se escribieron o eliminaron datos remotos en esta reversión.

### 2026-11-16 — Controles tipo Canva y ajustes individuales de certificados

- Corregido el foco al seleccionar/arrastrar un bloque para que las cuatro flechas funcionen directamente: 1 punto por pulsación y 10 con Mayús. El teclado actúa dentro del lienzo sin interferir con los campos de formulario.
- Ocho tiradores visibles en el bloque seleccionado: cuatro lados y cuatro esquinas. Los bordes superior/izquierdo desplazan el origen manteniendo fijo el lado opuesto; límites de página y tamaños mínimos compartidos en `resizeBox`.
- Guías magenta temporales y ajuste suave a bordes/centros de otros bloques o al centro de página durante el arrastre. Alt permite mover sin ajuste; las guías desaparecen al terminar/cancelar. El teclado permite ajuste fino sin imantación.
- Alcance explícito, predeterminado «Solo este certificado». Excepciones por ID y rol en `event.certificateDesigns[id] = { role, boxes }`, superpuestas a la plantilla `event.designs[role]`. El motor PDF y ZIP y el snapshot existente usan los mismos datos, manteniendo compatibilidad con expedientes anteriores.
- «Todos los certificados de este modelo» muestra/edita la plantilla común: cada bloque editado elimina las excepciones individuales de ese bloque en el rol, preservando los otros bloques y roles. Botón para aplicar una distribución individual completa a todo su modelo. Restaurar individual vuelve a la plantilla; restaurar modelo elimina su distribución y sus excepciones.
- Archivos: `CertificateDesigner.jsx`, `certificates.css`, `lib/design.js`, `lib/certificates.js`, `lib/certificates.test.js`, `scripts/verify-certificate-ui.mjs`, `README.md`, `docs/FIREBASE_CERTIFICADOS.md` y esta memoria.
- Verificaciones ejecutadas: `npm run test:certificados` (13 aprobadas, 6 omitidas porque faltan los Excel/CSV originales en esta copia); `npm run build` correcto con aviso de chunks grandes; Edge/Playwright mediante `node scripts/verify-certificate-ui.mjs C:\Users\User\AppData\Local\Temp\opencode\certificate-ui-test --designer-only`: PDF real, foco tras arrastre, cuatro flechas/Mayús, ocho tiradores visibles y redimensionado desde los cuatro lados, guía central y Alt, independencia individual y entre roles, promoción a plantilla, restauración, métricas reales del ajuste individual en PDF y ZIP y móvil sin desbordamiento. Captura de escritorio inspeccionada visualmente en directorio temporal. Snapshot/reapertura local verificados por pruebas de dominio. `git diff --check` sin errores de whitespace.
- Codebase Memory: el índice inicial apuntaba a la ubicación anterior sin `herramientas/`. Se indexó la raíz actual y se verificó cobertura/frescura; nuevo identificador `C-Users-User-Documents-ItsqmetWork-herramientas-usegbe-generador-estadistica`. Se consultó el ADR anterior y se registraron las decisiones actuales en el índice de esta ubicación.
- Pendientes: comprobación remota autenticada de guardar/abrir los ajustes individuales en Firebase y revisión del usuario. No se accedió a Firebase real. Las regresiones de importación KFC/El Chaco/UISRAEL no se ejecutaron por ausencia de originales; el script conserva el modo completo y añade `--designer-only` con participantes sintéticos para probar el editor de forma independiente.

### 2026-11-16 — Edición de firmas en el lienzo y saltos de línea reales

- Reporte: el cargo «Representante GAD El Chaco (Alcaldía de Napo)» seguía en una línea aunque se introducía Enter en el textarea. Causa: `linesFor` aplicaba `clean` a todo el texto antes de distribuirlo y eliminaba los saltos.
- `fitText` normaliza CRLF/CR a LF y distribuye cada línea explícita por separado, conservando saltos interiores y ajuste automático dentro de cada línea. El balanceo no redistribuye textos con saltos manuales. Se mantienen límites de espacio/líneas/caracteres; texto vacío o que no cabe produce error sin recortar contenido.
- Doble clic en una firma del lienzo, F2 o «Editar texto de esta firma» abre un panel sobre la vista para editar nombre/cargo en vivo. Enter en Cargo inserta otra línea; flechas dentro del formulario no mueven el bloque. Listo/Escape cierra conservando cambios. El panel indica persona o modelo según el alcance seleccionado.
- Los bloques `signerN` admiten `signerName`/`signerTitle` opcionales, persistidos junto con su geometría en plantillas/excepciones existentes. Si faltan, el PDF hereda `event.signers[N]`. Arrastre/redimensionado y promoción al modelo conservan el texto; restaurar recupera la geometría y texto heredados. La sección común de firmantes también respeta Enter y explica la prioridad de los textos personalizados.
- Archivos: `CertificateDesigner.jsx`, `GeneradorCertificados.jsx`, `certificates.css`, `lib/design.js`, `lib/certificates.js`, `lib/certificates.test.js`, `scripts/verify-certificate-ui.mjs`, README, guía Firebase y esta memoria.
- Verificación ejecutada: `npm run test:certificados` (14 aprobadas, 6 omitidas por originales ausentes); `npm run build` correcto con aviso de chunks grandes; `git diff --check` sin errores de whitespace. Edge/Playwright con `--designer-only`: doble clic, Enter real, F2/Escape, cursor aislado, texto conservado al mover, independencia individual, promoción de texto al modelo, dos líneas exactas en baselines distintas del PDF y mismo resultado en ZIP, además de las comprobaciones anteriores del editor/móvil. Snapshot local con texto y saltos validado en pruebas; captura `editor-firma-texto.png` inspeccionada en directorio temporal.
- Pendiente: guardado/reapertura autenticados en Firebase y pruebas de importación con los originales ausentes. No se accedió a Firebase real. El ejemplo fue verificado con participantes sintéticos; no se modificaron expedientes del usuario.

### 2026-11-16 — Fondo único y logos PNG comunes a todos los certificados

- Usuario confirmó un solo fondo para organizadores, ponentes y participantes y que los logos se aplican por igual a toda la generación. Revisado `nuevo_modelo.pdf` de la raíz: una página de 841,89 × 595,28 puntos, sin logo ITSQMET fijo; no fue necesario otro formato.
- Nuevo `public/certificados/fondo-unico.pdf`, preparado reproduciblemente con `scripts/prepare-unified-certificate-background.py` y PyMuPDF: conserva imágenes/vectores/adornos y elimina solo el texto para mantener CERTIFICADO editable sin duplicarlo. El original no se modifica. Motor PDF toma siempre página 0 y usa el mismo tamaño de título para todos los roles; `fondos.pdf` queda como recurso histórico sin uso. Las redacciones, horas, firmas y ajustes de texto por rol/individuo siguen disponibles.
- Editor: sección «Logos compartidos de la generación», carga múltiple PNG, miniaturas, selección, quitar, movimiento por ratón/flechas, ocho tiradores y medidas. Marcos limitados a la página; PNG centrado dentro del marco conservando proporción y transparencia. Posición/tamaño comunes a todos los roles aunque el alcance textual sea individual. Restaurar/promover textos no altera los logos. Vista previa, PDF por lote y ZIP comparten la misma representación; cada imagen se incrusta una sola vez por PDF de lote.
- Persistencia mediante snapshot existente en `event.logos`: ID, nombre, data URL PNG y geometría. Se conservan al serializar/reabrir, sin almacenar PNG en `public/`. Se optimizan en canvas a lado máximo inicial 1 200 px y hasta 180 000 caracteres por imagen; límite conjunto 550 000 caracteres, con control adicional de 850 000 bytes del expediente existente. PNG inválido/carga excesiva conserva logos anteriores; si cambia el evento durante la lectura no se sobrescribe. Se mantienen guardas de archivo de 20 MB y dimensiones de 16 megapíxeles antes de decodificar. Expedientes sin logos regeneran sobre el fondo nuevo sin logos.
- Archivos: `CertificateDesigner.jsx`, `certificates.css`, `lib/logos.js`, `lib/certificates.js`, `lib/firestore.js`, `lib/certificates.test.js`, `scripts/verify-certificate-ui.mjs`, nuevo script/fondo, `public/certificados/README.md`, README, guía Firebase y esta memoria. Se preservó el trabajo preexistente del editor/firmas en el árbol de trabajo.
- Verificación ejecutada: script Python de preparación; `npm run test:certificados` (16 aprobadas, 6 omitidas por originales ausentes); `npm run build` correcto (aviso habitual de chunks grandes); `git diff --check` sin errores de whitespace. Edge/Playwright con `node scripts/verify-certificate-ui.mjs C:\Users\User\AppData\Local\Temp\opencode\certificate-ui-test --designer-only`: regresiones del editor/firmas/móvil, dos PNG transparentes, cambio de posición/tamaño compartido entre roles, flechas/tiradores, carga inválida sin pérdida, snapshot/reapertura local, presencia y canal alfa en todas las páginas PDF y todos los PDF del ZIP y eliminación de logo. Captura `editor-logos-compartidos.png` inspeccionada visualmente. PyMuPDF comprobó posiciones idénticas de ambos logos en las cuatro páginas, proporción conservada, un solo título por página y fondo único sin texto.
- Consultados índice/ADR/cobertura de Codebase Memory y documentación actual de pdf-lib en Context7; código actual contrastado. Pendiente: guardado/reapertura autenticados en Firebase (snapshot local sí verificado), pruebas con originales Forms/Teams ausentes y revisión visual del usuario con sus logos reales. No se accedió a Firebase real ni se modificaron expedientes remotos.

### 2026-11-17 — Firmas uniformes por modelo y vista previa fiel a la descarga

- Reporte: al editar un participante KFC con alcance «Todos», las firmas podían quedar en coordenadas diferentes y perjudicar la firma masiva. Hallazgo reproducido con datos sintéticos: el alcance modelo ocultaba todas las excepciones individuales en el lienzo/PDF de vista previa, pero la descarga sí las aplicaba; editar un bloque solo eliminaba las excepciones de ese bloque, dejando otras firmas personalizadas.
- Corrección: ambos alcances resuelven y muestran el certificado real de la persona seleccionada con `designBoxes(event, ..., person.id)` y `generateCertificates(event, [person])`. Cambiar el alcance define a quién afecta la próxima edición, sin ocultar ajustes existentes ni saltar a una plantilla distinta.
- Nuevo contador de certificados del rol con ajustes individuales de firmas y botón «Igualar todas las firmas de [rol] a este certificado», disponible en ambos alcances. `applySignaturesToModel` toma una instantánea de todas las firmas resueltas de la persona seleccionada y aplica geometría/escala/texto al modelo, eliminando todas las excepciones de firmas de ese rol. Mantiene los demás bloques individuales, roles y logos. Permite corregir expedientes anteriores sin migración automática ni modificación remota.
- Archivos: `CertificateDesigner.jsx`, `lib/design.js`, `lib/certificates.test.js`, `scripts/verify-certificate-ui.mjs`, README y esta memoria.
- Verificación ejecutada: `npm run test:certificados` (17 aprobadas, 6 omitidas por originales ausentes); `npm run build` correcto (aviso habitual de chunks grandes); Edge/Playwright mediante `node scripts/verify-certificate-ui.mjs C:\Users\User\AppData\Local\Temp\opencode\certificate-ui-test --designer-only`: regresión de excepciones en varias firmas, cambio de alcance sin ocultar posición, sincronización completa y comparación de texto/coordenadas/tamaño reales de todas las firmas de participantes en PDF por lote y todos los PDF de participantes del ZIP frente al certificado de referencia, además de regresiones existentes de editor/textos/logos/móvil. Prueba de dominio valida snapshot/reapertura, igualdad en lote e individuales y conservación de otros bloques/roles. `git diff --check` sin errores de whitespace.
- Consultados índice/ADR y cobertura/frescura de los tres archivos de implementación y contrastados con código actual. Pendientes: comprobación con expediente KFC guardado real y persistencia autenticada en Firebase; originales Forms/Teams ausentes. No se accedió a Firebase ni se modificaron expedientes remotos.

### 2026-11-19 — Tolerancia de certificados sin límite máximo

- A petición del usuario, eliminado el máximo de 2 minutos tanto del campo de Evento como de las validaciones de cálculo y guardado. Tolerancia inicial de 1 minuto, valores numéricos desde 0 sin máximo; se rechazan vacíos, negativos y no finitos. El mínimo calculado nunca baja de cero.
- Archivos: `src/tools/uri/generador-certificados/EventSettings.jsx`, `lib/model.js`, `lib/certificates.test.js`, README y esta memoria. Esta decisión sustituye el límite histórico de 2 minutos.
- Verificación ejecutada: `npm run test:certificados` (17 aprobadas, 6 omitidas por originales ausentes), incluida tolerancia de 10,5 minutos, límite exacto en segundos, snapshot/reapertura local y tolerancia superior al mínimo estricto; `npm run build` correcto con aviso habitual de chunks grandes; `git diff --check` sin errores de whitespace. Consultados índice, ADR y cobertura/frescura y contrastados con código actual.
- Pendiente: comprobación interactiva de este campo y guardado remoto autenticado en Firebase; no realizados en esta tarea. Se mantiene el requisito existente de recargar originales si se cambia la política de asistencia de un expediente recuperado.

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

- Herramientas MCP directas disponibles y utilizadas en la sesión de 2026-11-15; el pendiente anterior de recargar la sesión está resuelto.
- La instalación actual está preparada para Windows (amd64/arm64). Si se clona el repositorio, ejecutar el script de instalación local y volver a indexar; los binarios e índices no se guardan en Git.

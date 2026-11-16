# Firebase para certificados URI

La herramienta comparte Firebase Authentication y la cuenta configurada en `VITE_FIREBASE_ALLOWED_UID` con la bitácora de informes.

## Datos guardados

Cada expediente es un documento atómico en:

```text
users/{uid}/certificateEvents/{eventId}
```

Contiene `schemaVersion`, `event`, `recipients`, `sourceInfo` y `updatedAt`:

- Datos y redacciones del evento, firmantes, horas por rol y política de asistencia.
- Distribución editable opcional en `event.designs`, por rol y bloque: `x`, `y`, `width`, `height` en puntos PDF desde la esquina superior izquierda y `scale` para el texto. Los expedientes anteriores sin esta propiedad utilizan la distribución original. Se conserva al regenerar PDF/ZIP sin afectar la evaluación de asistencia.
- Solamente acreedores listos: nombre aprobado, rol, correo de inscripción si corresponde, criterio y tiempos calculados, nombres de referencia y observaciones.
- Conteos y nombres de los archivos de origen, sin su contenido.
- No contiene PDF, ZIP, imágenes, archivos originales, intervalos crudos ni registros no aptos/pendientes.

Guardar nuevamente reemplaza el expediente completo: evita conservar acreedores retirados de la selección. Borrarlo elimina ese documento, sin afectar archivos descargados en la computadora.

Al recuperar un expediente se puede editar la redacción, horas, firmantes y nombres y volver a generar sus certificados. Cambiar la fecha, el tramo, porcentaje o tolerancia invalida la evaluación guardada de participantes y exige recargar los originales. No se reconstruyen conexiones a partir de un tiempo agregado.

## Reglas de Firestore

El repositorio no tenía una configuración de despliegue de reglas. La aplicación no cambia las reglas de producción. Si las reglas existentes no cubren esta subcolección, agregar el siguiente bloque **dentro de** `match /databases/{database}/documents`, conservando los bloques de las demás herramientas:

```firestore-rules
match /users/{uid}/certificateEvents/{eventId} {
  allow read, write: if request.auth != null
    && request.auth.uid == uid
    && request.auth.uid == 'UID_DE_LA_CUENTA_AUTORIZADA';
}
```

Reemplazar el marcador por el UID real configurado para esta instalación, en la consola de Firebase → Firestore Database → Reglas. Una regla sobre `/users/{uid}` por sí sola no cubre sus subcolecciones; un bloque recursivo existente podría cubrirlas ya.

Un error `permission-denied` se muestra en pantalla y mantiene el trabajo local. El límite preventivo del expediente es 850 000 bytes de JSON para mantenerse por debajo del límite por documento. Las consultas usan `orderBy('updatedAt', 'desc')`, sin índice compuesto.

## Comprobación pendiente en la instalación real

Con la cuenta autorizada: guardar un evento, abrirlo desde «Mis eventos», descargar otra vez sus certificados, actualizar un nombre y eliminar un expediente de prueba. La prueba automatizada local no accede a Firebase real ni usa credenciales de una persona.

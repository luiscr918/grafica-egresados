import { formatDuration, windowOf } from './lib/model.js'

export default function ReviewRequirements({ event, people, onConfirmWindow, onEditWindow }) {
  let interval
  try { interval = windowOf(event) } catch { /* The user can complete the time range in Event. */ }
  const selected = people.filter((p) => p.include && p.role !== 'excluded')
  const names = selected.filter((p) => !p.nameConfirmed).length
  const roles = selected.filter((p) => p.role === 'review')
  return <section className="cert-requirements" aria-label="Requisitos para habilitar certificados">
    <div>
      <strong>{event.windowConfirmed && interval ? '✓ Tramo de clase confirmado' : '1. Falta confirmar el tramo de clase'}</strong>
      {interval ? <p>{event.date} · {event.startTime} – {event.endTime} · Duración {formatDuration(interval.duration)}. Con {event.tolerance} min de tolerancia, el mínimo es {formatDuration(interval.minimum)}.</p> : <p>Define la fecha y el horario efectivo de la clase para evaluar a los participantes.</p>}
      {!event.windowConfirmed && interval && <button type="button" className="button button-primary" onClick={onConfirmWindow}>Confirmar este tramo</button>}
      <button type="button" className="cert-text-button" onClick={onEditWindow}>{interval ? 'Revisar / cambiar horario' : 'Definir horario en Evento'}</button>
    </div>
    <div><strong>{names ? `2. ${names} nombres seleccionados sin revisar` : '✓ Nombres seleccionados revisados'}</strong><p>«Seleccionar» elige a la persona, pero no confirma su nombre. Marca la casilla <strong>Nombre revisado</strong> de cada fila, o usa «Marcar nombres visibles como revisados» después de comprobarlos.</p></div>
    {roles.length > 0 && <div><strong>3. Confirmar quién es ponente</strong><p>{roles.map((p) => p.certificateName).join(' · ')}. Cambia su rol a «Ponente» si corresponde; ser moderador en Teams no lo asigna automáticamente.</p></div>}
  </section>
}

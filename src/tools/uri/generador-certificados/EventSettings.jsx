import { CalendarDays, Clock3 } from 'lucide-react'
import { formatDuration, windowOf } from './lib/model.js'

const PRESETS = [
  { label: 'El Chaco', institution: 'Gobierno Autónomo Descentralizado Municipal de El Chaco (Alcaldía de Napo)', title: 'Innovación Educativa: Liderazgo, Diseño y Gestión de Proyectos para el Desarrollo Social', focus: 'innovación educativa, liderazgo, diseño y gestión de proyectos para el desarrollo social', partner: { name: 'Ab. Oscar De la Cruz', title: 'Alcalde GAD El Chaco' } },
  { label: 'Grupo KFC', institution: 'INT Food Services Corp. S.A. (Grupo KFC)', title: 'Selección Estratégica 4.0: Inteligencia Artificial, Herramientas Digitales y Evaluación por Competencias para la Identificación y Selección del Mejor Talento en Multinacionales', focus: 'inteligencia artificial, herramientas digitales y evaluación por competencias para la identificación y selección de talento en multinacionales', partner: { name: 'Esteban Guarderas', title: 'Representante Legal Grupo KFC Ecuador' } },
  { label: 'Universidad Israel', institution: 'Universidad Israel (UISRAEL)', title: 'Inteligencia Artificial Generativa Aplicada a la Docencia de Educación Superior', focus: 'inteligencia artificial generativa y sus aplicaciones en los procesos de enseñanza y aprendizaje en la educación superior', partner: { name: 'Dra. Norma Molina', title: 'Rectora UISRAEL' } },
]

export default function EventSettings({ event, onChange, suggestion, onSuggestion }) {
  let interval, intervalError
  try { interval = windowOf(event) } catch (error) { intervalError = error.message }
  const field = (key, value) => onChange({ ...event, [key]: value, ...(['date', 'startTime', 'endTime'].includes(key) ? { windowConfirmed: false } : {}) })
  return <>
    <div className="cert-panel-heading"><CalendarDays size={22} /><div><h2>Datos de la clase magistral</h2><p>Las horas del certificado son independientes del tiempo real utilizado para evaluar la asistencia.</p></div></div>
    <div className="cert-preset-bar"><span>Completar desde un modelo:</span>{PRESETS.map((preset) => <button type="button" key={preset.label} className="button button-light" onClick={() => onChange({ ...event, title: preset.title, institution: preset.institution, focus: preset.focus, signers: [...event.signers.slice(0, 2), { ...preset.partner }] })}>{preset.label}</button>)}</div>
    <div className="cert-fields">
      <label className="cert-full">Tema de la clase magistral<input value={event.title} onChange={(e) => field('title', e.target.value)} placeholder="Título completo del evento" /></label>
      <label className="cert-full">Institución / empresa del convenio<input value={event.institution} onChange={(e) => field('institution', e.target.value)} /></label>
      <label>Fecha del evento<input type="date" value={event.date} onChange={(e) => field('date', e.target.value)} /></label>
      <label>Modalidad<input value={event.modality} onChange={(e) => field('modality', e.target.value)} /></label>
      <label className="cert-full">Enfoque y propósito académico<textarea rows={3} value={event.focus} onChange={(e) => field('focus', e.target.value)} placeholder="Conocimientos y aplicaciones abordados en la clase" /></label>
      <label className="cert-full">Nombre completo de la organizadora<input value={event.organizerName} onChange={(e) => field('organizerName', e.target.value)} /></label>
    </div>
    <div className="cert-subpanel">
      <div className="cert-panel-heading"><Clock3 size={21} /><div><h3>Tramo efectivo y requisito de asistencia</h3><p>Se cuentan únicamente conexiones dentro de este horario, descontando desconexiones y solapamientos.</p></div></div>
      {suggestion && <div className="message message-info">Tramo sugerido a partir de <strong>{suggestion.reference}</strong>: {suggestion.startTime} – {suggestion.endTime} ({suggestion.date}). <button type="button" className="cert-text-button" onClick={onSuggestion}>Usar este tramo</button></div>}
      <div className="cert-fields cert-fields-four">
        <label>Inicio efectivo<input type="time" step="1" value={event.startTime} onChange={(e) => field('startTime', e.target.value)} /></label>
        <label>Fin efectivo<input type="time" step="1" value={event.endTime} onChange={(e) => field('endTime', e.target.value)} /></label>
        <label>Asistencia requerida (%)<input type="number" min="1" max="100" step="1" value={event.percentage} onChange={(e) => field('percentage', e.target.value)} /></label>
        <label>Tolerancia (minutos)<input type="number" min="0" max="2" step="0.5" value={event.tolerance} onChange={(e) => field('tolerance', e.target.value)} /></label>
      </div>
      {interval ? <div className="cert-time-summary"><span>Duración <strong>{formatDuration(interval.duration)}</strong></span><span>Mínimo estricto <strong>{formatDuration(interval.strict)}</strong></span><span>Con tolerancia <strong>{formatDuration(interval.minimum)}</strong></span></div> : <p className="cert-help">{intervalError}</p>}
      <label className="cert-checkbox"><input type="checkbox" checked={event.windowConfirmed} disabled={!interval} onChange={(e) => field('windowConfirmed', e.target.checked)} /> Confirmo que este tramo corresponde a la clase, no al tiempo total que quedó abierta la reunión.</label>
    </div>
    <div className="cert-subpanel"><h3>Horas que aparecerán en los certificados</h3><div className="cert-fields cert-fields-three">{[['organizer', 'Organizadora'], ['speaker', 'Ponentes'], ['participant', 'Participantes']].map(([role, label]) => <label key={role}>{label}<input type="number" min="0.5" step="0.5" value={event.hours[role]} onChange={(e) => onChange({ ...event, hours: { ...event.hours, [role]: e.target.value } })} /></label>)}</div></div>
  </>
}

import { useState } from 'react'
import { Eye, Merge, RotateCw, X } from 'lucide-react'
import { clean, formatDuration, ROLE_LABELS, titleCase } from './lib/model.js'

export default function PersonReview({ person, people, registrations, onChange, onLink, onMerge, onPreview, onClose }) {
  const [mergeId, setMergeId] = useState('')
  const [rotateCount, setRotateCount] = useState(2)
  const update = (key, value) => onChange({ ...person, [key]: value })
  const used = new Set(people.filter((p) => p.id !== person.id && p.originalTeams).map((p) => p.registration?.id).filter(Boolean))
  const originalOptions = [...new Set([person.originalForm, person.originalTeams].filter(Boolean))]
  return <section className="cert-review-panel">
    <div className="cert-panel-heading"><div><p className="eyebrow">Revisión individual</p><h3>{person.certificateName || 'Persona sin nombre'}</h3></div><button type="button" className="icon-button" onClick={onClose} aria-label="Cerrar revisión"><X size={17} /></button></div>
    <div className="cert-fields">
      <label className="cert-full">Nombre que se imprimirá (nombres primero y apellidos después)<input value={person.certificateName} onChange={(e) => onChange({ ...person, certificateName: e.target.value, nameConfirmed: false })} /></label>
      <div className="cert-full cert-name-tools">{originalOptions.map((original, i) => <button type="button" className="cert-text-button" key={i} onClick={() => onChange({ ...person, certificateName: titleCase(original), nameConfirmed: false })}>Usar original {i === 0 && person.originalForm ? 'Forms' : 'Teams'}</button>)}<label>Palabras iniciales a mover<select value={rotateCount} onChange={(e) => setRotateCount(Number(e.target.value))}>{[1, 2, 3, 4].map((n) => <option key={n}>{n}</option>)}</select></label><button type="button" className="button button-light" onClick={() => { const words = clean(person.certificateName).split(' '); if (words.length > rotateCount) onChange({ ...person, certificateName: [...words.slice(rotateCount), ...words.slice(0, rotateCount)].join(' '), nameConfirmed: false }) }}><RotateCw size={14} /> Mover al final</button></div>
      <label className="cert-checkbox cert-full"><input type="checkbox" checked={person.nameConfirmed} onChange={(e) => update('nameConfirmed', e.target.checked)} /> Revisé el nombre, su orden y ortografía.</label>
      <label>Tipo de certificado<select value={person.role} onChange={(e) => update('role', e.target.value)}>{Object.entries(ROLE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label className="cert-checkbox"><input type="checkbox" checked={person.include} onChange={(e) => update('include', e.target.checked)} /> Incluir si cumple los requisitos</label>
      <label className="cert-full">Observaciones<textarea rows={2} value={person.notes || ''} onChange={(e) => update('notes', e.target.value)} /></label>
    </div>
    <div className="cert-originals"><p><strong>Teams:</strong> {person.originalTeams || 'Sin registro'} {person.teamsRole && `· ${person.teamsRole}`}</p><p><strong>Forms:</strong> {person.originalForm || 'Sin registro vinculado'}</p><p><strong>Evaluación:</strong> {person.evaluation.label} · {formatDuration(person.evaluation.seconds)} dentro del tramo · {person.evaluation.percentage?.toFixed(2) || '0.00'} %</p><p><strong>Total reportado en Teams:</strong> {formatDuration(person.evaluation.totalSeconds)}</p></div>
    {person.snapshot ? <p className="cert-help">Acreedor recuperado de Firebase. Para revisar vínculos o recalcular otro tramo, vuelve a cargar los archivos originales.</p> : <>
      <label className="cert-field">Inscripción de Forms vinculada<select value={person.registration?.id || ''} onChange={(e) => onLink(registrations.find((r) => r.id === e.target.value) || null)}><option value="">Sin vincular</option>{registrations.map((r) => <option key={r.id} value={r.id} disabled={used.has(r.id)}>{person.candidateIds?.includes(r.id) ? '★ Sugerencia · ' : ''}{r.name} · {r.emails[0] || 'sin correo'}{used.has(r.id) ? ' (ya vinculada)' : ''}</option>)}</select></label>
      <p className="cert-help">Una sugerencia por nombre requiere tu confirmación. Un correo diferente no se corrige automáticamente.</p>
      <div className="cert-merge"><label>Otro registro de la misma persona<select value={mergeId} onChange={(e) => setMergeId(e.target.value)}><option value="">Seleccionar para fusionar…</option>{people.filter((p) => p.id !== person.id && !p.snapshot).map((p) => <option key={p.id} value={p.id}>{p.certificateName} · {p.originalTeams ? 'Teams' : 'Forms'}</option>)}</select></label><button type="button" className="button button-ghost" disabled={!mergeId} onClick={() => { onMerge(mergeId); setMergeId('') }}><Merge size={15} /> Fusionar en este registro</button></div>
    </>}
    {person.registration?.consentIssue && <div className="message cert-warning"><p>Forms contiene una respuesta negativa o contradictoria de autorización. Revisa el registro original y documenta la resolución en observaciones.</p><label className="cert-checkbox"><input type="checkbox" checked={person.consentReviewed} onChange={(e) => update('consentReviewed', e.target.checked)} /> He revisado y resuelto esta observación.</label></div>}
    <button type="button" className="button button-primary" disabled={!person.evaluation.eligible} onClick={onPreview}><Eye size={16} /> Vista previa de su certificado</button>
  </section>
}

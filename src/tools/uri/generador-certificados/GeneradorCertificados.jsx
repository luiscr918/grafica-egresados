import { useEffect, useMemo, useRef, useState } from 'react'
import { browserLocalPersistence, onAuthStateChanged, setPersistence, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { Award, CheckCheck, Download, Eye, FilePlus2, FileSpreadsheet, FolderOpen, LogOut, RefreshCw, Save, Search, Trash2, UserPlus, X } from 'lucide-react'
import { auth, allowedUid } from '../../../lib/firebase'
import { confirmAction, notifyError, notifySuccess } from '../../usegbe/graficos-egresados/lib/alerts'
import { blankEvent, clean, createSnapshot, DEFAULT_TEXTS, evaluatedRoster, formatDuration, normalize, ROLE_LABELS } from './lib/model.js'
import { addPerson, buildRoster, linkRegistration, mergePeople, organizerPerson } from './lib/roster.js'
import { deleteCertificateEvent, listCertificateEvents, saveCertificateEvent } from './lib/firestore.js'
import EventSettings from './EventSettings'
import ImportPanel from './ImportPanel'
import PersonReview from './PersonReview'
import ReviewRequirements from './ReviewRequirements'
import CertificateDesigner from './CertificateDesigner'
import './certificates.css'

const STEPS = ['Evento', 'Archivos', 'Revisión', 'Certificados']
const friendlyError = (error) => error.code === 'permission-denied' ? 'Firebase no permite acceder a certificateEvents con esta cuenta. Revisa las reglas de Firestore indicadas en docs/FIREBASE_CERTIFICADOS.md. El trabajo actual sigue disponible en esta pantalla.' : error.message

export default function GeneradorCertificados() {
  const [user, setUser] = useState(undefined)
  useEffect(() => onAuthStateChanged(auth, (current) => setUser(current || null)), [])
  if (user === undefined) return <main className="workspace route-loading">Comprobando sesión…</main>
  if (!user || user.uid !== allowedUid) return <CertificateLogin user={user} />
  return <CertificateWorkspace key={user.uid} user={user} />
}

function CertificateLogin({ user }) {
  const [email, setEmail] = useState(''), [password, setPassword] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false)
  async function submit(e) {
    e.preventDefault(); setBusy(true); setError('')
    try { await setPersistence(auth, browserLocalPersistence); await signInWithEmailAndPassword(auth, email, password) }
    catch (issue) { setError(issue.code === 'auth/invalid-credential' ? 'Correo o contraseña incorrectos.' : issue.message) }
    finally { setBusy(false) }
  }
  return <main className="workspace login-workspace"><div className="login-card"><p className="eyebrow">URI / Relaciones interinstitucionales</p><h1>Certificados de clases magistrales</h1><p>Accede con la misma cuenta autorizada que utilizas para tus informes.</p>{user ? <><p className="message message-error">La cuenta {user.email} no está autorizada para esta herramienta.</p><button type="button" className="button button-ghost" onClick={() => signOut(auth)}>Cambiar de cuenta</button></> : <form onSubmit={submit}><label><span>Correo electrónico</span><input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} /></label><label><span>Contraseña</span><input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>{error && <p className="message message-error" role="alert">{error}</p>}<button className="button button-primary" disabled={busy}>{busy ? 'Ingresando…' : 'Iniciar sesión'}</button></form>}</div></main>
}

export function CertificateWorkspace({ user }) {
  const [event, setEvent] = useState(blankEvent)
  const [people, setPeople] = useState(() => [organizerPerson(blankEvent().organizerName)])
  const [sources, setSources] = useState({ forms: null, teams: null })
  const [sourceInfo, setSourceInfo] = useState({})
  const [savedId, setSavedId] = useState(null), [savedEvents, setSavedEvents] = useState([])
  const [listError, setListError] = useState(''), [loadingList, setLoadingList] = useState(false), [reloadList, setReloadList] = useState(0)
  const [dirty, setDirty] = useState(false), [revision, setRevision] = useState(0), [session, setSession] = useState(0)
  const [step, setStep] = useState(0), [filter, setFilter] = useState('all'), [search, setSearch] = useState(''), [selectedId, setSelectedId] = useState(null)
  const [busy, setBusy] = useState(''), [preview, setPreview] = useState(null), [outputId, setOutputId] = useState('all')
  const lock = useRef(false)
  const roster = useMemo(() => evaluatedRoster(people, event), [people, event])
  const ready = roster.filter((p) => p.evaluation.eligible)
  const selected = roster.find((p) => p.id === selectedId)
  const registrations = sources.forms?.registrations || []
  const visible = roster.filter((p) => {
    const matches = filter === 'all' || filter === 'ready' && p.evaluation.eligible || filter === 'pending' && !p.evaluation.eligible || p.role === filter
    return matches && normalize([p.certificateName, p.originalTeams, p.originalForm, ...(p.registration?.emails || [])].join(' ')).includes(normalize(search))
  })

  useEffect(() => {
    let active = true
    setLoadingList(true); setListError('')
    listCertificateEvents(user.uid).then((items) => { if (active) setSavedEvents(items) }).catch((error) => { if (active) setListError(friendlyError(error)) }).finally(() => { if (active) setLoadingList(false) })
    return () => { active = false }
  }, [user.uid, reloadList])
  useEffect(() => {
    if (!dirty) return
    const preventLoss = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', preventLoss)
    return () => window.removeEventListener('beforeunload', preventLoss)
  }, [dirty])
  useEffect(() => () => { if (preview?.url) URL.revokeObjectURL(preview.url) }, [preview?.url])

  const changed = () => { setDirty(true); setRevision((value) => value + 1) }
  function changeEvent(next) {
    if (next.organizerName !== event.organizerName) setPeople((current) => current.map((p) => p.id === 'organizer' ? { ...p, certificateName: next.organizerName, nameConfirmed: true } : p))
    setEvent(next); changed()
  }
  function changePerson(next) { setPeople((current) => current.map((p) => p.id === next.id ? next : p)); changed() }
  async function run(label, action) {
    if (lock.current) return
    lock.current = true; setBusy(label)
    try { await action() } catch (error) { notifyError('No se pudo completar la acción', friendlyError(error)) }
    finally { lock.current = false; setBusy('') }
  }
  async function discardIfNeeded() { return !dirty || (await confirmAction('¿Cambiar de expediente?', 'Hay cambios locales. Los registros pendientes y archivos originales no se guardan en Firebase; al cambiar de expediente se descartarán.', 'Continuar')).isConfirmed }

  function reset() {
    const empty = blankEvent()
    setEvent(empty); setPeople([organizerPerson(empty.organizerName)]); setSavedId(null); setSources({ forms: null, teams: null }); setSourceInfo({})
    setDirty(false); setRevision((n) => n + 1); setSession((n) => n + 1); setStep(0); setSelectedId(null); setPreview(null); setOutputId('all'); setSearch(''); setFilter('all')
  }
  async function openSaved(item) {
    await run('Abriendo evento…', async () => {
      if (!await discardIfNeeded()) return
      if (item.schemaVersion !== 1 || !item.event || !Array.isArray(item.recipients)) throw new Error('Este expediente no tiene un formato compatible.')
      setEvent(item.event); setPeople(item.recipients); setSavedId(item.id); setSources({ forms: null, teams: null }); setSourceInfo(item.sourceInfo || {})
      setDirty(false); setRevision((n) => n + 1); setSession((n) => n + 1); setStep(2); setSelectedId(null); setPreview(null); setOutputId('all'); setSearch(''); setFilter('all')
    })
  }
  async function applySource(type, parsed, filename) {
    await run('Aplicando archivo…', async () => {
      const hasReview = people.some((p) => p.id !== 'organizer' && (p.nameConfirmed || p.notes || p.matchMethod?.includes('manual')))
      if ((hasReview || savedId) && !(await confirmAction('¿Reconstruir la revisión?', 'Se reemplazará la revisión actual por los cruces de los archivos cargados en esta sesión. Se conservarán los datos y textos del evento. Los nombres y vínculos deberán revisarse de nuevo.', 'Reconstruir')).isConfirmed) return
      const next = { ...sources, [type]: parsed }
      const updatedEvent = type === 'teams' ? { ...event, title: event.title || parsed.suggestion.title.replace(/^Clase Magistral\s*[-–:]\s*/i, ''), date: event.date || parsed.suggestion.date, startTime: event.startTime || parsed.suggestion.startTime, endTime: event.endTime || parsed.suggestion.endTime, windowConfirmed: false } : event
      const info = {
        formsName: type === 'forms' ? filename : sourceInfo.formsName && sources.forms ? sourceInfo.formsName : '',
        teamsName: type === 'teams' ? filename : sourceInfo.teamsName && sources.teams ? sourceInfo.teamsName : '',
        formsRows: next.forms?.responseCount || 0, uniqueRegistrations: next.forms?.registrations.length || 0, duplicates: next.forms?.duplicates || 0, teamPeople: next.teams?.people.length || 0,
      }
      setSources(next); setSourceInfo(info); setEvent(updatedEvent); setPeople(buildRoster(next.forms, next.teams, updatedEvent.organizerName)); setSelectedId(null); setPreview(null); changed()
      notifySuccess(`${type === 'forms' ? 'Forms' : 'Teams'} importado. Revisa los cruces y nombres.`)
    })
  }
  async function save() {
    await run('Guardando evento en Firebase…', async () => {
      const payload = { ...createSnapshot(event, people), sourceInfo }
      const id = await saveCertificateEvent(user.uid, savedId, payload)
      setSavedId(id); setSavedEvents((current) => [{ id, ...payload }, ...current.filter((item) => item.id !== id)]); setDirty(false); setListError('')
      notifySuccess(`Evento y ${payload.recipients.length} acreedores guardados`)
    })
  }
  async function removeSaved(item) {
    await run('Eliminando evento…', async () => {
      if (!(await confirmAction('¿Eliminar el evento guardado?', `Se eliminarán «${item.event.title}» y su lista de acreedores de Firebase. Los PDF que descargaste en tu PC se conservan.`, 'Eliminar')).isConfirmed) return
      await deleteCertificateEvent(user.uid, item.id)
      setSavedEvents((current) => current.filter((entry) => entry.id !== item.id))
      if (savedId === item.id) { setSavedId(null); setDirty(true) }
      notifySuccess('Expediente eliminado de Firebase')
    })
  }
  async function previewPeople(targets) {
    await run('Preparando vista previa…', async () => {
      const { generateCertificates } = await import('./lib/certificates.js')
      const bytes = await generateCertificates(event, targets)
      setPreview({ url: URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' })), revision })
      setStep(3)
    })
  }
  function outputPeople() { return outputId === 'all' ? ready : ready.filter((p) => p.id === outputId) }
  function download(format) { return run('Generando certificados…', async () => { const { downloadCertificates } = await import('./lib/certificates.js'); await downloadCertificates(event, outputPeople(), format, { onProgress: (n, total) => setBusy(`Generando certificado ${n} de ${total}…`) }) }) }
  function exportExcel() { return run('Preparando informe Excel…', async () => { const { downloadReport } = await import('./lib/exportReport.js'); downloadReport(event, people, sourceInfo) }) }

  return <main className="workspace cert-workspace">
    <header className="cert-title"><div><p className="eyebrow">URI / Relaciones interinstitucionales</p><h1>Certificados de clases magistrales</h1><p>De la inscripción y asistencia al certificado, con revisión de nombres y roles.</p></div><div className="activity-user"><span>{user.email}</span><button type="button" className="button button-ghost" disabled={Boolean(busy)} onClick={() => run('Cerrando sesión…', async () => { if (await discardIfNeeded()) await signOut(auth) })}><LogOut size={15} /> Salir</button></div></header>
    <fieldset className="cert-workspace-fieldset" disabled={Boolean(busy)}>
      <div className="cert-layout">
        <aside className="cert-sidebar">
          <div className="cert-panel-heading"><FolderOpen size={20} /><div><h2>Mis eventos</h2><p>{loadingList ? 'Consultando Firebase…' : `${savedEvents.length} guardados`}</p></div></div>
          <button type="button" className="button button-primary cert-wide" onClick={() => run('Creando evento…', async () => { if (await discardIfNeeded()) reset() })}><FilePlus2 size={16} /> Nuevo evento</button>
          {listError && <div className="message message-error" role="alert">{listError}<button type="button" className="cert-text-button" onClick={() => setReloadList((n) => n + 1)}>Reintentar</button></div>}
          <div className="cert-event-list">{savedEvents.map((item) => <article key={item.id} className={`cert-event-item ${savedId === item.id ? 'active' : ''}`}><button type="button" className="cert-event-open" onClick={() => openSaved(item)}><strong>{item.event?.title || 'Evento'}</strong><span>{item.event?.date} · {item.recipients?.length || 0} acreedores</span><small>{item.event?.institution}</small></button><button type="button" className="cert-text-button cert-delete" onClick={() => removeSaved(item)} aria-label={`Eliminar evento ${item.event?.title}`}><Trash2 size={13} /> Eliminar</button></article>)}</div>
          <p className="cert-help">Firebase conserva los datos del evento y los acreedores aprobados. Los PDF se descargan en tu PC.</p>
        </aside>
        <div className="cert-main">
          <nav className="cert-steps" aria-label="Etapas de certificación">{STEPS.map((label, i) => <button type="button" key={label} aria-current={step === i ? 'step' : undefined} className={step === i ? 'active' : ''} onClick={() => setStep(i)}><span>{i + 1}</span>{label}</button>)}</nav>
          {people.some((p) => p.snapshot) && <div className="message message-info">Expediente recuperado: contiene únicamente los acreedores guardados. Puedes corregir textos y regenerar sus PDF. Para reevaluar asistencia o agregar otros participantes, importa de nuevo Forms y Teams.</div>}
          <section className="cert-panel certificate-step" hidden={step !== 0}><EventSettings event={event} onChange={changeEvent} suggestion={sources.teams?.suggestion} onSuggestion={() => changeEvent({ ...event, date: sources.teams.suggestion.date, startTime: sources.teams.suggestion.startTime, endTime: sources.teams.suggestion.endTime, windowConfirmed: false })} /></section>
          <section className="cert-panel certificate-step" hidden={step !== 1}>
            <div className="cert-panel-heading"><FileSpreadsheet size={22} /><div><h2>Archivos de inscripción y asistencia</h2><p>Los archivos originales se procesan en esta sesión. Aplica ambos antes de corregir nombres y resolver los vínculos.</p></div></div>
            <div className="cert-import-grid"><ImportPanel key={`forms-${session}`} type="forms" disabled={Boolean(busy)} currentName={sourceInfo.formsName} onApply={applySource} /><ImportPanel key={`teams-${session}`} type="teams" disabled={Boolean(busy)} currentName={sourceInfo.teamsName} onApply={applySource} /></div>
            <div className="cert-stat-grid"><div><strong>{sourceInfo.formsRows || 0}</strong><span>Respuestas Forms</span></div><div><strong>{sourceInfo.uniqueRegistrations || 0}</strong><span>Inscripciones únicas</span></div><div><strong>{sourceInfo.duplicates || 0}</strong><span>Duplicados consolidados</span></div><div><strong>{sourceInfo.teamPeople || 0}</strong><span>Registros Teams</span></div></div>
            {[...(sources.forms?.warnings || []), ...(sources.teams?.warnings || [])].map((warning, i) => <p className="message cert-warning" key={i}>{warning}</p>)}
            {sources.teams?.suggestion && <p className="message message-info">Se propone el tramo de <strong>{sources.teams.suggestion.reference}</strong>. Revísalo y confírmalo en «Evento»; la duración total de Teams puede incluir tiempo ajeno a la clase.</p>}
          </section>
          <section className="cert-panel certificate-step" hidden={step !== 2}>
            <div className="cert-panel-heading"><Award size={22} /><div><h2>Revisión de acreedores</h2><p>Organizadora y ponentes confirmados están exentos. Los participantes necesitan Forms y asistencia suficiente.</p></div><button type="button" className="button button-light" onClick={() => { const p = addPerson(); setPeople((current) => [...current, p]); setSelectedId(p.id); changed() }}><UserPlus size={15} /> Agregar ponente</button></div>
            <div className="cert-stat-grid"><div><strong>{ready.length}</strong><span>Listos para certificar</span></div><div><strong>{ready.filter((p) => p.role === 'participant').length}</strong><span>Participantes aptos</span></div><div><strong>{ready.filter((p) => p.evaluation.code === 'tolerance').length}</strong><span>Con tolerancia</span></div><div><strong>{roster.length - ready.length}</strong><span>Pendientes / no aptos</span></div></div>
            <ReviewRequirements event={event} people={roster} onConfirmWindow={() => changeEvent({ ...event, windowConfirmed: true })} onEditWindow={() => setStep(0)} />
            <div className="cert-review-tools"><label className="cert-search"><Search size={16} /><input aria-label="Buscar personas" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar nombre o correo…" /></label><select aria-label="Filtrar revisión" value={filter} onChange={(e) => setFilter(e.target.value)}><option value="all">Todos los registros</option><option value="ready">Listos para certificar</option><option value="pending">Pendientes / no aptos</option>{Object.entries(ROLE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><button type="button" className="button button-ghost" onClick={() => { const ids = new Set(visible.filter((p) => clean(p.certificateName)).map((p) => p.id)); setPeople((current) => current.map((p) => ids.has(p.id) ? { ...p, nameConfirmed: true } : p)); changed() }}><CheckCheck size={15} /> Marcar nombres visibles como revisados</button></div>
            <p className="cert-help">Los nombres son propuestas: revisa el orden y la ortografía. Seleccionar y revisar el nombre son acciones distintas. Desmarcar una persona la excluye del certificado, pero conserva sus tiempos visibles.</p>
            <div className="cert-table-scroll"><table className="cert-roster-table"><thead><tr><th>Seleccionar</th><th>Nombre para certificado</th><th>Nombre revisado</th><th>Rol</th><th>Dentro de la clase</th><th>Resultado</th><th>Revisar</th></tr></thead><tbody>{visible.map((p) => <tr key={p.id} className={selectedId === p.id ? 'selected' : ''}><td><input aria-label={`Seleccionar ${p.certificateName}`} type="checkbox" checked={p.include} onChange={(e) => changePerson({ ...p, include: e.target.checked })} /></td><td><strong>{p.certificateName || 'Sin nombre'}</strong><small>{p.registration ? 'Forms vinculado' : ['organizer', 'speaker'].includes(p.role) ? 'Exento de Forms' : 'Sin Forms vinculado'} · {p.nameConfirmed ? 'Nombre revisado' : 'Revisar nombre'}</small></td><td><input aria-label={`Nombre revisado de ${p.certificateName}`} type="checkbox" checked={p.nameConfirmed} disabled={!clean(p.certificateName)} onChange={(e) => changePerson({ ...p, nameConfirmed: e.target.checked })} /></td><td><select aria-label={`Rol de ${p.certificateName}`} value={p.role} onChange={(e) => changePerson({ ...p, role: e.target.value })}>{Object.entries(ROLE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></td><td>{formatDuration(p.evaluation.seconds)}<small>{p.evaluation.percentage?.toFixed(2) || '0.00'} %</small></td><td><span className={`cert-status ${p.evaluation.eligible ? 'ready' : p.evaluation.code === 'attendance' || p.evaluation.code === 'absent' || p.evaluation.code === 'excluded' ? 'muted' : 'review'}`}>{p.evaluation.label}</span></td><td><button type="button" className="button button-light" onClick={() => setSelectedId(p.id)}>Revisar</button></td></tr>)}</tbody></table>{!visible.length && <p className="cert-empty">No hay personas con este filtro.</p>}</div>
            {selected && <PersonReview key={selected.id} person={selected} people={roster} registrations={registrations} onChange={changePerson} onLink={(registration) => { try { setPeople(linkRegistration(people, selected.id, registration)); changed() } catch (error) { notifyError('No se pudo vincular', error.message) } }} onMerge={(sourceId) => run('Fusionando registros…', async () => { const source = people.find((p) => p.id === sourceId); if (!(await confirmAction('¿Son la misma persona?', `Se unirán las conexiones de «${source?.certificateName}» en «${selected.certificateName}», sin contar tiempo superpuesto dos veces.`, 'Fusionar')).isConfirmed) return; setPeople(mergePeople(people, selected.id, sourceId)); changed() })} onPreview={() => { setOutputId(selected.id); previewPeople([selected]) }} onClose={() => setSelectedId(null)} />}
          </section>
          <section className="cert-panel certificate-step" hidden={step !== 3}>
            <div className="cert-panel-heading"><Award size={22} /><div><h2>Redacción, firmantes y certificados</h2><p>Se utiliza el mismo PDF para la vista previa y las descargas. Los textos se ajustan sin recortar nombres ni instituciones.</p></div></div>
            {roster.some((p) => p.include && p.role !== 'excluded' && !p.evaluation.eligible) && <div className="message cert-warning">Solo aparecen en la descarga los {ready.length} acreedores listos. Hay personas seleccionadas pendientes de horario, nombre, rol u otros requisitos. <button type="button" className="cert-text-button" onClick={() => setStep(2)}>Resolver pendientes en Revisión</button></div>}
            <details className="cert-design-options"><summary>Editar firmantes y cargos</summary><p className="cert-help">Datos comunes del evento. En Cargo, pulsa Enter donde quieras iniciar otra línea; se respeta en la vista previa y el PDF. Si personalizaste el texto de una firma en el editor visual, ese texto tiene prioridad: edítalo allí o restaura el elemento para volver a estos datos.</p><div className="cert-signers">{event.signers.map((signer, i) => <div key={i}><h3>{['Autoridad ITSQMET', 'Coordinación URI', 'Representante del convenio'][i]}</h3><label>Nombre<input value={signer.name} onChange={(e) => changeEvent({ ...event, signers: event.signers.map((s, j) => i === j ? { ...s, name: e.target.value } : s) })} /></label><label>Cargo<textarea rows={2} value={signer.title} onChange={(e) => changeEvent({ ...event, signers: event.signers.map((s, j) => i === j ? { ...s, title: e.target.value } : s) })} /></label></div>)}</div></details>
            <details className="cert-design-options"><summary>Editar redacción de los tres modelos</summary><p className="cert-help">Campos disponibles: {'{tema}, {institucion}, {horas}, {enfoque}, {modalidad}, {fecha}'}. Usa **texto** para negrita y una línea vacía para separar párrafos.</p>{['organizer', 'speaker', 'participant'].map((role) => <div className="cert-template-field" key={role}><label>{ROLE_LABELS[role]}<textarea rows={7} value={event.texts[role]} onChange={(e) => changeEvent({ ...event, texts: { ...event.texts, [role]: e.target.value } })} /></label><button type="button" className="cert-text-button" onClick={() => changeEvent({ ...event, texts: { ...event.texts, [role]: DEFAULT_TEXTS[role] } })}><RefreshCw size={13} /> Restaurar redacción de este modelo</button></div>)}</details>
            <div className="cert-output-tools"><label>Certificados a generar<select value={outputId} onChange={(e) => setOutputId(e.target.value)}><option value="all">Todos los acreedores listos ({ready.length})</option>{ready.map((p) => <option key={p.id} value={p.id}>{p.certificateName} · {ROLE_LABELS[p.role]}</option>)}</select></label><div className="cert-button-row"><button type="button" className="button button-primary" disabled={!outputPeople().length} onClick={() => previewPeople(outputPeople())}><Eye size={16} /> Vista previa PDF</button><button type="button" className="button button-light" disabled={!outputPeople().length} onClick={() => download('pdf')}><Download size={16} /> Descargar PDF</button><button type="button" className="button button-ghost" disabled={!outputPeople().length} onClick={() => download('zip')}><Download size={16} /> PDF individuales en ZIP</button></div></div>
            {step === 3 && <CertificateDesigner event={event} people={ready} onChange={changeEvent} disabled={Boolean(busy)} />}
            {!ready.length && <p className="message message-info">Revisa los nombres y roles en «Revisión» para habilitar la emisión.</p>}
            {preview && <div className="cert-pdf-preview"><div><strong>Vista previa del PDF</strong><button type="button" className="icon-button" aria-label="Cerrar vista previa" onClick={() => setPreview(null)}><X size={17} /></button></div>{preview.revision !== revision ? <p className="message cert-warning">El evento o los acreedores cambiaron. Genera otra vista previa para mostrar la versión actual.</p> : <iframe title="Vista previa de certificados URI" src={preview.url} />}</div>}
          </section>
          <div className="cert-bottom-actions"><div><span className={`cert-save-indicator ${dirty ? 'dirty' : ''}`}>{dirty ? 'Cambios sin guardar' : savedId ? 'Expediente guardado' : 'Evento nuevo'}</span><p>Se guardarán {ready.length} acreedores listos. Los registros no aptos o pendientes y los archivos originales no se guardan.</p></div><div className="cert-button-row"><button type="button" className="button button-ghost" onClick={exportExcel}><FileSpreadsheet size={16} /> Informe Excel</button><button type="button" className="button button-primary" onClick={save}><Save size={16} /> Guardar evento y acreedores</button></div></div>
          <div className="cert-step-navigation"><button type="button" className="button button-ghost" disabled={step === 0} onClick={() => setStep((n) => n - 1)}>Anterior</button><button type="button" className="button button-light" disabled={step === 3} onClick={() => setStep((n) => n + 1)}>Siguiente: {STEPS[step + 1] || 'Certificados'}</button></div>
        </div>
      </div>
    </fieldset>
    {busy && <div className="cert-busy" role="status" aria-live="polite"><span className="cert-spinner" />{busy}</div>}
  </main>
}

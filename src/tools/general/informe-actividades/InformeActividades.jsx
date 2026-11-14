import { useEffect, useRef, useState } from 'react'
import { browserLocalPersistence, createUserWithEmailAndPassword, onAuthStateChanged, setPersistence, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { Eye, FileDown, FileJson, FilePlus2, FileText, LogOut, Save, Sparkles, Trash2, Upload, X } from 'lucide-react'
import { auth, allowedUid } from '../../../lib/firebase'
import { confirmAction, notifyError, notifyInfo, notifySuccess } from '../../usegbe/graficos-egresados/lib/alerts'
import { createReport, listReports, removeReport, saveReport } from './lib/firestore'
import { importTrelloReport, validateTrelloPeriod } from './lib/trello'
import { downloadActivityReport } from './lib/generateReportDocx'
import { inferArea, inferCategory, refineActivity } from './lib/rewriteActivity'
import ReportPreview from './ReportPreview'

const blankReport = () => ({ title: 'Informe mensual de actividades', startDate: '', endDate: '', schedule: 'De lunes a viernes de 8h00 a 17h00.', evidence: '', activities: [] })

export default function InformeActividades() {
  const [user, setUser] = useState(undefined)
  const [authError, setAuthError] = useState('')
  const [reports, setReports] = useState([])
  const [report, setReport] = useState(blankReport())
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const reportRef = useRef(report)

  useEffect(() => { reportRef.current = report }, [report])
  useEffect(() => onAuthStateChanged(auth, (currentUser) => setUser(currentUser || null)), [])
  useEffect(() => { if (!user || user.uid !== allowedUid) return; setLoading(true); listReports(user.uid).then(setReports).catch((error) => setAuthError(error.message)).finally(() => setLoading(false)) }, [user])

  if (user === undefined) return <main className="workspace route-loading">Comprobando sesión...</main>
  if (!user || user.uid !== allowedUid) return <LoginScreen user={user} onError={setAuthError} error={authError} />

  function update(key, value) { setReport((current) => ({ ...current, [key]: value })) }
  function updateActivity(id, key, value) { setReport((current) => ({ ...current, activities: current.activities.map((item) => item.id === id ? { ...item, [key]: value } : item) })) }
  function addActivity() { const id = `manual-${Date.now()}`; setReport((current) => ({ ...current, activities: [{ id, source: 'Manual', area: '', category: '', original: '', refined: '', date: '', status: 'realizada', include: true, evidence: '', notes: '' }, ...current.activities] })) }
  function removeActivity(id) { setReport((current) => ({ ...current, activities: current.activities.filter((item) => item.id !== id) })) }
  async function importTrello(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setImporting(true)
    try {
      validateTrelloPeriod(reportRef.current)
      const target = reportRef.current
      const raw = await file.text()
      const current = reportRef.current
      if (target !== current) throw new Error('El borrador cambió mientras se leía el archivo. Vuelve a importar sobre el informe y período que deseas completar.')
      const { activities, summary } = importTrelloReport(raw, current)
      setReport({ ...current, activities })
      setImportResult({ report: current, activities, summary })
      notifySuccess('Importación de Trello completada')
    } catch (error) { notifyError('No se pudo importar Trello', error.message) }
    finally { setImporting(false) }
  }
  async function saveCurrent() { setSaving(true); try { const payload = { ...report }; delete payload.id; if (report.id) await saveReport(user.uid, { ...payload, id: report.id }); else { const id = await createReport(user.uid, payload); payload.id = id } setReport(payload); setReports(await listReports(user.uid)); notifySuccess('Informe guardado en Firebase') } catch (error) { notifyError('No se pudo guardar', error.message) } finally { setSaving(false) } }
  function exportJson() { const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'bitacora-informe.json'; link.click(); URL.revokeObjectURL(url) }
  async function importJson(event) { const file = event.target.files?.[0]; event.target.value = ''; if (!file) return; try { const imported = JSON.parse(await file.text()); setReport({ ...blankReport(), ...imported, id: undefined }); notifySuccess('Borrador cargado') } catch (error) { notifyError('JSON inválido', error.message) } }
  async function deleteCurrent() { if (!report.id) return setReport(blankReport()); const result = await confirmAction('¿Eliminar este informe?', 'Se eliminará de Firebase.', 'Eliminar'); if (!result.isConfirmed) return; await removeReport(user.uid, report.id); setReports(await listReports(user.uid)); setReport(blankReport()); notifyInfo('Informe eliminado') }

  return <main className="workspace activity-workspace">
    <div className="activity-title"><div><p className="eyebrow">Gestión institucional / Bitácora</p><h1>Informe mensual de actividades</h1><p>Registra durante la semana, importa Trello y prepara un informe consolidado para las tres unidades.</p></div><div className="activity-user"><span>{user.email}</span><button className="button button-ghost" onClick={() => signOut(auth)}><LogOut size={15} /> Salir</button></div></div>
    <div className="activity-toolbar"><label className="button button-light"><Upload size={15} /> {importing ? 'Importando Trello...' : 'Importar Trello'}<input type="file" accept=".json,application/json" hidden disabled={importing} onChange={importTrello} /></label><label className="button button-light"><FileJson size={15} /> Cargar JSON<input type="file" accept=".json,application/json" hidden onChange={importJson} /></label><button className="button button-ghost" onClick={exportJson}><FileJson size={15} /> Respaldar JSON</button></div>
    <p className="trello-import-help">Define el período antes de importar: solo se incorporan tarjetas dentro del rango, incluidos ambos días. Se usa su fecha de vencimiento o, si no existe, su última actividad. Puedes reimportar cada semana: se reconoce cada tarjeta por su identificador y se conservan tus correcciones.</p>
    {importResult && report.activities === importResult.activities && <p className="trello-import-help" role="status">Última importación: {importResult.summary.added} nuevas; {importResult.summary.existing} ya registradas (sin duplicar); {importResult.summary.outsidePeriod} fuera del período; {importResult.summary.withoutDate} sin fecha válida.{importResult.summary.existingDuplicates > 0 && ` Se quitaron ${importResult.summary.existingDuplicates} duplicados anteriores, conservando la primera copia.`}</p>}
    <div className="activity-layout"><aside className="activity-sidebar"><div className="panel-title"><FileText size={18} /><div><h2>Mis informes</h2><p>{loading ? 'Cargando...' : `${reports.length} guardado${reports.length === 1 ? '' : 's'}`}</p></div></div><button className="new-report" onClick={() => setReport(blankReport())}><FilePlus2 size={15} /> Nuevo informe</button>{reports.map((item) => <button className={`report-item ${item.id === report.id ? 'active' : ''}`} key={item.id} onClick={() => setReport(item)}><strong>{item.title || 'Informe mensual'}</strong><span>{item.startDate || 'Sin fecha'} - {item.endDate || 'sin fecha'}</span><small>{item.activities?.filter((activity) => activity.include).length || 0} actividades</small></button>)}</aside>
      <section className="activity-main"><div className="activity-panel report-settings"><div className="panel-title"><FileText size={18} /><div><h2>Datos del período</h2><p>Las fechas organizan la bitácora, pero no aparecen como fecha individual en el informe.</p></div></div><div className="activity-fields"><label><span>Título</span><input value={report.title || ''} onChange={(event) => update('title', event.target.value)} /></label><label><span>Horario de trabajo</span><input value={report.schedule || ''} onChange={(event) => update('schedule', event.target.value)} /></label><label><span>Fecha inicial</span><input type="date" value={report.startDate || ''} onChange={(event) => update('startDate', event.target.value)} /></label><label><span>Fecha final</span><input type="date" value={report.endDate || ''} onChange={(event) => update('endDate', event.target.value)} /></label><label className="full"><span>Soporte de trabajo / evidencias</span><textarea value={report.evidence || ''} onChange={(event) => update('evidence', event.target.value)} placeholder="Correo, OneDrive, SharePoint, enlaces o indicaciones generales" /></label></div></div>
        <div className="activity-panel"><div className="activities-heading"><div className="panel-title"><Sparkles size={18} /><div><h2>Actividades registradas</h2><p>Revisa la propuesta profesional antes de incluirla.</p></div></div><button className="button button-primary" onClick={addActivity}><FilePlus2 size={15} /> Agregar actividad</button></div><div className="activity-list">{report.activities.length ? report.activities.map((activity) => <ActivityRow key={activity.id} activity={activity} update={updateActivity} remove={removeActivity} />) : <div className="activity-empty">Importa el JSON de Trello o agrega tu primera actividad semanal.</div>}</div></div>
      </section></div>
    <div className="activity-actions"><button className="button button-primary" onClick={saveCurrent} disabled={saving}><Save size={16} /> {saving ? 'Guardando...' : 'Guardar en Firebase'}</button><button className="button button-light" aria-expanded={showPreview} aria-controls="activity-report-preview" onClick={() => setShowPreview((value) => !value)}><Eye size={16} /> {showPreview ? 'Ocultar vista previa' : 'Vista previa'}</button><button className="button button-light" onClick={() => downloadActivityReport(report, 'personal')}><FileDown size={16} /> Descargar mi informe</button><button className="button button-light" onClick={() => downloadActivityReport(report, 'jefatura')}><FileDown size={16} /> Descargar base para jefatura</button><button className="button button-ghost" onClick={deleteCurrent}><Trash2 size={16} /> {report.id ? 'Eliminar informe' : 'Limpiar'}</button></div>
    {showPreview && <ReportPreview report={report} />}
  </main>
}

function ActivityRow({ activity, update, remove }) {
  function originalChange(value) { update(activity.id, 'original', value); update(activity.id, 'refined', refineActivity(value)); if (!activity.area) update(activity.id, 'area', inferArea(value)) ; if (!activity.category) update(activity.id, 'category', inferCategory(value, activity.area || inferArea(value))) }
  return <article className={`activity-row ${activity.include ? '' : 'excluded'}`}><div className="activity-row-top"><label className="include-check"><input type="checkbox" checked={activity.include} onChange={(event) => update(activity.id, 'include', event.target.checked)} /> Incluir</label><span className="activity-source">{activity.source}</span><button className="icon-button" title="Quitar actividad" onClick={() => remove(activity.id)}><X size={15} /></button></div><div className="activity-fields"><label><span>Área</span><select value={activity.area || ''} onChange={(event) => update(activity.id, 'area', event.target.value)}><option value="">Seleccionar</option><option>URI</option><option>UFC</option><option>USEGBE</option></select></label><label><span>Categoría</span><input value={activity.category || ''} onChange={(event) => update(activity.id, 'category', event.target.value)} /></label><label><span>Fecha de referencia</span><input type="date" value={activity.date || ''} onChange={(event) => update(activity.id, 'date', event.target.value)} /></label><label className="full"><span>Texto original</span><textarea value={activity.original || ''} onChange={(event) => originalChange(event.target.value)} /></label><label className="full refined-field"><span>Redacción para el informe</span><textarea value={activity.refined || ''} onChange={(event) => update(activity.id, 'refined', event.target.value)} /></label><label className="full"><span>Evidencia o nota</span><input value={activity.evidence || ''} onChange={(event) => update(activity.id, 'evidence', event.target.value)} placeholder="Opcional" /></label></div></article>
}

function LoginScreen({ user, onError, error }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [register, setRegister] = useState(false)
  const [busy, setBusy] = useState(false)
  async function submit(event) { event.preventDefault(); setBusy(true); onError(''); try { await setPersistence(auth, browserLocalPersistence); if (register) await createUserWithEmailAndPassword(auth, email, password); else await signInWithEmailAndPassword(auth, email, password) } catch (issue) { onError(issue.code === 'auth/invalid-credential' ? 'Correo o contraseña incorrectos.' : issue.message) } finally { setBusy(false) } }
  return <main className="workspace login-workspace"><div className="login-card"><p className="eyebrow">Portal interno ITSQMET</p><h1>Bitácora de actividades</h1><p>Inicia sesión para consultar y guardar tus informes.</p><form onSubmit={submit}><label><span>Correo electrónico</span><input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label><label><span>Contraseña</span><input type="password" required minLength="6" value={password} onChange={(event) => setPassword(event.target.value)} /></label>{error && <div className="message message-error">{error}</div>}<button className="button button-primary" disabled={busy}>{busy ? 'Procesando...' : register ? 'Crear cuenta' : 'Iniciar sesión'}</button></form><button className="login-switch" onClick={() => setRegister((value) => !value)}>{register ? 'Ya tengo una cuenta' : 'Necesito crear una cuenta'}</button>{user && user.uid !== allowedUid && <div className="message message-error">Esta cuenta no tiene autorización para acceder a esta herramienta.</div>}</div></main>
}

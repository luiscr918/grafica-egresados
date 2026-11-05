import { useMemo, useState } from 'react'
import { ArrowLeft, Download, FileSpreadsheet, RefreshCw, Table2, Upload } from 'lucide-react'
import { questions } from './lib/questions'
import { parseExcelFile } from './lib/parseExcel'
import { buildMatrixRows, buildScopes, exportComparisonWorkbook, exportInstitutionalWorkbook, getDefaultIndicator, indicatorCatalog, normalizeComparisonRecords } from './lib/comparison'
import { notifyError, notifySuccess } from './lib/alerts'

export default function ComparativaPeriodos({ onBack }) {
  const [previous, setPrevious] = useState(null)
  const [current, setCurrent] = useState(null)
  const [loading, setLoading] = useState(false)
  const [selectedScope, setSelectedScope] = useState('institucional')
  const [selectedIndicator, setSelectedIndicator] = useState({})

  const previousRecords = previous?.records || []
  const currentRecords = current?.records || []
  const scopes = useMemo(() => buildScopes(previousRecords, currentRecords), [previousRecords, currentRecords])
  const scope = scopes.find((item) => item.key === selectedScope) || scopes[0]
  const rows = scope ? buildMatrixRows(scope.previous, scope.current, selectedIndicator) : []
  const previousLabel = previous?.records?.[0]?.periodoAcademico || previous?.fileName || 'Período anterior'
  const currentLabel = current?.records?.[0]?.periodoAcademico || current?.fileName || 'Período actual'

  async function loadFile(file, setter) {
    if (!file) return
    setLoading(true)
    try {
      const result = await parseExcelFile(file)
      if (result.errors.length) throw new Error(result.errors.join(' '))
      setter({ ...result, records: normalizeComparisonRecords(result.records) })
      setSelectedScope('institucional')
      notifySuccess(`${file.name} cargado correctamente`)
    } catch (error) {
      notifyError('No se pudo leer el Excel', error instanceof Error ? error.message : 'Verifica el formato del archivo.')
    } finally {
      setLoading(false)
    }
  }

  function updateIndicator(key, value) { setSelectedIndicator((currentValue) => ({ ...currentValue, [key]: value })) }

  function exportWorkbook(includeScopes) {
    if (!previousRecords.length || !currentRecords.length) return notifyError('Faltan archivos', 'Carga el período anterior y el período actual antes de exportar.')
    try { if (includeScopes) exportComparisonWorkbook(scopes, previousLabel, currentLabel, selectedIndicator); else exportInstitutionalWorkbook(scopes[0], previousLabel, currentLabel, selectedIndicator); notifySuccess(includeScopes ? 'Matriz detallada descargada' : 'Matriz institucional descargada') } catch (error) { notifyError('No se pudo generar la matriz', error.message) }
  }

  return <main className="app-shell comparison-shell"><header className="hero comparison-hero"><div className="brand-mark">USEGBE <span>· ITSQMET</span></div><div className="hero-content"><p className="eyebrow">Herramienta interna / Comparativa</p><h1>Matriz comparativa de períodos</h1><p className="hero-copy">Compara porcentajes, identifica variaciones y descarga una matriz institucional o desglosada por carrera y modalidad.</p></div><div className="hero-tools"><span className="privacy-note"><Table2 size={16} /> Los archivos se procesan solo en tu navegador</span><button className="guide-button" type="button" onClick={onBack}><ArrowLeft size={16} /> Volver a gráficos</button></div></header>
    <section className="workspace comparison-workspace"><div className="comparison-upload-grid"><PeriodUpload label="Período anterior" description="Ejemplo: octubre 2025 - marzo 2026" file={previous} disabled={loading} onFile={(file) => loadFile(file, setPrevious)} /><PeriodUpload label="Período actual" description="Ejemplo: abril 2026 - septiembre 2026" file={current} disabled={loading} onFile={(file) => loadFile(file, setCurrent)} /></div>{loading && <div className="loading-line">Leyendo y normalizando el archivo...</div>}{previousRecords.length > 0 && currentRecords.length > 0 && <><div className="comparison-summary"><div><strong>{previousRecords.length}</strong><span>respuestas anteriores</span></div><div><strong>{currentRecords.length}</strong><span>respuestas actuales</span></div><div><strong>{scopes.length - 1}</strong><span>grupos carrera · modalidad</span></div></div><div className="comparison-toolbar"><label><span>Ámbito de comparación</span><select value={selectedScope} onChange={(event) => setSelectedScope(event.target.value)}>{scopes.map((item) => <option value={item.key} key={item.key}>{item.label}</option>)}</select></label><div className="comparison-downloads"><button className="button button-primary" onClick={() => exportWorkbook(false)}><Download size={16} /> Descargar institucional</button><button className="button button-light" onClick={() => exportWorkbook(true)}><Download size={16} /> Descargar todas las carreras</button></div></div><div className="comparison-panel"><div className="comparison-panel-heading"><div><p className="eyebrow">Vista previa</p><h2>{scope.label}</h2><p>{previousLabel} vs. {currentLabel}. Las variaciones se expresan en puntos porcentuales.</p></div><button className="button button-ghost" onClick={() => { setPrevious(null); setCurrent(null) }}><RefreshCw size={15} /> Cambiar archivos</button></div><div className="indicator-settings"><strong>Indicadores del catálogo</strong><span>Selecciona el indicador que aparecerá para cada pregunta. El nombre no cambia con los resultados.</span>{questions.map((question) => <label key={question.key}><span>{question.title}</span><select value={selectedIndicator[question.key] || getDefaultIndicator(question.key)} onChange={(event) => updateIndicator(question.key, event.target.value)}>{indicatorCatalog[question.key].map((indicator) => <option value={indicator} key={indicator}>{indicator}</option>)}</select></label>)}</div><div className="comparison-table-wrap"><table className="comparison-table"><thead><tr><th>Pregunta</th><th>Indicador</th><th>Respuesta</th><th>{previousLabel}</th><th>{currentLabel}</th><th>Variación Absoluta</th><th>Variación Relativa</th><th>Tendencia</th><th>Interpretación</th></tr></thead><tbody>{rows.map((row, index) => <tr key={`${row.questionKey}-${row.response}-${index}`}><td>{row.question}</td><td>{row.indicator}</td><td><strong>{row.response}</strong></td><td>{row.previousValue === null ? 'Sin datos' : `${row.previousValue.toFixed(2).replace('.', ',')}%`}</td><td>{row.currentValue === null ? 'Sin datos' : `${row.currentValue.toFixed(2).replace('.', ',')}%`}</td><td>{row.absoluteValue === null ? 'Sin datos' : `${row.absoluteValue.toFixed(2).replace('.', ',')} puntos porcentuales`}</td><td>{row.relativeValue === null ? 'No calculable' : `${(row.relativeValue * 100).toFixed(2).replace('.', ',')}%`}</td><td><span className={`trend-pill ${row.descriptive ? 'trend-descriptive' : `trend-${row.trend.toLowerCase().replace(' ', '-')}`}`}>{row.trend}</span></td><td>{row.interpretation}</td></tr>)}</tbody></table></div></div></>}</section></main>
}

function PeriodUpload({ label, description, file, disabled, onFile }) {
  return <section className={`comparison-upload ${file ? 'loaded' : ''}`}><div className="comparison-upload-icon"><FileSpreadsheet size={22} /></div><div><p className="upload-title">{label}</p><p className="upload-subtitle">{file ? file.fileName : description}</p></div><label className="button button-light"><Upload size={15} /> {file ? 'Reemplazar' : 'Seleccionar Excel'}<input type="file" accept=".xlsx" hidden disabled={disabled} onChange={(event) => { onFile(event.target.files?.[0]); event.target.value = '' }} /></label></section>
}

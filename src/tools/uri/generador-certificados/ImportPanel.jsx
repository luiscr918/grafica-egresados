import { useMemo, useState } from 'react'
import { FileSpreadsheet, Upload } from 'lucide-react'
import { FORM_COLUMNS, formTable, parseForms, parseTeams, readSheets } from './lib/importFiles.js'

export default function ImportPanel({ type, onApply, disabled, currentName }) {
  const [sheets, setSheets] = useState([])
  const [sheetIndex, setSheetIndex] = useState(0)
  const [filename, setFilename] = useState('')
  const [mapping, setMapping] = useState(null)
  const [dateOrder, setDateOrder] = useState('mdy')
  const [reading, setReading] = useState(false)
  const [error, setError] = useState('')
  const rows = sheets[sheetIndex]?.rows || []
  const table = useMemo(() => formTable(rows), [rows])
  const selectedMapping = mapping || table.mapping

  async function openFile(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setReading(true); setError('')
    try {
      const parsed = readSheets(await file.arrayBuffer(), file.name)
      if (!parsed.length) throw new Error('El archivo no contiene hojas.')
      setSheets(parsed); setSheetIndex(0); setFilename(file.name); setMapping(null)
    } catch (issue) { setError(issue.message) }
    finally { setReading(false) }
  }

  async function apply() {
    setError('')
    try {
      const parsed = type === 'forms' ? parseForms(table, selectedMapping) : parseTeams(rows, dateOrder)
      await onApply(type, parsed, filename)
    } catch (issue) { setError(issue.message) }
  }

  return <section className="cert-import-card">
    <div className="cert-panel-heading"><FileSpreadsheet size={21} /><div><h3>{type === 'forms' ? '1. Inscripciones de Forms' : '2. Asistencia de Teams'}</h3><p>{type === 'forms' ? 'Usa el Excel original de respuestas, no la lista ya procesada.' : 'Incluye el resumen, participantes y detalle de actividades de la reunión.'}</p></div></div>
    {currentName && <p className="cert-file-applied">Archivo aplicado: <strong>{currentName}</strong></p>}
    <label className="button button-light"><Upload size={16} /> {reading ? 'Leyendo archivo…' : 'Seleccionar archivo'}<input type="file" hidden accept={type === 'forms' ? '.xlsx,.xls,.csv' : '.csv,.tsv,.txt,.xlsx,.xls'} onChange={openFile} disabled={disabled || reading} /></label>
    {filename && <div className="cert-import-options">
      <strong>{filename}</strong>
      <label>Hoja<select value={sheetIndex} onChange={(e) => { setSheetIndex(Number(e.target.value)); setMapping(null); setError('') }}>{sheets.map((sheet, i) => <option key={i} value={i}>{sheet.name}</option>)}</select></label>
      {type === 'forms' ? <details><summary>Revisar columnas de Forms</summary><div className="cert-fields">{Object.entries(FORM_COLUMNS).map(([key, config]) => <label key={key}>{config.label}<select value={selectedMapping[key]} onChange={(e) => setMapping({ ...selectedMapping, [key]: Number(e.target.value) })}><option value={-1}>No disponible</option>{table.headers.map((header, i) => <option key={i} value={i}>{header || `Columna ${i + 1}`}</option>)}</select></label>)}</div></details> : <label>Orden de las fechas del archivo<select value={dateOrder} onChange={(e) => setDateOrder(e.target.value)}><option value="mdy">Mes / día / año (exportaciones de ejemplo)</option><option value="dmy">Día / mes / año</option></select></label>}
      <details><summary>Vista previa del archivo</summary><div className="cert-table-scroll cert-file-preview"><table><tbody>{rows.filter((r) => r.some((v) => String(v).trim())).slice(0, 5).map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}>{String(cell)}</td>)}</tr>)}</tbody></table></div></details>
      <button type="button" className="button button-primary" onClick={apply} disabled={disabled || reading}>Aplicar archivo y reconstruir cruces</button>
    </div>}
    {error && <p className="message message-error" role="alert">{error}</p>}
  </section>
}

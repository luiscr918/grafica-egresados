import { useMemo, useState } from 'react'
import { AlertTriangle, Archive, BookOpen, CheckCircle2, CircleHelp, CopyX, Download, FileSpreadsheet, FileStack, FileText, Layers3, ShieldCheck, SlidersHorizontal, Trash2, Upload, UsersRound, X } from 'lucide-react'
import UploadZone from './components/UploadZone'
import QuestionCard from './components/QuestionCard'
import { careerOptions, questions } from './lib/questions'
import { parseExcelFile } from './lib/parseExcel'
import { getStats } from './lib/stats'
import { generateAnalysis } from './lib/analysis'
import { getCareerDisplayLabel, getCareerFamily, getCareerFilterKey, getCareerFilterLabel, getModality } from './lib/careerCatalog'
import { downloadPdf, downloadZip, renderQuestionPng } from './lib/exportImage'
import { closeAlert, confirmAction, notifyError, notifyInfo, notifySuccess, showCareerHelp, showLoading, showResolutionHelp } from './lib/alerts'

function defaultCareer(fileName, records) {
  const fromFile = records.find((record) => record.carrera)?.carrera
  return fromFile || fileName.replace(/\.xlsx$/i, '').replace(/[_-]+/g, ' ').trim() || 'Sin carrera'
}

const guideSteps = [
  { icon: Upload, title: 'Carga tus archivos', text: 'Selecciona uno o varios archivos XLSX de seguimiento. La aplicación admite formato ancho y formato largo.' },
  { icon: FileSpreadsheet, title: 'Revisa las carreras', text: 'La aplicación detecta la carrera en cada fila del Excel consolidado. En archivos sin carrera, escribe la carrera correspondiente.' },
  { icon: Layers3, title: 'Explora los resultados', text: 'Consulta una carrera específica o cambia a “Consolidado institucional (todas)” para ver la suma de todas las carreras cargadas.' },
  { icon: SlidersHorizontal, title: 'Elige la exportación', text: 'La resolución 1x, 2x o 3x solo cambia la calidad de los archivos exportados. 2x es la opción recomendada.' },
  { icon: Download, title: 'Descarga tu informe', text: 'Descarga cada gráfico como PNG, copia una imagen al portapapeles o genera todos los gráficos en ZIP y PDF.' },
]

export default function GraficosEgresados() {
  const [files, setFiles] = useState([])
  const [selectedCareer, setSelectedCareer] = useState('Todas')
  const [viewMode, setViewMode] = useState('individual')
  const [selectedPeriod, setSelectedPeriod] = useState('Todos')
  const [resolution, setResolution] = useState(2)
  const [loading, setLoading] = useState(false)
  const [globalMessage, setGlobalMessage] = useState('')
  const [showGuide, setShowGuide] = useState(false)
  const [analysisOverrides, setAnalysisOverrides] = useState({})

  async function handleFiles(incomingFiles) {
    const excelFiles = incomingFiles.filter((file) => file.name.toLowerCase().endsWith('.xlsx'))
    if (!excelFiles.length) {
      notifyError('Formato no válido', 'Selecciona al menos un archivo con extensión .xlsx.')
      return
    }
    setLoading(true)
    setGlobalMessage('')
    try {
      const parsed = await Promise.all(excelFiles.map((file) => parseExcelFile(file)))
      const nextFiles = parsed.map((result) => {
        const detectedCareers = [...new Set(result.records.map((record) => record.carrera?.trim()).filter(Boolean))]
        const hasMultipleCareers = detectedCareers.length > 1
        const detectedCareer = detectedCareers[0]
        const career = hasMultipleCareers ? 'Varias carreras' : detectedCareer || defaultCareer(result.fileName, result.records)
        const records = hasMultipleCareers ? result.records : result.records.map((record) => ({ ...record, carrera: career }))
        return { ...result, career, hasMultipleCareers, careerNeedsReview: !detectedCareer, records }
      })
      setFiles(nextFiles)
      setAnalysisOverrides({})
      setSelectedCareer('Todas')
      setSelectedPeriod('Todos')
      notifySuccess(`${nextFiles.length} archivo${nextFiles.length === 1 ? '' : 's'} cargado${nextFiles.length === 1 ? '' : 's'}`)
    } catch (error) {
      notifyError('No se pudieron leer los archivos', error instanceof Error ? error.message : 'Verifica que los archivos sean XLSX válidos.')
    } finally {
      setLoading(false)
    }
  }

  function updateCareer(index, career) {
    setFiles((current) => current.map((file, fileIndex) => fileIndex === index && !file.hasMultipleCareers ? { ...file, career, careerNeedsReview: !career.trim(), records: file.records.map((record) => ({ ...record, carrera: career })) } : file))
  }

  async function removeFile(index) {
    const file = files[index]
    const result = await confirmAction('¿Quitar este archivo?', file?.fileName || 'El archivo se quitará de la carga actual.', 'Quitar archivo')
    if (!result.isConfirmed) return
    const next = files.filter((_, fileIndex) => fileIndex !== index)
    setFiles(next)
    if (next.length === 0 || !next.some((file) => file.records.some((record) => selectedCareer === 'Todas' || getCareerFilterKey(record, viewMode) === selectedCareer))) setSelectedCareer('Todas')
    notifyInfo('Archivo quitado de la carga')
  }

  async function clearAll() {
    const result = await confirmAction('¿Limpiar todos los archivos?', 'Se quitarán los archivos y los resultados de la vista actual.', 'Limpiar carga')
    if (!result.isConfirmed) return
    setFiles([])
    setAnalysisOverrides({})
    setSelectedCareer('Todas')
    setSelectedPeriod('Todos')
    setGlobalMessage('')
    notifyInfo('Carga limpiada')
  }

  const allRecords = useMemo(() => files.flatMap((file) => file.records), [files])
  const periods = useMemo(() => [...new Set(allRecords.map((record) => record.periodoAcademico).filter(Boolean))].sort(), [allRecords])
  const periodRecords = useMemo(() => allRecords.filter((record) => selectedPeriod === 'Todos' || record.periodoAcademico === selectedPeriod), [allRecords, selectedPeriod])
  const careerChoices = useMemo(() => {
    const choices = new Map()
    for (const record of periodRecords) {
      const key = getCareerFilterKey(record, viewMode)
      if (!choices.has(key)) choices.set(key, getCareerFilterLabel(record, viewMode))
    }
    return [...choices.entries()]
      .filter(([key]) => viewMode === 'individual' || coincidentCareerKeys(periodRecords).has(key))
      .sort(([, labelA], [, labelB]) => labelA.localeCompare(labelB, 'es'))
      .map(([key, label]) => ({ key, label }))
  }, [periodRecords, viewMode])
  const matchingCareers = useMemo(() => getMatchingCareers(allRecords), [allRecords])
  const visibleRecords = useMemo(() => periodRecords.filter((record) => selectedCareer === 'Todas' || getCareerFilterKey(record, viewMode) === selectedCareer), [periodRecords, selectedCareer, viewMode])
  const totalDuplicates = useMemo(() => files.reduce((sum, file) => sum + (file.duplicates || 0), 0), [files])
  const questionStats = useMemo(() => questions.map((question, index) => ({ ...question, number: index + 1, stats: getStats(visibleRecords, question) })), [visibleRecords])
  const errors = files.flatMap((file) => file.errors || [])
  const warnings = files.flatMap((file) => file.warnings || [])

  function getAnalysisText(question) {
    const key = `${viewMode}:${selectedPeriod}:${selectedCareer}:${question.key}`
    const selectedLabel = careerChoices.find((choice) => choice.key === selectedCareer)?.label
    const selectedRecord = visibleRecords[0]
    const careerLabel = selectedCareer === 'Todas' ? '' : viewMode === 'individual' && selectedRecord
      ? `en la carrera de ${getCareerFamily(selectedRecord.carreraOriginal || selectedRecord.carrera)}${getModality(selectedRecord.modalidad, selectedRecord.carreraOriginal || selectedRecord.carrera) === 'Normal' ? '' : `, modalidad ${getModality(selectedRecord.modalidad, selectedRecord.carreraOriginal || selectedRecord.carrera)}`}`
      : `en la carrera de ${selectedLabel || selectedCareer}`
    return analysisOverrides[key] ?? generateAnalysis(question, question.stats, { careerLabel })
  }

  function updateAnalysis(question, text) {
    const key = `${viewMode}:${selectedPeriod}:${selectedCareer}:${question.key}`
    setAnalysisOverrides((current) => ({ ...current, [key]: text }))
  }

  async function buildExportItems() {
    const items = []
    for (const question of questionStats) {
      if (!question.stats.total) continue
      const dataUrl = await renderQuestionPng(question, question.stats, resolution)
      items.push({ dataUrl, analysis: getAnalysisText(question), filename: `${String(question.number).padStart(2, '0')}_${question.key}_${cleanFilename(selectedCareer)}_${cleanFilename(selectedPeriod)}.png` })
    }
    return items
  }

  async function downloadAll() {
    if (!questionStats.some((question) => question.stats.total)) {
      notifyError('No hay gráficos para descargar', 'No existen respuestas válidas en la vista actual.')
      return
    }
    showLoading('Preparando imágenes...')
    try {
      const items = await buildExportItems()
      await downloadZip(items, `graficos_${cleanFilename(selectedCareer)}_${cleanFilename(selectedPeriod)}.zip`)
      closeAlert()
      notifySuccess('ZIP descargado correctamente')
    } catch (error) {
      closeAlert()
      notifyError('No se pudo generar el ZIP', error instanceof Error ? error.message : 'Intenta nuevamente.')
    }
  }

  async function downloadPdfReport() {
    if (!questionStats.some((question) => question.stats.total)) {
      notifyError('No hay gráficos para descargar', 'No existen respuestas válidas en la vista actual.')
      return
    }
    showLoading('Preparando PDF...')
    try {
      const items = await buildExportItems()
      const careerLabel = getReportCareerLabel(visibleRecords, selectedCareer)
      const periodLabel = selectedPeriod === 'Todos' ? 'Todos los períodos' : selectedPeriod
      const reportTitle = { career: careerLabel, period: periodLabel }
      downloadPdf(items, `graficos_${cleanFilename(careerLabel)}_${cleanFilename(selectedPeriod)}.pdf`, reportTitle, visibleRecords.length)
      closeAlert()
      notifySuccess('PDF descargado correctamente')
    } catch (error) {
      closeAlert()
      notifyError('No se pudo generar el PDF', error instanceof Error ? error.message : 'Intenta nuevamente.')
    }
  }

  return (
    <main className="app-shell">
      <header className="hero">
         <div className="brand-mark">USEGBE <span>· ITSQMET</span></div>
        <div className="hero-content">
          <p className="eyebrow">Herramienta interna</p>
           <h1>Análisis Gráfico de Resultados</h1>
          <p className="hero-copy">Carga las respuestas de la encuesta y genera los gráficos listos para tu informe institucional.</p>
        </div>
         <div className="hero-tools"><div className="privacy-note"><ShieldCheck size={16} /> Los archivos se procesan solo en tu navegador</div><button className="guide-button" type="button" onClick={() => setShowGuide(true)}><BookOpen size={16} strokeWidth={2.2} /> Guía de uso</button></div>
      </header>

      <section className="workspace">
        <div className="section-intro"><div><p className="eyebrow">01 / Datos</p><h2>Carga tus archivos</h2><p>Admite el formato ancho y el formato largo de la encuesta.</p></div>{files.length > 0 && <button className="button button-ghost" onClick={clearAll}><Trash2 size={15} /> Limpiar carga</button>}</div>
        <UploadZone onFiles={handleFiles} disabled={loading} />
        {loading && <div className="loading-line">Leyendo y normalizando archivos...</div>}
        {globalMessage && <div className="message message-info">{globalMessage}</div>}

        {files.length > 0 && <>
          <div className="summary-grid">
            <div><FileStack size={18} /><strong>{files.length}</strong><span>archivos</span></div>
            <div><UsersRound size={18} /><strong>{allRecords.length}</strong><span>egresados</span></div>
            <div><CopyX size={18} /><strong>{totalDuplicates}</strong><span>duplicados descartados</span></div>
          </div>
           <div className="file-list">
             <div className="subsection-heading"><h3>Archivos y carrera asignada</h3><span>{files.length} cargado{files.length === 1 ? '' : 's'}</span></div>
              {files.map((file, index) => <div className="file-row" key={`${file.fileName}-${index}`}><div className="file-name"><span className="file-type"><FileSpreadsheet size={12} /> XLSX</span><div><strong>{file.fileName}</strong><small>{file.format ? `Formato ${file.format}` : 'No reconocido'}</small></div><button className="remove-file" type="button" aria-label={`Quitar ${file.fileName}`} title="Quitar archivo" onClick={() => removeFile(index)}><X size={15} /></button></div><label className={`career-field ${file.careerNeedsReview ? 'career-field-review' : ''}`}><span>{file.hasMultipleCareers ? 'Carreras detectadas' : 'Carrera de este archivo'}</span><div className="career-input-row"><input className={file.careerNeedsReview ? 'career-input-review' : ''} list="careers" value={file.career} readOnly={file.hasMultipleCareers} aria-describedby={file.careerNeedsReview ? `career-help-${index}` : undefined} onChange={(event) => updateCareer(index, event.target.value)} />{!file.hasMultipleCareers && <button className="career-guide-button" type="button" onClick={showCareerHelp}><BookOpen size={14} /> ¿Qué debo poner?</button>}</div>{file.hasMultipleCareers && <small className="career-review-help career-detected-help"><CheckCircle2 size={13} /> Se conservaron las carreras de cada registro.</small>}{file.careerNeedsReview && <small className="career-review-help" id={`career-help-${index}`}><AlertTriangle size={13} /> Revisa y reemplaza el nombre provisional del archivo.</small>}</label></div>)}
            <datalist id="careers">{careerOptions.map((career) => <option value={career} key={career} />)}</datalist>
          </div>
          {errors.map((error) => <div className="message message-error" key={error}>{error}</div>)}
           {warnings.length > 0 && <details className="warnings"><summary><AlertTriangle size={15} /> {warnings.length} aviso{warnings.length === 1 ? '' : 's'} de normalización</summary>{warnings.map((warning, index) => <p key={`${warning}-${index}`}>{warning}</p>)}</details>}
        </>}

        {files.length > 0 && allRecords.length > 0 && <section className="results-section">
            <div className="results-toolbar"><div><p className="eyebrow">02 / Resultados</p><h2>Gráficos por pregunta</h2><p>{visibleRecords.length} egresados en la vista actual.</p></div><div className="toolbar-controls"><label><span>Tipo de análisis</span><select value={viewMode} onChange={(event) => { const nextMode = event.target.value; setViewMode(nextMode); setSelectedCareer('Todas'); if (nextMode === 'conjunto') setSelectedPeriod('Todos') }}><option value="individual">Individual por modalidad</option><option value="conjunto">Análisis conjunto por carrera</option></select></label><label><span>Período académico</span><select value={selectedPeriod} onChange={(event) => { setSelectedPeriod(event.target.value); setSelectedCareer('Todas') }}><option value="Todos">Todos los períodos</option>{periods.map((period) => <option value={period} key={period}>{period}</option>)}</select></label><label><span>{viewMode === 'conjunto' ? 'Carrera coincidente' : 'Carrera'}</span><select value={selectedCareer} onChange={(event) => setSelectedCareer(event.target.value)}><option value="Todas">Todas</option>{careerChoices.map((choice) => <option value={choice.key} key={choice.key}>{choice.label}</option>)}</select></label><label className="resolution-field"><span>Resolución de exportación <button className="field-help-button" type="button" aria-label="Ayuda sobre resolución" onClick={showResolutionHelp}><CircleHelp size={14} /></button></span><select title="Solo cambia la calidad de las imágenes exportadas" value={resolution} onChange={(event) => setResolution(Number(event.target.value))}><option value="1">1x</option><option value="2">2x (recomendada)</option><option value="3">3x</option></select></label><button className="button button-primary" onClick={downloadAll}><Archive size={16} /> Descargar ZIP</button><button className="button button-light" onClick={downloadPdfReport}><FileText size={16} /> Descargar PDF</button></div></div>
           <section className="matching-careers"><div><strong>Carreras con coincidencias para análisis conjunto</strong><span>Solo se agrupan nombres de carrera idénticos; la modalidad y el período se muestran como origen.</span></div>{matchingCareers.length ? <div className="matching-careers-list">{matchingCareers.map((career) => <div key={career.key}><strong>{career.label}</strong><span>{career.sources.join(' · ')}</span></div>)}</div> : <p>No hay carreras con el mismo nombre en más de una modalidad o período dentro de la carga actual.</p>}</section>
           <div className="cards-list">{questionStats.map((question) => <QuestionCard question={question} stats={question.stats} resolution={resolution} analysis={getAnalysisText(question)} onAnalysisChange={(text) => updateAnalysis(question, text)} key={question.key} />)}</div>
        </section>}
      </section>
      {showGuide && <div className="guide-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setShowGuide(false)}><section className="guide-modal" role="dialog" aria-modal="true" aria-labelledby="guide-title"><div className="guide-heading"><div className="guide-title-block"><div className="guide-title-icon"><BookOpen size={21} /></div><div><p className="eyebrow">Guía rápida</p><h2 id="guide-title">Del Excel al informe</h2><p>Un flujo sencillo para preparar tus gráficos institucionales.</p></div></div><button className="guide-close-icon" type="button" aria-label="Cerrar guía" onClick={() => setShowGuide(false)}><X size={19} /></button></div><ol className="guide-steps">{guideSteps.map(({ icon: Icon, title, text }, index) => <li key={title}><div className="guide-step-number">{String(index + 1).padStart(2, '0')}</div><div className="guide-step-icon"><Icon size={19} strokeWidth={2} /></div><div className="guide-step-copy"><strong>{title}</strong><span>{text}</span></div></li>)}</ol><div className="guide-note"><AlertTriangle size={18} /><div><strong>Evita duplicar respuestas</strong><span>No cargues al mismo tiempo dos versiones del mismo conjunto de datos, porque se contarían dos veces.</span></div></div><div className="guide-footer"><div><CheckCircle2 size={17} /><span>Todo se procesa localmente en tu navegador.</span></div><button className="button button-primary guide-close" type="button" onClick={() => setShowGuide(false)}>Entendido</button></div></section></div>}
    </main>
  )
}

function cleanFilename(value) {
  return String(value || 'todas').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '').toLowerCase() || 'todas'
}

function getReportCareerLabel(records, selectedCareer) {
  if (selectedCareer === 'Todas') return 'Todas las carreras'
  const labels = [...new Set(records.map((record) => getCareerDisplayLabel(record)).filter(Boolean))]
  return labels.length === 1 ? labels[0] : labels.join(', ')
}

function getMatchingCareers(records) {
  const groups = new Map()
  for (const record of records) {
    const key = getCareerFilterKey(record, 'conjunto')
    if (!key) continue
    if (!groups.has(key)) groups.set(key, { key, label: getCareerFilterLabel(record, 'conjunto'), sources: new Set() })
    const modality = getModality(record.modalidad, record.carreraOriginal || record.carrera)
    groups.get(key).sources.add(`${modality} · ${record.periodoAcademico || 'Sin período'}`)
  }
  return [...groups.values()]
    .filter((group) => group.sources.size > 1)
    .sort((a, b) => a.label.localeCompare(b.label, 'es'))
    .map((group) => ({ ...group, sources: [...group.sources].sort((a, b) => a.localeCompare(b, 'es')) }))
}

function coincidentCareerKeys(records) {
  return new Set(getMatchingCareers(records).map((career) => career.key))
}

import { useState } from 'react'
import { FileDown, FileText } from 'lucide-react'
import { getReportContent } from './lib/reportContent'
import { downloadActivityReport } from './lib/generateReportDocx'

export default function ReportPreview({ report }) {
  const [variant, setVariant] = useState('personal')
  const { blocks, activityCount } = getReportContent(report, variant)

  return <section className="activity-panel report-preview" id="activity-report-preview" aria-labelledby="report-preview-heading">
    <div className="activities-heading">
      <div className="panel-title"><FileText size={18} /><div><h2 id="report-preview-heading">Vista previa del informe</h2><p>Se actualiza con tus cambios. La distribución de páginas puede variar en Word.</p></div></div>
      <button className="button button-light" onClick={() => downloadActivityReport(report, variant)}><FileDown size={16} /> Descargar esta versión</button>
    </div>
    <div className="report-preview-controls">
      <label htmlFor="report-preview-variant">Versión del informe<select id="report-preview-variant" value={variant} onChange={(event) => setVariant(event.target.value)}><option value="personal">Mi informe</option><option value="jefatura">Base para jefatura</option></select></label>
      <p>{activityCount} actividad{activityCount === 1 ? '' : 'es'} incluida{activityCount === 1 ? '' : 's'}</p>
    </div>
    {!activityCount && <p className="report-preview-empty">Aún no hay actividades para mostrar. Marca «Incluir», selecciona una unidad y completa la redacción para el informe.</p>}
    <article className="report-preview-paper" aria-label="Contenido del documento">
      {blocks.map(({ type, text }, index) => {
        if (type === 'title') return <h3 className="report-preview-title" key={index}>{text}</h3>
        if (type === 'heading') return <h4 key={index}>{text}</h4>
        if (type === 'subheading') return <h5 key={index}>{text}</h5>
        return <p className={type === 'note' ? 'report-preview-note' : undefined} key={index}>{text}</p>
      })}
    </article>
  </section>
}

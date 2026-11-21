import { useState } from 'react'
import { FileDown, FileText } from 'lucide-react'
import { getReportContent, reportUnits } from './lib/reportContent'
import { downloadActivityReport } from './lib/generateReportDocx'
import { notifyError } from '../../usegbe/graficos-egresados/lib/alerts'

export default function ReportPreview({ report }) {
  const [variant, setVariant] = useState('personal')
  const { blocks, activityCount, profile, code } = getReportContent(report, variant)
  const title = blocks.find((block) => block.type === 'title').text
  async function download() {
    try { await downloadActivityReport(report, variant) }
    catch (error) { notifyError('No se pudo descargar el informe', error.message) }
  }

  return <section className="activity-panel report-preview" id="activity-report-preview" aria-labelledby="report-preview-heading">
    <div className="activities-heading">
      <div className="panel-title"><FileText size={18} /><div><h2 id="report-preview-heading">Vista previa del informe</h2><p>Se actualiza con tus cambios. La distribución de páginas puede variar en Word.</p></div></div>
      <button className="button button-light" onClick={download}><FileDown size={16} /> Descargar esta versión</button>
    </div>
    <div className="report-preview-controls">
      <label htmlFor="report-preview-variant">Versión del informe<select id="report-preview-variant" value={variant} onChange={(event) => setVariant(event.target.value)}><option value="personal">Informe de Luis</option><option value="jefatura">Informe de Yesenia</option></select></label>
      <p>{activityCount} actividad{activityCount === 1 ? '' : 'es'} incluida{activityCount === 1 ? '' : 's'}</p>
    </div>
    {!activityCount && <p className="report-preview-empty">Aún no hay actividades para mostrar. Marca «Incluir», selecciona una unidad y completa la redacción para el informe.</p>}
    <article className="report-preview-paper" aria-label="Contenido del documento">
      <div className="report-institutional-header"><img src={`${import.meta.env.BASE_URL}informes/logo.png`} alt="ITSQMET" /><div>{reportUnits.map((unit) => <div key={unit}>{unit}</div>)}<strong>{title}</strong></div><div>Código:<br />{code}</div></div>
      <div className="report-cover"><h3 className="report-preview-title">{title}</h3></div>
      <table className="report-signatures"><tbody><tr><td>ELABORADO POR:<div className="report-signature-space" /></td><td>APROBADO POR:<div className="report-signature-space" /></td></tr><tr><td><strong>NOMBRE: {profile.author}</strong></td><td><strong>NOMBRE: {profile.approver}</strong></td></tr><tr><td><strong>{profile.authorRole}:</strong>{reportUnits.map((unit) => <div key={unit}>{unit}</div>)}</td><td><strong>{profile.approverRole}{variant === 'personal' ? ':' : ''}</strong>{variant === 'personal' && reportUnits.map((unit) => <div key={unit}>{unit}</div>)}</td></tr></tbody></table>
      <div className="report-body-preview">
      {blocks.map(({ type, text }, index) => {
        if (type === 'title') return null
        if (type === 'heading') return <h4 key={index}>{text}</h4>
        if (type === 'area') return <h5 key={index}>{text}</h5>
        if (type === 'subheading') return <h5 key={index}>{text}</h5>
        if (type === 'activity') return <ul className="report-activity-bullet" key={index}><li>{text}</li></ul>
        if (type === 'emails') return <p key={index}>{blocks[index].emails.map((email, emailIndex) => <span key={email}>{emailIndex > 0 ? '   ' : ''}<a href={`mailto:${email}`}>{email}</a></span>)}</p>
        if (type === 'link') return <p key={index}><a href={blocks[index].href} target="_blank" rel="noreferrer">{text}</a></p>
        return <p className={type === 'note' ? 'report-preview-note' : undefined} key={index}>{text}</p>
      })}
      </div>
    </article>
  </section>
}

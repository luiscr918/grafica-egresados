import { saveAs } from 'file-saver'
import { buildActivityReport } from './reportDocx.js'
import { getReportProfile } from './reportContent.js'

export async function downloadActivityReport(report, variant = 'personal') {
  const profile = getReportProfile(variant)
  const response = await fetch(`${import.meta.env.BASE_URL}informes/plantilla-${profile.template}.docx`)
  if (!response.ok) throw new Error('No se pudo cargar la plantilla institucional del informe.')
  const data = await buildActivityReport(report, variant, await response.arrayBuffer())
  saveAs(new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }), `Informe_actividades_${profile.template}_${report.startDate || 'periodo'}.docx`)
}

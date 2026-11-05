import { Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx'
import { saveAs } from 'file-saver'

const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

function dateText(value) {
  if (!value) return '________________'
  const [year, month, day] = value.split('-').map(Number)
  return `${day} de ${months[month - 1]} de ${year}`
}

function paragraph(text, options = {}) {
  return new Paragraph({ children: [new TextRun({ text: String(text || ''), font: 'Arial', size: 22, ...options })], spacing: { after: 100, line: 276 } })
}

function heading(text, level = HeadingLevel.HEADING_2) {
  return new Paragraph({ text, heading: level, spacing: { before: 160, after: 80 } })
}

export async function downloadActivityReport(report, variant) {
  const activities = (report.activities || []).filter((item) => item.include && item.refined.trim())
  const grouped = ['URI', 'UFC', 'USEGBE'].map((area) => ({ area, items: activities.filter((item) => item.area === area) })).filter((group) => group.items.length)
  const children = [
    new Paragraph({ text: `Informe Mensual de Actividades desde el ${dateText(report.startDate)} al ${dateText(report.endDate)}`, alignment: 'center', spacing: { after: 280 } }),
    heading('OBJETIVO'),
    paragraph(`Presentar las actividades de coordinación, gestión, organización, apoyo y levantamiento de información ejecutadas en las unidades de: Relaciones Interinstitucionales, Formación Complementaria, y Seguimiento a Egresados, Graduados y Bolsa de Empleo, correspondientes al período comprendido entre el ${dateText(report.startDate)} al ${dateText(report.endDate)}.`),
    heading('RESPONSABLE'),
    paragraph('Unidad de Relaciones Interinstitucionales'),
    paragraph('Unidad de Formación Complementaria'),
    paragraph('Unidad de Seguimiento a Egresados/Graduados y Bolsa de Empleo'),
    heading('HORARIO DE TRABAJO'),
    paragraph(report.schedule || 'De lunes a viernes de 8h00 a 17h00.'),
    heading('COORDINACIÓN/GESTIÓN REALIZADA'),
  ]

  grouped.forEach(({ area, items }, areaIndex) => {
    children.push(heading(`${areaIndex + 1}. ${area === 'URI' ? 'URI – Unidad de Relaciones Interinstitucionales' : area === 'UFC' ? 'UFC – Unidad de Formación Complementaria' : 'USEGBE – Unidad de Seguimiento a Egresados, Graduados y Bolsa de Empleo'}`))
    const categories = [...new Set(items.map((item) => item.category || 'Actividades realizadas'))]
    categories.forEach((category) => {
      children.push(heading(category, HeadingLevel.HEADING_3))
      items.filter((item) => (item.category || 'Actividades realizadas') === category).forEach((item) => children.push(paragraph(item.refined)))
    })
  })

  children.push(heading('SOPORTE TRABAJO - EVIDENCIAS'))
  children.push(paragraph(report.evidence || 'Correo, OneDrive y SharePoint institucional.'))
  if (variant === 'jefatura') children.splice(0, 0, paragraph('DOCUMENTO BASE PARA REVISIÓN DE JEFATURA', { bold: true, italics: true }))

  const doc = new Document({ styles: { default: { document: { run: { font: 'Arial', size: 22 }, paragraph: { spacing: { after: 100, line: 276 } } } } }, sections: [{ properties: { page: { margin: { top: 1080, bottom: 1080, left: 1440, right: 1440 } } }, children }] })
  const blob = await Packer.toBlob(doc)
  saveAs(blob, `Informe_actividades_${variant}_${report.startDate || 'periodo'}.docx`)
}

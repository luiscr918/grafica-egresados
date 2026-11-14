import { Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx'
import { saveAs } from 'file-saver'
import { getReportContent } from './reportContent'

function paragraph(text, options = {}) {
  return new Paragraph({ children: [new TextRun({ text: String(text || ''), font: 'Arial', size: 22, ...options })], spacing: { after: 100, line: 276 } })
}

function heading(text, level = HeadingLevel.HEADING_2) {
  return new Paragraph({ text, heading: level, spacing: { before: 160, after: 80 } })
}

export async function downloadActivityReport(report, variant) {
  const { blocks } = getReportContent(report, variant)
  const children = blocks.map(({ type, text }) => {
    if (type === 'title') return new Paragraph({ text, alignment: 'center', spacing: { after: 280 } })
    if (type === 'heading') return heading(text)
    if (type === 'subheading') return heading(text, HeadingLevel.HEADING_3)
    return paragraph(text, type === 'note' ? { bold: true, italics: true } : {})
  })

  const doc = new Document({ styles: { default: { document: { run: { font: 'Arial', size: 22 }, paragraph: { spacing: { after: 100, line: 276 } } } } }, sections: [{ properties: { page: { margin: { top: 1080, bottom: 1080, left: 1440, right: 1440 } } }, children }] })
  const blob = await Packer.toBlob(doc)
  saveAs(blob, `Informe_actividades_${variant}_${report.startDate || 'periodo'}.docx`)
}

import { Document, ExternalHyperlink, ImageRun, Packer, Paragraph, TextRun, convertMillimetersToTwip } from 'docx'
import { saveAs } from 'file-saver'

const EMOJI_FONT = 'Segoe UI Emoji'
const SIZE = 24
const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

function run(text, options = {}) { return new TextRun({ text, size: SIZE, bold: true, ...options }) }
function textRuns(text, options = {}) {
  const parts = String(text ?? '').split(/(\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?)*)/gu)
  return parts.filter(Boolean).map((part) => {
    const isEmoji = /\p{Extended_Pictographic}/u.test(part)
    return run(part, isEmoji ? { font: EMOJI_FONT, ...options } : options)
  })
}
function paragraph(text, options = {}) { return new Paragraph({ children: textRuns(text), ...options }) }
function linkParagraph(label, url) { return new Paragraph({ numbering: { reference: 'marketing-bullets', level: 0 }, children: [run(label), new ExternalHyperlink({ link: url, children: [run(url, { style: 'Hyperlink' })] })] }) }
function dateText(value) { if (!value) return ''; const [year, month, day] = value.split('-').map(Number); return `${day} de ${months[month - 1]} de ${year}` }

async function imageRun(file) {
  const type = file.type === 'image/png' ? 'png' : 'jpg'
  return new ImageRun({ data: await file.arrayBuffer(), type, transformation: { width: 520, height: 330 } })
}

export async function buildMarketingDocument(form) {
  const children = [
    paragraph(`📢 OFERTA LABORAL | ${form.ciudad}, ${form.empresa}`),
    paragraph('💡 Alumni ITSQMET – USEGBE'),
    paragraph('🎯 Dirigido a: Egresados y graduados ITSQMET'),
    paragraph(`💼 Vacante: ${form.nombreVacante}`),
    paragraph(`${form.intro} 🚀`),
    paragraph('📍 Ubicación:'),
    paragraph(form.ubicacion),
    paragraph('🎓 Formación requerida:'),
    paragraph(form.formacion),
    paragraph('✨ Principales funciones:'),
    ...form.funciones.filter(Boolean).map((item) => paragraph(`▪ ${item}`)),
    paragraph(`🕒 Horario laboral: ${form.horario}`),
    paragraph('📌 Requisitos - Proceso de postulación:'),
    linkParagraph('Registra tu aplicación aquí: ', form.enlace),
    new Paragraph({ numbering: { reference: 'marketing-bullets', level: 0 }, children: [run('Envía tu hoja de vida a: '), new ExternalHyperlink({ link: 'mailto:bolsaempleo@itsqmet.edu.ec', children: textRuns('📧 bolsaempleo@itsqmet.edu.ec', { style: 'Hyperlink' }) })] }),
    paragraph(`📝 Asunto del correo: ${form.asunto}`),
    paragraph('⚠️ Se considerarán únicamente postulaciones que cumplan con los requisitos establecidos.'),
    paragraph(`📅 Fecha límite de postulación: ${dateText(form.fechaLimite)}`),
    paragraph('🚀 Impulsa tu carrera profesional con el respaldo del ITSQMET. ¡Aplica ahora!'),
    paragraph(form.hashtags),
    new Paragraph({ children: [run('NOTA PARA MKT: Por favor, en todas las artes que se envíe respecto a bolsa de empleo siempre colocar lo siguiente: completa el formulario (coloca el link) y envía tu CV al correo: bolsaempleo@itsqmet.edu.ec ADICIONAL, RESALTAR QUE LA OFERTA DE EMPLEO MENCIONE QUE VA DIRIGIDO A EGRESADOS-GRADUADOS DE ITSQMET – ALUMNI ITSQMET', { bold: false, italics: true })] }),
  ]
  for (const file of (form.imagenes || []).slice(0, 2)) children.push(new Paragraph({ children: [await imageRun(file)] }))
  const doc = new Document({ numbering: { config: [{ reference: 'marketing-bullets', levels: [{ level: 0, format: 'bullet', text: '•', alignment: 'left' }] }] }, styles: { default: { document: { run: { font: 'Aptos', size: SIZE }, paragraph: { spacing: { after: 160, line: 278 } } } } }, sections: [{ properties: { page: { size: { width: convertMillimetersToTwip(210), height: convertMillimetersToTwip(297) }, margin: { top: convertMillimetersToTwip(25), bottom: convertMillimetersToTwip(25), left: convertMillimetersToTwip(30), right: convertMillimetersToTwip(30) } } }, children }] })
  return Packer.toBlob(doc)
}

export async function downloadMarketingDocument(form) {
  const blob = await buildMarketingDocument(form)
  const filename = `Solicitud_marketing_Vacante_${cleanFilename(form.empresa)}.docx`
  saveAs(blob, filename)
}

function cleanFilename(value) { return String(value || 'EMPRESA').split(/\s+/)[0].normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '') || 'EMPRESA' }
export { dateText }

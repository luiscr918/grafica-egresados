const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

export const reportUnits = ['Unidad de Relaciones Interinstitucionales', 'Unidad de Formación Complementaria', 'Unidad de Seguimiento a Egresados, Graduados y Bolsa de Empleo']
export const evidenceLinks = {
  oneDrive: 'https://itsqmet-my.sharepoint.com/my?id=%2Fpersonal%2Fmortegaf%5Fitsqmet%5Fedu%5Fec%2FDocuments%2FYESENIA%20ORTEGA%20%2D%20ITSQMET&viewid=6301849e%2D8d47%2D4032%2D9685%2Df71e61260b9f&login_hint=mortegaf%40itsqmet%2Eedu%2Eec&source=waffle',
  sharePoint: 'https://itsqmet.sharepoint.com/_layouts/15/sharepoint.aspx?&login_hint=mortegaf@itsqmet.edu.ec',
}

export function getReportProfile(variant = 'personal') {
  return variant === 'jefatura'
    ? { template: 'yesenia', author: 'MSc. Yesenia Ortega', approver: 'Dr. Alex León', authorRole: 'RESPONSABLE', approverRole: 'CARGO: Vicerrector ITSQMET', schedule: 'De lunes a viernes de 8h00 a 17h00.' }
    : { template: 'luis', author: 'Tecg. Luis Castillo', approver: 'MSc. Yesenia Ortega', authorRole: 'APOYO', approverRole: 'RESPONSABLE', schedule: 'De lunes a viernes de 9h00 a 15h00.' }
}

function dateText(value) {
  if (!value) return '________________'
  const [year, month, day] = value.split('-').map(Number)
  return `${day} de ${months[month - 1]} de ${year}`
}

export function getReportContent(report, variant = 'personal') {
  const activities = (report.activities || []).filter((item) => item.include && item.refined?.trim())
  const grouped = ['URI', 'UFC', 'USEGBE'].map((area) => ({ area, items: activities.filter((item) => item.area === area) })).filter((group) => group.items.length)
  const blocks = []
  const add = (type, text, extra = {}) => blocks.push({ type, text, ...extra })
  const profile = getReportProfile(variant)
  const period = `desde el ${dateText(report.startDate)} al ${dateText(report.endDate)}`
  const codeDate = report.endDate || report.startDate
  const code = report.documentCode?.trim() || `URI-UFC-USEGBE-RGI1-01-${codeDate ? codeDate.slice(0, 7) : '____-__'}`

  add('title', `Informe Mensual de Actividades ${period}`)
  add('heading', '1. OBJETIVO')
  add('paragraph', `Presentar las actividades de coordinación, gestión, organización, apoyo y levantamiento de información ejecutadas en las unidades de: Relaciones Interinstitucionales, Formación Complementaria, y Seguimiento a Egresados, Graduados y Bolsa de Empleo, correspondientes al período comprendido entre el ${dateText(report.startDate)} al ${dateText(report.endDate)}.`)
  add('heading', '2. RESPONSABLE')
  add('paragraph', 'Unidad de Relaciones Interinstitucionales')
  add('paragraph', 'Unidad de Formación Complementaria')
  add('paragraph', 'Unidad de Seguimiento a Egresados/Graduados y Bolsa de Empleo')
  add('heading', '3. HORARIO DE TRABAJO')
  add('paragraph', report.schedule?.trim() || profile.schedule)
  add('heading', '4. COORDINACIÓN/GESTIÓN REALIZADA:')

  grouped.forEach(({ area, items }) => {
    add('area', `4.${['URI', 'UFC', 'USEGBE'].indexOf(area) + 1}. ${area === 'URI' ? 'URI – Unidad de Relaciones Interinstitucionales' : area === 'UFC' ? 'UFC – Unidad de Formación Complementaria' : 'USEGBE – Unidad de Seguimiento a Egresados, Graduados y Bolsa de Empleo'}`)
    const categories = [...new Set(items.map((item) => item.category || 'Actividades realizadas'))]
    categories.forEach((category) => {
      add('subheading', category)
      items.filter((item) => (item.category || 'Actividades realizadas') === category).forEach((item) => add('activity', item.refined))
    })
  })

  add('heading', '5. SOPORTE TRABAJO - EVIDENCIAS:')
  add('paragraph', 'Correo:')
  const emails = [...(variant === 'jefatura' ? [] : ['lucastillo@itsqmet.edu.ec']), 'mortegaf@itsqmet.edu.ec', 'bolsaempleo@itsqmet.edu.ec']
  add('emails', emails.join('   '), { emails })
  add('paragraph', 'One Drive:')
  add('link', evidenceLinks.oneDrive, { href: evidenceLinks.oneDrive })
  add('paragraph', 'Share Point:')
  add('link', evidenceLinks.sharePoint, { href: evidenceLinks.sharePoint })
  if (report.evidence?.trim()) add('paragraph', report.evidence)
  return { blocks, code, profile, activityCount: grouped.reduce((total, group) => total + group.items.length, 0) }
}

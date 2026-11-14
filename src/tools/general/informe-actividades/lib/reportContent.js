const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

function dateText(value) {
  if (!value) return '________________'
  const [year, month, day] = value.split('-').map(Number)
  return `${day} de ${months[month - 1]} de ${year}`
}

export function getReportContent(report, variant = 'personal') {
  const activities = (report.activities || []).filter((item) => item.include && item.refined?.trim())
  const grouped = ['URI', 'UFC', 'USEGBE'].map((area) => ({ area, items: activities.filter((item) => item.area === area) })).filter((group) => group.items.length)
  const blocks = []
  const add = (type, text) => blocks.push({ type, text })

  if (variant === 'jefatura') add('note', 'DOCUMENTO BASE PARA REVISIÓN DE JEFATURA')
  add('title', `Informe Mensual de Actividades desde el ${dateText(report.startDate)} al ${dateText(report.endDate)}`)
  add('heading', 'OBJETIVO')
  add('paragraph', `Presentar las actividades de coordinación, gestión, organización, apoyo y levantamiento de información ejecutadas en las unidades de: Relaciones Interinstitucionales, Formación Complementaria, y Seguimiento a Egresados, Graduados y Bolsa de Empleo, correspondientes al período comprendido entre el ${dateText(report.startDate)} al ${dateText(report.endDate)}.`)
  add('heading', 'RESPONSABLE')
  add('paragraph', 'Unidad de Relaciones Interinstitucionales')
  add('paragraph', 'Unidad de Formación Complementaria')
  add('paragraph', 'Unidad de Seguimiento a Egresados/Graduados y Bolsa de Empleo')
  add('heading', 'HORARIO DE TRABAJO')
  add('paragraph', report.schedule || 'De lunes a viernes de 8h00 a 17h00.')
  add('heading', 'COORDINACIÓN/GESTIÓN REALIZADA')

  grouped.forEach(({ area, items }, areaIndex) => {
    add('heading', `${areaIndex + 1}. ${area === 'URI' ? 'URI – Unidad de Relaciones Interinstitucionales' : area === 'UFC' ? 'UFC – Unidad de Formación Complementaria' : 'USEGBE – Unidad de Seguimiento a Egresados, Graduados y Bolsa de Empleo'}`)
    const categories = [...new Set(items.map((item) => item.category || 'Actividades realizadas'))]
    categories.forEach((category) => {
      add('subheading', category)
      items.filter((item) => (item.category || 'Actividades realizadas') === category).forEach((item) => add('paragraph', item.refined))
    })
  })

  add('heading', 'SOPORTE TRABAJO - EVIDENCIAS')
  add('paragraph', report.evidence || 'Correo, OneDrive y SharePoint institucional.')
  return { blocks, activityCount: grouped.reduce((total, group) => total + group.items.length, 0) }
}

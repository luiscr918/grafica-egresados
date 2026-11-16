import XLSX from 'xlsx-js-style'
import { evaluatedRoster, formatDuration, ROLE_LABELS, windowOf } from './model.js'

const heading = { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '193C5E' } }, alignment: { vertical: 'center', wrapText: true } }

function appendSheet(book, name, rows, headerRow, widths) {
  const sheet = XLSX.utils.aoa_to_sheet(rows)
  sheet['!cols'] = widths.map((wch) => ({ wch }))
  sheet['!rows'] = rows.map((_, i) => ({ hpt: i === headerRow ? 30 : 25 }))
  rows.forEach((row, r) => row.forEach((_, c) => {
    const address = XLSX.utils.encode_cell({ r, c }), cell = sheet[address]
    if (cell) cell.s = r === headerRow ? heading : { font: { name: 'Calibri', sz: 11 }, alignment: { vertical: 'top', wrapText: true }, fill: { fgColor: { rgb: r % 2 ? 'F3F7FB' : 'FFFFFF' } } }
  }))
  if (rows.length > headerRow + 1) sheet['!autofilter'] = { ref: XLSX.utils.encode_range({ r: headerRow, c: 0 }, { r: rows.length - 1, c: widths.length - 1 }) }
  XLSX.utils.book_append_sheet(book, sheet, name)
}

export function buildReportWorkbook(event, people, sourceInfo = {}) {
  const roster = evaluatedRoster(people, event), recipients = roster.filter((p) => p.evaluation.eligible)
  const book = XLSX.utils.book_new()
  let interval
  try { interval = windowOf(event) } catch { /* A review report may be exported before the window is set. */ }
  const summary = [
    ['RESUMEN DE CERTIFICACIÓN', 'Valor'], ['Tema', event.title], ['Institución', event.institution], ['Fecha', event.date],
    ['Tramo de clase', `${event.startTime || 'Pendiente'} – ${event.endTime || 'pendiente'}`], ['Tramo confirmado', event.windowConfirmed ? 'Sí' : 'No'],
    ['Duración efectiva', interval ? formatDuration(interval.duration) : 'Pendiente'], ['Asistencia requerida', `${event.percentage} %`],
    ['Tolerancia', `${event.tolerance} minuto(s)`], ['Mínimo estricto', interval ? formatDuration(interval.strict) : 'Pendiente'], ['Mínimo con tolerancia', interval ? formatDuration(interval.minimum) : 'Pendiente'],
    ['Respuestas Forms', sourceInfo.formsRows ?? 'No cargado'], ['Inscripciones únicas', sourceInfo.uniqueRegistrations ?? 'No cargado'], ['Personas Teams', sourceInfo.teamPeople ?? 'No cargado'],
    ['Acreedores listos para emitir', recipients.length], ...['organizer', 'speaker', 'participant'].map((role) => [ROLE_LABELS[role], recipients.filter((p) => p.role === role).length]),
    ['Con tolerancia', recipients.filter((p) => p.evaluation.code === 'tolerance').length], ['Pendientes / no aptos / excluidos', roster.length - recipients.length],
    ['Observación', 'La asistencia efectiva suma intervalos dentro del tramo y elimina solapamientos. El total Teams conserva el valor reportado. Las horas certificadas son independientes de la duración de la reunión.'],
    ['Origen de la evaluación', people.some((p) => p.snapshot) ? 'Expediente recuperado: solo acreedores guardados, no incluye todos los registros originales.' : 'Archivos importados en esta sesión.'],
  ]
  appendSheet(book, 'Resumen', summary, 0, [33, 100])
  const recipientRows = [
    ['LISTA PARA EMISIÓN DE CERTIFICADOS', event.title, '', '', '', ''],
    ['Nombre completo', 'Asistencia en la clase', 'Total reportado en Teams', 'Correo registrado en Forms', 'Rol en la clase', 'Criterio'],
    ...recipients.map((p) => [p.certificateName, formatDuration(p.evaluation.seconds), formatDuration(p.evaluation.totalSeconds), p.registration?.emails.join(' / ') || '', ROLE_LABELS[p.role], p.evaluation.label]),
  ]
  appendSheet(book, 'Para certificados', recipientRows, 1, [48, 23, 26, 40, 22, 35])
  const detailHeaders = ['Nombre para certificado', 'Nombre original Teams', 'Nombre original Forms', 'Rol', 'Forms vinculado', 'Asistencia efectiva', 'Porcentaje', 'Total Teams', 'Resultado', 'Vínculo', 'Observaciones']
  const detail = (p) => [p.certificateName, p.originalTeams, p.originalForm, ROLE_LABELS[p.role], p.registration ? 'Sí' : 'No / exento según rol', formatDuration(p.evaluation.seconds), `${p.evaluation.percentage?.toFixed(2) || '0.00'} %`, formatDuration(p.evaluation.totalSeconds), p.evaluation.label, p.matchMethod || (p.snapshot ? 'Expediente guardado' : ''), [p.notes, p.registration?.consentIssue ? `Autorización con observación${p.consentReviewed ? ' revisada' : ' pendiente'}` : ''].filter(Boolean).join(' · ')]
  appendSheet(book, 'Detalle de evaluación', [detailHeaders, ...roster.map(detail)], 0, [44, 44, 44, 24, 22, 22, 16, 20, 45, 30, 55])
  appendSheet(book, 'Pendientes', [detailHeaders, ...roster.filter((p) => !p.evaluation.eligible).map(detail)], 0, [44, 44, 44, 24, 22, 22, 16, 20, 45, 30, 55])
  return book
}

export function downloadReport(event, people, sourceInfo) {
  XLSX.writeFile(buildReportWorkbook(event, people, sourceInfo), `Evaluacion-certificados-${event.date || 'evento'}.xlsx`)
}

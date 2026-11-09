import * as XLSX from 'xlsx'
import { questions } from './questions'
import { cleanValue, deduplicateRecords, normalizeHeader, questionMatch, toIdString } from './normalize'

function careerFromFilename(name) {
  const value = name.replace(/\.xlsx$/i, '').replace(/^.*?graduados?\s+de\s+la\s+carrera\s+(?:de\s+)?/i, '').replace(/\s*\(\d+[-\d]*\)\s*$/i, '').trim()
  const aliases = { 'G. Talento Humano': 'Gestión del Talento Humano', 'Seguridad Ciudadana y Orden Publico': 'Seguridad Ciudadana y Orden Público' }
  return aliases[value] || value || 'Sin carrera'
}

export async function parseExcelFile(file) {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellText: true, cellDates: false })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  if (!sheet) return { records: [], errors: [`${file.name}: no existe una hoja con respuestas.`], warnings: [], format: null, fileName: file.name }
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false })
  if (!rows.length) return { records: [], errors: [`${file.name}: la hoja está vacía.`], warnings: [], format: null, fileName: file.name }
  const headers = Object.keys(rows[0]); const idHeader = headers.find((header) => ['id', 'numeroidentificacion', 'identificacion', 'cedula'].includes(normalizeHeader(header))) || headers[0]
  const questionHeaders = new Map()
  for (const header of headers) { const key = questionMatch(header); if (key && !questionHeaders.has(key)) questionHeaders.set(key, header) }
  const missing = questions.filter(({ key }) => !questionHeaders.has(key)).map(({ key }) => key)
  if (missing.length > 3) return { records: [], errors: [`${file.name}: no se pudieron identificar las preguntas de graduados (${missing.length} faltantes).`], warnings: [], format: null, fileName: file.name }
  const career = careerFromFilename(file.name)
  const records = rows.map((row) => {
    const record = { numeroIdentificacion: toIdString(row[idHeader]), carrera: career, carreraOriginal: career }
    for (const question of questions) record[question.key] = questionHeaders.has(question.key) ? cleanValue(row[questionHeaders.get(question.key)]) : ''
    return record
  }).filter((record) => record.numeroIdentificacion)
  const deduplicated = deduplicateRecords(records)
  return { records: deduplicated.records, duplicates: deduplicated.duplicates, errors: [], warnings: missing.length ? [`${file.name}: no se encontraron ${missing.length} preguntas; se mostrarán sin respuestas.`] : [], format: 'ancho', fileName: file.name, career }
}

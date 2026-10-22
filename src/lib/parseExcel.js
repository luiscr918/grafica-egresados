import * as XLSX from 'xlsx'
import { questions } from './questions'
import { cleanValue, deduplicateRecords, matchQuestion, normalizeHeader, toIdString } from './normalize'

const requiredKeys = questions.map((question) => question.key)

function findHeader(headers, candidates) {
  return headers.find((header) => candidates.includes(normalizeHeader(header)))
}

function emptyRecord(id, career) {
  return { numeroIdentificacion: id, carrera: career, ...Object.fromEntries(requiredKeys.map((key) => [key, ''])) }
}

function parseWide(rows, headers, fileName) {
  const idHeader = findHeader(headers, ['numeroidentificacion', 'identificacion', 'cedula', 'cedulaidentidad'])
  const careerHeader = findHeader(headers, ['carrera', 'programa', 'nombrecarrera', 'carreraestudiada'])
  const missing = requiredKeys.filter((key) => !findHeader(headers, [normalizeHeader(key)]))
  if (!idHeader) return { records: [], errors: [`${fileName}: falta la columna numeroIdentificacion.`], warnings: [], format: null }
  if (missing.length) return { records: [], errors: [`${fileName}: faltan columnas: ${missing.join(', ')}.`], warnings: [], format: null }

  const records = rows.map((row) => {
    const record = emptyRecord(toIdString(row[idHeader]), careerHeader ? cleanValue(row[careerHeader]) : '')
    for (const key of requiredKeys) {
      const header = findHeader(headers, [normalizeHeader(key)])
      record[key] = cleanValue(row[header])
    }
    return record
  }).filter((record) => record.numeroIdentificacion)

  return { records, errors: [], warnings: [], format: 'ancho' }
}

function parseLong(rows, headers, fileName) {
  const idHeader = findHeader(headers, ['numeroidentificacion', 'identificacion', 'cedula', 'cedulaidentidad'])
  const questionHeader = findHeader(headers, ['descripcionpregunta', 'pregunta', 'descripcion'])
  const answerHeader = findHeader(headers, ['respuesta', 'answer'])
  const errors = []
  if (!idHeader) errors.push(`${fileName}: falta la columna numeroIdentificacion.`)
  if (!questionHeader) errors.push(`${fileName}: falta la columna descripcionPregunta.`)
  if (!answerHeader) errors.push(`${fileName}: falta la columna respuesta.`)
  if (errors.length) return { records: [], errors, warnings: [], format: null }

  const grouped = new Map()
  const warnings = []
  let repeatedAnswers = 0
  for (const row of rows) {
    const id = toIdString(row[idHeader])
    if (!id) continue
    const matched = matchQuestion(row[questionHeader])
    if (!matched) {
      warnings.push(`${fileName}: pregunta no mapeada: ${String(row[questionHeader] ?? '').trim()}`)
      continue
    }
    if (matched.approximate) warnings.push(`${fileName}: pregunta asociada por coincidencia aproximada: ${String(row[questionHeader]).trim()}`)
    if (!grouped.has(id)) grouped.set(id, emptyRecord(id, ''))
    const record = grouped.get(id)
    if (record[matched.key]) repeatedAnswers += 1
    record[matched.key] = cleanValue(row[answerHeader])
  }
  if (repeatedAnswers) warnings.push(`${fileName}: se descartaron ${repeatedAnswers} respuestas repetidas para la misma persona y pregunta.`)
  return { records: [...grouped.values()], errors: [], warnings, format: 'largo' }
}

export async function parseExcelFile(file) {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array', cellText: true, cellDates: false })
  const sheet = workbook.Sheets.Hoja1 || workbook.Sheets[workbook.SheetNames[0]]
  if (!sheet) return { records: [], errors: [`${file.name}: no existe la hoja Hoja1.`], warnings: [], format: null, fileName: file.name }

  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false })
  if (!rows.length) return { records: [], errors: [`${file.name}: la hoja está vacía.`], warnings: [], format: null, fileName: file.name }
  const headers = Object.keys(rows[0])
  const headerSet = new Set(headers.map(normalizeHeader))
  const isLong = headerSet.has('descripcionpregunta') || headerSet.has('pregunta')
  const parsed = isLong ? parseLong(rows, headers, file.name) : parseWide(rows, headers, file.name)
  const deduplicated = deduplicateRecords(parsed.records)
  if (deduplicated.duplicates) parsed.warnings.push(`${file.name}: se descartaron ${deduplicated.duplicates} egresados duplicados.`)
  return { ...parsed, records: deduplicated.records, duplicates: deduplicated.duplicates, fileName: file.name }
}

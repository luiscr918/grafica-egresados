import { questions } from './questions'

export function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[¿?¡!.,:;()[\]{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function normalizeHeader(value) {
  return normalizeText(value).replace(/[\s_\-]+/g, '')
}

export function cleanValue(value) {
  const text = String(value ?? '').trim()
  if (!text) return ''
  const normalized = normalizeText(text)

  const aliases = {
    si: 'Sí',
    no: 'No',
    'no aplica': 'No aplica',
    na: 'No aplica',
    'muy bueno': 'Muy bueno',
    'muy buena': 'Muy bueno',
    excelente: 'Excelente',
    regular: 'Regular',
    deficiente: 'Deficiente',
    neutral: 'Neutral',
    'solo estudia': 'Solo estudia',
    'estudia y trabaja': 'Estudia y trabaja',
    'tiempo completo': 'Tiempo completo',
    'medio tiempo': 'Medio tiempo',
    'tiempo parcial': 'Medio tiempo',
  }

  return aliases[normalized] || text.replace(/\s+/g, ' ').replace(/^(.)/, (match) => match.toUpperCase())
}

const questionAliases = new Map(questions.map((question) => [normalizeText(question.title), question.key]))

export function matchQuestion(value) {
  const normalized = normalizeText(value)
  if (!normalized) return null
  const exact = questionAliases.get(normalized)
  if (exact) return { key: exact, approximate: false }

  const rules = [
    ['formacion carrera', 'formacion_carrera'],
    ['plazas empleo', 'plazas_empleo'],
    ['plazas de empleo', 'plazas_empleo'],
    ['personal administrativo', 'satisfaccion_administrativo'],
    ['auto identificacion etnica', 'etnia'],
    ['conseguido trabajo', 'trabajo_ascenso'],
    ['ascenso gracias', 'trabajo_ascenso'],
    ['maestria tecnologica', 'interes_maestria'],
    ['planta docente', 'satisfaccion_docente'],
    ['recomendaria estudiar', 'recomendaria'],
    ['actualidad usted', 'situacion_actual'],
    ['rango de edad', 'rango_edad'],
    ['tipo de contrato', 'tipo_contrato'],
    ['conocimientos obtenidos', 'conocimientos_utiles'],
    ['desempeno laboral', 'conocimientos_utiles'],
  ]
  const match = rules.find(([phrase]) => normalized.includes(phrase))
  return match ? { key: match[1], approximate: true } : null
}

export function toIdString(value) {
  if (value === null || value === undefined || value === '') return ''
  return String(value).trim()
}

export function deduplicateRecords(records) {
  const seen = new Set()
  let duplicates = 0
  const unique = []
  for (const record of records) {
    if (!record.numeroIdentificacion) continue
    if (seen.has(record.numeroIdentificacion)) {
      duplicates += 1
      continue
    }
    seen.add(record.numeroIdentificacion)
    unique.push(record)
  }
  return { records: unique, duplicates }
}

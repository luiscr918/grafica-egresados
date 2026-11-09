import { questions } from './questions'

export function normalizeText(value) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[¿?¡!.,:;()[\]{}]/g, ' ').replace(/\s+/g, ' ').trim()
}

export function normalizeHeader(value) { return normalizeText(value).replace(/[\s_\-]+/g, '') }
export function cleanValue(value) {
  const text = String(value ?? '').trim()
  if (!text) return ''
  const normalized = normalizeText(text)
  if (normalized === 'si') return 'Sí'
  if (normalized === 'no') return 'No'
  return text.replace(/\s+/g, ' ')
}
export function toIdString(value) { return value === null || value === undefined ? '' : String(value).trim() }
export function deduplicateRecords(records) {
  const seen = new Set(); const unique = []; let duplicates = 0
  for (const record of records) { if (!record.numeroIdentificacion || seen.has(record.numeroIdentificacion)) { if (record.numeroIdentificacion) duplicates += 1; continue } seen.add(record.numeroIdentificacion); unique.push(record) }
  return { records: unique, duplicates }
}
export function splitAnswers(value) { return cleanValue(value).split(';').map((item) => item.trim()).filter(Boolean) }
export function questionMatch(header) {
  const normalized = normalizeText(header)
  if (!normalized || normalized.startsWith('puntos ') || normalized.startsWith('comentarios ')) return null
  const rules = [
    ['trabajando', 'trabajando'], ['tipo de organizacion', 'organizacion'], ['cargo que desempena', 'relacion_formacion'], ['cual es su cargo', 'cargo_actual'], ['tiempo le tomo', 'tiempo_primer_empleo'], ['suficientes oportunidades', 'oportunidades_laborales'], ['ventajas competitivas', 'ventajas_titulo'], ['obstaculos para conseguir', 'obstaculos_empleo'], ['contenidos academicos', 'contenidos_actualizados'], ['competencias o habilidades', 'competencias_utiles'], ['areas o competencias', 'competencias_fortalecer'], ['proyectos integradores', 'preparacion_laboral'], ['mejoras propondria', 'mejoras_malla'], ['docentes contaban', 'preparacion_docente'], ['taller curso adicional', 'formacion_adicional'], ['recomendaria el itsqmet', 'recomendaria_itsqmet'], ['aspectos destacaria', 'aspectos_itsqmet'], ['sugerencias daria', 'sugerencias_estudiantes'], ['tipo de formacion', 'formacion_continuar'],
  ]
  const found = rules.find(([phrase]) => normalized.includes(phrase))
  return found?.[1] || null
}

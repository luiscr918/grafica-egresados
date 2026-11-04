import { normalizeText } from './normalize'

const careerFamilies = [
  ['Administración', ['administracion de empresas e inteligencia de negocios', 'administracion']],
  ['Contabilidad', ['contabilidad y tributacion', 'contabilidad']],
  ['Desarrollo de Software', ['desarrollo de software y ciberseguridad', 'desarrollo de software']],
  ['Educación Básica', ['educacion basica']],
  ['Educación Inicial', ['educacion inicial']],
  ['Enfermería', ['enfermeria']],
  ['Estética Integral', ['estetica integral']],
  ['Gastronomía', ['gastronomia']],
  ['Gestión del Talento Humano', ['gestion del talento humano', 'administracion de talento humano']],
  ['Marketing Digital y Comercio Electrónico', ['marketing digital y comercio electronico', 'marketing digital online']],
  ['Mecánica Automotriz', ['mecanica automotriz']],
  ['Pedagogía', ['pedagogia']],
  ['Procesamiento de Alimentos', ['procesamiento de alimentos']],
  ['Redes y Telecomunicaciones', ['redes y telecomunicaciones']],
  ['Seguridad Ciudadana y Orden Público', ['seguridad ciudadana y orden publico']],
  ['Seguridad y Prevención de Riesgos Laborales', ['seguridad y prevencion de riesgos laborales']],
  ['Ventas', ['ventas']],
]

export function getCareerFamily(value) {
  const normalized = normalizeText(value)
  const matches = careerFamilies
    .flatMap(([family, aliases]) => aliases.map((alias) => ({ family, alias })))
    .filter(({ alias }) => normalized.includes(alias))
    .sort((a, b) => b.alias.length - a.alias.length)
  return matches[0]?.family || String(value || 'Sin carrera').trim() || 'Sin carrera'
}

export function getModality(value, career = '') {
  const normalized = normalizeText(value)
  if (normalized.includes('pvc') || normalized.includes('validacion')) return 'PVC'
  if (normalized.includes('linea') || normalizeText(career).includes(' online')) return 'Online'
  return 'Normal'
}

export function getModalityLabel(modality) {
  return modality === 'Online' ? 'Online' : modality === 'PVC' ? 'PVC' : 'Normal'
}

export function getRecordMetadata(record) {
  const career = record.carreraOriginal || record.carrera || ''
  const modalidad = getModality(record.modalidad, career)
  const carreraGeneral = record.carreraGeneral || getCareerFamily(career)
  return { carreraOriginal: career, carreraGeneral, modalidad: getModalityLabel(modalidad), periodoAcademico: record.periodoAcademico || 'Sin período' }
}

export function getCareerDisplayLabel(record) {
  const { carreraOriginal, modalidad } = getRecordMetadata(record)
  const career = carreraOriginal.replace(/\s+online\s*$/i, '').trim()
  if (modalidad === 'Online') return `${career} ONLINE`.trim()
  if (modalidad === 'PVC') return `${career} PVC`.trim()
  return career || 'Sin carrera'
}

export function getCareerFilterKey(record, mode) {
  const metadata = getRecordMetadata(record)
  return mode === 'conjunto' ? normalizeText(metadata.carreraOriginal) : `${normalizeText(metadata.carreraOriginal)} · ${normalizeText(metadata.modalidad)}`
}

export function getCareerFilterLabel(record, mode) {
  if (mode === 'conjunto') return getCareerDisplayLabel(record)
  return getCareerDisplayLabel(record)
}

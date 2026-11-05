import * as XLSX from 'xlsx-js-style'
import { questions } from './questions'
import { getCareerFamily, getModality } from './careerCatalog'
import { cleanValue, normalizeText } from './normalize'
import { formatPercent, getStats } from './stats'

export const indicatorCatalog = {
  formacion_carrera: ['Percepción de la calidad de la formación académica.', 'Nivel de satisfacción con la formación recibida.'],
  plazas_empleo: ['Percepción de la oferta laboral en el área profesional.', 'Percepción de oportunidades de inserción laboral.'],
  satisfaccion_administrativo: ['Nivel de satisfacción con la atención administrativa.', 'Percepción de la calidad del servicio administrativo.', 'Nivel de conformidad con la gestión administrativa.'],
  etnia: ['Distribución de la población estudiantil según autoidentificación étnica.', 'Diversidad étnica de la población estudiantil.'],
  trabajo_ascenso: ['Tasa de inserción laboral atribuida a la formación académica.', 'Tasa de promoción laboral vinculada a los estudios realizados.', 'Impacto de la formación académica en la situación laboral.'],
  interes_maestria: ['Nivel de interés en continuar la formación académica.', 'Demanda potencial de programas de maestría tecnológica.'],
  satisfaccion_docente: ['Nivel de satisfacción con el desempeño docente.', 'Percepción de la calidad de la enseñanza.', 'Nivel de conformidad con la planta docente.'],
  recomendaria: ['Nivel de recomendación institucional.', 'Percepción de satisfacción con la experiencia educativa.', 'Nivel de fidelización y confianza institucional.'],
  situacion_actual: ['Distribución de estudiantes según condición de actividad.', 'Porcentaje de estudiantes que combinan trabajo y estudio.'],
  rango_edad: ['Distribución de la población estudiantil por grupos etarios.', 'Composición demográfica según edad.'],
  tipo_contrato: ['Distribución de estudiantes según modalidad de contratación.', 'Porcentaje de estudiantes según jornada laboral.', 'Condición de vinculación laboral de los estudiantes.'],
  conocimientos_utiles: ['Nivel de aplicación de los conocimientos adquiridos en el entorno laboral.', 'Percepción de pertinencia de la formación académica para el desempeño profesional.', 'Contribución de la formación académica al desempeño laboral.'],
}

const colors = {
  navy: '122B42',
  blue: '118DFF',
  paleBlue: 'E8F3FF',
  line: 'DCE6ED',
  text: '23394C',
  green: 'D9EFD9',
  greenText: '176B39',
  red: 'F8D7DA',
  redText: '9C1C2B',
  yellow: 'FFF0B8',
  yellowText: '765A00',
}

const cellBorder = { top: { style: 'thin', color: { rgb: '718596' } }, bottom: { style: 'thin', color: { rgb: '718596' } }, left: { style: 'thin', color: { rgb: '718596' } }, right: { style: 'thin', color: { rgb: '718596' } } }
const baseCellStyle = { font: { name: 'Aptos', sz: 10, color: { rgb: '000000' } }, border: cellBorder, alignment: { vertical: 'top', wrapText: true } }
const descriptiveQuestionKeys = new Set(['etnia', 'rango_edad', 'tipo_contrato', 'situacion_actual'])

export function getDefaultIndicator(questionKey) {
  return indicatorCatalog[questionKey]?.[0] || 'Indicador de resultados de la encuesta.'
}

function entriesFor(records, question) { return getStats(records, question).entries }

function displayResponse(question, label) {
  return ['formacion_carrera', 'satisfaccion_administrativo', 'satisfaccion_docente'].includes(question.key) && label === 'Muy bueno' ? 'Muy buena' : label
}

function topLabels(previous, current, question) {
  const previousEntries = entriesFor(previous, question)
  const currentEntries = entriesFor(current, question)
  const labels = [...new Set([...previousEntries.slice(0, 3), ...currentEntries.slice(0, 3)].map((entry) => entry.label))]
  return labels.sort((a, b) => {
    const maxA = Math.max(previousEntries.find((entry) => entry.label === a)?.percentage || 0, currentEntries.find((entry) => entry.label === a)?.percentage || 0)
    const maxB = Math.max(previousEntries.find((entry) => entry.label === b)?.percentage || 0, currentEntries.find((entry) => entry.label === b)?.percentage || 0)
    return maxB - maxA || a.localeCompare(b, 'es')
  })
}

function findPercentage(entries, label) { return entries.find((entry) => entry.label === label)?.percentage ?? null }

function formatPoints(value) { return `${Number(value).toFixed(2).replace('.', ',')} puntos porcentuales` }

export function getTrend(previous, current) {
  if (previous === null || current === null) return 'SIN DATOS'
  if (Math.abs(current - previous) < 0.000001) return 'ESTABLE'
  return current > previous ? 'ASCENDENTE' : 'DESCENDENTE'
}

function interpretation(trend, response, previous, current, absolute, relative) {
  if (trend === 'SIN DATOS') return `No es posible comparar la respuesta "${response}" porque falta información en uno de los períodos.`
  const verb = trend === 'ASCENDENTE' ? 'aumentó' : trend === 'DESCENDENTE' ? 'disminuyó' : 'se mantuvo'
  const relativeText = relative === null ? 'no calculable porque el período anterior es 0%' : formatPercent(relative)
  return `El indicador ${verb}: la respuesta "${response}" pasó de ${formatPercent(previous)} a ${formatPercent(current)}, representando una variación absoluta de ${formatPoints(absolute)} y una variación relativa de ${relativeText}.`
}

function descriptiveSentence(comparison) {
  if (comparison.previousPercentage === null && comparison.currentPercentage === null) return ''
  if (comparison.previousPercentage === null) return `La categoría “${comparison.response}” se registró únicamente en el período actual con ${formatPercent(comparison.currentPercentage)}.`
  if (comparison.currentPercentage === null) return `La categoría “${comparison.response}” representaba ${formatPercent(comparison.previousPercentage)} y no registró respuestas en el período actual.`
  return `La categoría “${comparison.response}” pasó del ${formatPercent(comparison.previousPercentage)} al ${formatPercent(comparison.currentPercentage)}.`
}

function descriptiveInterpretation(question, comparisons) {
  const statements = comparisons.map(descriptiveSentence).filter(Boolean)
  const body = statements.length > 1 ? `${statements.slice(0, -1).join(' ')} Por otro lado, ${statements.at(-1)}` : statements[0] || 'No se registraron datos comparables.'
  const endings = {
    etnia: 'Estos resultados permiten identificar cambios en la composición y diversidad étnica de la población estudiantil.',
    rango_edad: 'Estos resultados evidencian cambios en la distribución de los grupos etarios de la población estudiantil.',
    tipo_contrato: 'Estos resultados permiten describir las condiciones de vinculación laboral de los estudiantes.',
    situacion_actual: 'Estos resultados muestran la composición de la población estudiantil según su condición de actividad.',
  }
  const introductions = {
    etnia: 'La composición étnica de la población estudiantil presentó variaciones entre ambos períodos.',
    rango_edad: 'La composición etaria de la población estudiantil presentó variaciones entre ambos períodos.',
    tipo_contrato: 'La distribución de estudiantes según tipo de contrato presentó variaciones entre ambos períodos.',
    situacion_actual: 'La distribución de estudiantes según su condición de actividad presentó variaciones entre ambos períodos.',
  }
  return `${introductions[question.key]} ${body} ${endings[question.key]}`
}

export function compareQuestion(previous, current, question) {
  const previousEntries = entriesFor(previous, question)
  const currentEntries = entriesFor(current, question)
  const comparisons = topLabels(previous, current, question).map((label) => {
    const previousPercentage = findPercentage(previousEntries, label)
    const currentPercentage = findPercentage(currentEntries, label)
    const absolute = previousPercentage === null || currentPercentage === null ? null : currentPercentage - previousPercentage
    const relative = absolute === null || previousPercentage === 0 ? null : absolute / previousPercentage
    const response = displayResponse(question, label)
    const trend = getTrend(previousPercentage, currentPercentage)
    return { response, previousPercentage, currentPercentage, absolute, relative, trend, interpretation: interpretation(trend, response, previousPercentage, currentPercentage, absolute, relative) }
  })
  if (descriptiveQuestionKeys.has(question.key)) {
    const combined = descriptiveInterpretation(question, comparisons)
    return comparisons.map((comparison) => ({ ...comparison, descriptive: true, interpretation: combined }))
  }
  return comparisons
}

export function makeScopeLabel(records) {
  if (!records.length) return 'Sin registros'
  const careers = [...new Set(records.map((record) => getCareerFamily(record.carreraOriginal || record.carrera)).filter(Boolean))]
  const modalities = [...new Set(records.map((record) => getModality(record.modalidad, record.carreraOriginal || record.carrera)).filter(Boolean))]
  if (careers.length === 1 && modalities.length === 1) return `${careers[0]} · ${modalities[0]}`
  return careers.join(', ')
}

export function buildScopes(previous, current) {
  const scopes = [{ key: 'institucional', label: 'Todas las carreras y modalidades', previous, current }]
  const keys = new Map()
  for (const record of [...previous, ...current]) {
    const career = getCareerFamily(record.carreraOriginal || record.carrera)
    const modality = getModality(record.modalidad, record.carreraOriginal || record.carrera)
    const key = `${normalizeText(career)}::${normalizeText(modality)}`
    if (!keys.has(key)) keys.set(key, { key: `scope-${key}`, label: `${career} · ${modality}`, career, modality })
  }
  for (const scope of [...keys.values()].sort((a, b) => a.label.localeCompare(b.label, 'es'))) {
    scopes.push({ ...scope, previous: previous.filter((record) => getCareerFamily(record.carreraOriginal || record.carrera) === scope.career && getModality(record.modalidad, record.carreraOriginal || record.carrera) === scope.modality), current: current.filter((record) => getCareerFamily(record.carreraOriginal || record.carrera) === scope.career && getModality(record.modalidad, record.carreraOriginal || record.carrera) === scope.modality) })
  }
  return scopes
}

export function buildMatrixRows(previous, current, selectedIndicator = {}) {
  return questions.flatMap((question) => compareQuestion(previous, current, question).map((comparison) => ({
    questionKey: question.key,
    question: question.title,
    indicator: selectedIndicator[question.key] || getDefaultIndicator(question.key),
    response: comparison.response,
    previousValue: comparison.previousPercentage,
    currentValue: comparison.currentPercentage,
    absoluteValue: comparison.absolute,
    relativeValue: comparison.relative,
    trend: comparison.trend,
    descriptive: Boolean(comparison.descriptive),
    interpretation: comparison.interpretation,
  })))
}

function styleCell(cell, style = {}) { cell.s = { ...baseCellStyle, ...style, alignment: { ...baseCellStyle.alignment, ...(style.alignment || {}) } }; return cell }

function textCell(value, style = {}) { return styleCell({ t: 's', v: String(value ?? '') }, style) }

function numberCell(value, format = '0.00%', style = {}) { return value === null ? styleCell({ t: 's', v: '' }, style) : styleCell({ t: 'n', v: value / 100, z: format }, style) }

function formulaCell(formula, value, format = '0.00%', style = {}) { return styleCell({ t: typeof value === 'number' ? 'n' : 's', v: value ?? '', f: formula, z: format }, style) }

function trendStyle(trend, descriptive = false) {
  if (descriptive) return { fill: { fgColor: { rgb: 'E8EEF3' } }, font: { name: 'Aptos', sz: 10, bold: true, color: { rgb: '000000' } }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true } }
  if (trend === 'SIN DATOS') return { fill: { fgColor: { rgb: 'EEF2F5' } }, font: { name: 'Aptos', sz: 10, bold: true, color: { rgb: '000000' } }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true } }
  if (trend === 'ASCENDENTE') return { fill: { fgColor: { rgb: colors.green } }, font: { name: 'Aptos', sz: 10, bold: true, color: { rgb: '000000' } }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true } }
  if (trend === 'DESCENDENTE') return { fill: { fgColor: { rgb: colors.red } }, font: { name: 'Aptos', sz: 10, bold: true, color: { rgb: '000000' } }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true } }
  return { fill: { fgColor: { rgb: colors.yellow } }, font: { name: 'Aptos', sz: 10, bold: true, color: { rgb: '000000' } }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true } }
}

function createSheet(scope, previousLabel, currentLabel, selectedIndicator) {
  const rows = buildMatrixRows(scope.previous, scope.current, selectedIndicator)
  const header = ['Pregunta', 'Indicador', 'Respuesta', previousLabel, currentLabel, 'Variación Absoluta', 'Variación Relativa', 'Tendencia', 'Interpretación']
  const data = [
    ['MATRIZ COMPARATIVA DE RESULTADOS DE SEGUIMIENTO A EGRESADOS'],
    [`Ámbito: ${scope.label}`, `Período anterior: ${previousLabel}`, `Período actual: ${currentLabel}`],
    ['Las variaciones se calculan automáticamente con base en los porcentajes de cada período.'],
    header,
  ]
  rows.forEach((row) => data.push([row.question, row.indicator, row.response, row.previousValue, row.currentValue, row.absoluteValue, row.relativeValue, row.trend, row.interpretation]))
  const sheet = XLSX.utils.aoa_to_sheet(data)
  sheet['!cols'] = [{ wch: 48 }, { wch: 48 }, { wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 20 }, { wch: 20 }, { wch: 17 }, { wch: 72 }]
  sheet['!rows'] = [{ hpt: 32 }, { hpt: 24 }, { hpt: 22 }, { hpt: 34 }, ...rows.map(() => ({ hpt: 54 }))]
  sheet['!autofilter'] = { ref: `A4:I${data.length}` }
  sheet['!freeze'] = { xSplit: 0, ySplit: 4 }
  sheet['!merges'] = [XLSX.utils.decode_range('A1:I1'), XLSX.utils.decode_range('A3:I3')]
  let startRow = 5
  let interpretationStartRow = 5
  for (const question of questions) {
    const count = rows.filter((row) => row.questionKey === question.key).length
    if (count > 1) {
      sheet['!merges'].push(XLSX.utils.decode_range(`A${startRow}:A${startRow + count - 1}`))
      sheet['!merges'].push(XLSX.utils.decode_range(`B${startRow}:B${startRow + count - 1}`))
      if (descriptiveQuestionKeys.has(question.key)) sheet['!merges'].push(XLSX.utils.decode_range(`I${interpretationStartRow}:I${interpretationStartRow + count - 1}`))
    }
    startRow += count
    interpretationStartRow += count
  }

  styleCell(sheet.A1, { fill: { fgColor: { rgb: colors.navy } }, font: { name: 'Aptos Display', sz: 15, bold: true, color: { rgb: 'FFFFFF' } }, alignment: { horizontal: 'center', vertical: 'center' } })
  for (const cell of ['A2', 'B2', 'C2']) styleCell(sheet[cell], { fill: { fgColor: { rgb: colors.paleBlue } }, font: { name: 'Aptos', sz: 10, bold: true, color: { rgb: colors.text } }, alignment: { vertical: 'center', wrapText: true } })
  styleCell(sheet.A3, { fill: { fgColor: { rgb: 'F4F7FA' } }, font: { name: 'Aptos', sz: 9, italic: true, color: { rgb: '718194' } } })
  for (let column = 0; column < header.length; column += 1) styleCell(sheet[XLSX.utils.encode_cell({ r: 3, c: column })], { fill: { fgColor: { rgb: colors.navy } }, font: { name: 'Aptos', sz: 10, bold: true, color: { rgb: 'FFFFFF' } }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true } })

  rows.forEach((row, index) => {
    const excelRow = index + 5
    const trend = row.trend
    styleCell(sheet[`A${excelRow}`], { fill: { fgColor: { rgb: index % 2 ? 'F8FBFD' : 'FFFFFF' } }, font: { name: 'Aptos', sz: 10, bold: true, color: { rgb: colors.text } }, alignment: { vertical: 'center', wrapText: true } })
    styleCell(sheet[`B${excelRow}`], { fill: { fgColor: { rgb: index % 2 ? 'F8FBFD' : 'FFFFFF' } }, alignment: { vertical: 'center', wrapText: true } })
    styleCell(sheet[`C${excelRow}`], { fill: { fgColor: { rgb: index % 2 ? 'F8FBFD' : 'FFFFFF' } }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true } })
    sheet[`D${excelRow}`] = numberCell(row.previousValue)
    sheet[`E${excelRow}`] = numberCell(row.currentValue)
    sheet[`F${excelRow}`] = formulaCell(`IF(OR(D${excelRow}=\"\",E${excelRow}=\"\"),\"\",E${excelRow}-D${excelRow})`, row.absoluteValue === null ? null : row.absoluteValue / 100)
    sheet[`G${excelRow}`] = formulaCell(`IF(OR(D${excelRow}=\"\",E${excelRow}=\"\"),\"N/D\",IF(D${excelRow}=0,\"N/D\",F${excelRow}/D${excelRow}))`, row.relativeValue)
    sheet[`H${excelRow}`] = textCell(row.trend, trendStyle(trend, row.descriptive))
    sheet[`I${excelRow}`] = textCell(row.interpretation, trendStyle(trend, row.descriptive))
  })
  return { sheet, rows }
}

function exportWorkbook(scopes, previousLabel, currentLabel, selectedIndicator, suffix) {
  const workbook = XLSX.utils.book_new()
  scopes.forEach((scope, index) => {
    const { sheet } = createSheet(scope, previousLabel, currentLabel, selectedIndicator)
    const baseName = index === 0 ? 'Institucional' : scope.label.slice(0, 25)
    XLSX.utils.book_append_sheet(workbook, sheet, index === 0 ? baseName : `${baseName}-${index}`.slice(0, 31))
  })
  workbook.Workbook = { CalcPr: { calcMode: 'auto', fullCalcOnLoad: true, forceFullCalc: true } }
  XLSX.writeFile(workbook, `matriz_comparativa_${cleanFileName(previousLabel)}_vs_${cleanFileName(currentLabel)}${suffix}.xlsx`, { compression: true })
}

export function exportComparisonWorkbook(scopes, previousLabel, currentLabel, selectedIndicator = {}) {
  exportWorkbook(scopes, previousLabel, currentLabel, selectedIndicator, '')
}

export function exportInstitutionalWorkbook(scope, previousLabel, currentLabel, selectedIndicator = {}) {
  exportWorkbook([scope], previousLabel, currentLabel, selectedIndicator, '_institucional')
}

function cleanFileName(value) { return String(value || 'periodo').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '').toLowerCase() || 'periodo' }

export function normalizeComparisonRecords(records) {
  return records.map((record) => ({ ...record, ...Object.fromEntries(questions.map((question) => [question.key, cleanValue(record[question.key])])) }))
}

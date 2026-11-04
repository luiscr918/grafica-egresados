import { formatPercent } from './stats'

const favorableLabels = new Set(['Excelente', 'Muy bueno'])

export function getTopEntries(stats) {
  if (stats.entries.length <= 3) return stats.entries
  const thirdPlaceCount = stats.entries[2].count
  return stats.entries.filter((entry, index) => index < 3 || entry.count === thirdPlaceCount)
}

function noData() {
  return 'No se registraron respuestas válidas para esta pregunta.'
}

function scopeText(context) {
  return context?.careerLabel || ''
}

function quoted(label) {
  return `“${label}”`
}

function displayLabel(question, label) {
  return ['formacion_carrera', 'satisfaccion_administrativo', 'satisfaccion_docente'].includes(question.key) && label === 'Muy bueno' ? 'Muy buena' : label
}

function percent(entry) {
  return formatPercent(entry.percentage)
}

function categoryStatement(question, entry, scope) {
  const value = quoted(displayLabel(question, entry.label))
  const p = percent(entry)
  const statements = {
    formacion_carrera: `el ${p} de los encuestados considera que la formación adquirida es ${value}`,
    satisfaccion_administrativo: `el ${p} de los encuestados califica la satisfacción con el personal administrativo como ${value}`,
    satisfaccion_docente: `el ${p} de los encuestados califica la satisfacción con la planta docente como ${value}`,
    etnia: `el ${p} de los encuestados se autoidentifica como ${value}`,
    rango_edad: `el ${p} de los encuestados se encuentra en el rango de ${value}`,
    situacion_actual: `el ${p} de los encuestados ${value}`,
    tipo_contrato: contractStatement(entry, scope),
  }
  return statements[question.key] || `el ${p} de los encuestados selecciona la opción ${value}`
}

function binaryStatement(question, entry, scope) {
  const p = percent(entry)
  const isYes = entry.label === 'Sí'
  const value = isYes ? 'sí' : 'no'
  const statements = {
    plazas_empleo: isYes
      ? `el ${p} de los encuestados considera que el área de estudio sí dispone de un adecuado número de plazas de empleo`
      : `el ${p} de los encuestados no considera que exista un número adecuado de plazas de empleo`,
    trabajo_ascenso: isYes
      ? `el ${p} de los encuestados sí ha conseguido trabajo o un ascenso gracias a los estudios obtenidos en el instituto`
      : `el ${p} de los encuestados no ha logrado dicha inserción o promoción laboral mediante su formación académica`,
    interes_maestria: isYes
      ? `el ${p} de los encuestados sí estaría interesado en estudiar una maestría tecnológica en el ITSQMET`
      : `el ${p} de los encuestados no le interesaría estudiar una maestría tecnológica en el ITSQMET`,
    recomendaria: isYes
      ? `el ${p} de los encuestados sí recomendaría estudiar a un amigo o familiar en el ITSQMET`
      : `el ${p} de los encuestados no recomendaría estudiar a un amigo o familiar en el ITSQMET`,
    conocimientos_utiles: isYes
      ? `el ${p} de los encuestados afirma que los conocimientos obtenidos en el instituto sí sirven para enriquecer su desempeño laboral`
      : `el ${p} de los encuestados afirma que los conocimientos obtenidos en el instituto no sirven para enriquecer su desempeño laboral`,
  }
  return statements[question.key] || `el ${p} ${scope} respondió “${value}”`
}

function contractStatement(entry, scope) {
  const p = percent(entry)
  if (entry.label === 'No aplica') return `el ${p} de los encuestados indicó que la pregunta no aplica a su situación`
  return `el ${p} de los encuestados cuenta con un contrato ${entry.label === 'Tiempo completo' ? 'a tiempo completo' : 'a medio tiempo'}`
}

function firstParagraph(question, entries, scope) {
  const statements = entries.map((entry) => question.binary ? binaryStatement(question, entry, scope) : categoryStatement(question, entry, scope))
  const contextPrefix = scope ? `Los resultados reflejan que, ${scope}, ` : 'Los resultados reflejan que '
  if (statements.length === 1) return `${contextPrefix}${statements[0]}.`
  if (statements.length === 2) return `${contextPrefix}${statements[0]}. Por otro lado, ${statements[1]}.`
  const middle = statements.slice(1, -1).join(', ')
  return `${contextPrefix}${statements[0]}. Por otro lado, ${middle}, mientras que ${statements[statements.length - 1]}.`
}

function positiveShare(entries) {
  return entries.filter((entry) => favorableLabels.has(entry.label)).reduce((sum, entry) => sum + entry.percentage, 0)
}

function secondParagraph(question, entries) {
  const first = entries[0]
  const share = positiveShare(entries)
  const yes = entries.find((entry) => entry.label === 'Sí')
  const no = entries.find((entry) => entry.label === 'No')

  switch (question.key) {
    case 'formacion_carrera':
      return share >= 50
        ? `Esta distribución evidencia una percepción mayoritariamente positiva, aunque ${entries.some((entry) => entry.label === 'Neutral') ? 'con una proporción notable de estudiantes que mantiene una postura neutral respecto a la calidad de su formación. ' : ''}En conjunto, estos datos destacan el valor positivo asignado a la educación, al tiempo que sugieren la importancia de continuar fortaleciendo la experiencia académica para elevar el nivel de satisfacción de todo el estudiantado.`
        : 'Esta distribución evidencia una percepción diversa sobre la calidad de la formación. En conjunto, estos datos sugieren la importancia de continuar fortaleciendo la experiencia académica para elevar el nivel de satisfacción de todo el estudiantado.'
    case 'plazas_empleo':
      return yes && yes.percentage >= (no?.percentage || 0)
        ? 'Esta distribución evidencia una percepción mayoritariamente positiva sobre las oportunidades laborales en el campo de estudio, aunque también muestra que una fracción menor no percibe esta misma disponibilidad. En conjunto, estos datos destacan la confianza predominante en el mercado laboral para esta carrera, al tiempo que sugieren la importancia de analizar las razones detrás de la percepción negativa para obtener una visión más completa de la inserción profesional.'
        : 'Esta distribución evidencia una percepción poco favorable sobre las oportunidades laborales en el campo de estudio. En conjunto, estos datos sugieren la importancia de fortalecer la vinculación con el sector productivo y analizar las condiciones que limitan la inserción profesional.'
    case 'satisfaccion_administrativo':
      return share >= 50
        ? 'Esta distribución evidencia una percepción mayoritariamente positiva o neutral sobre el desempeño administrativo, aunque también resalta la presencia de opiniones diversas que sugieren espacios para la mejora en la atención al estudiante. En conjunto, estos datos destacan la valoración favorable que prevalece sobre el personal administrativo, al tiempo que señalan la importancia de atender las áreas de oportunidad para optimizar el servicio institucional y elevar la satisfacción de toda la comunidad estudiantil.'
        : 'Esta distribución evidencia una percepción que requiere atención sobre el desempeño administrativo. En conjunto, estos datos señalan la importancia de revisar las áreas de oportunidad para optimizar el servicio institucional y elevar la satisfacción de la comunidad estudiantil.'
    case 'etnia':
      return entries.length === 1 || first.percentage === 100
        ? 'Esta distribución evidencia una uniformidad total en la autoidentificación étnica dentro del grupo consultado. En conjunto, estos datos destacan la composición demográfica de la muestra en cuanto a la autoidentificación, siendo un aspecto relevante para caracterizar al estudiantado de esta modalidad.'
        : 'Esta distribución evidencia una composición étnica diversa dentro del grupo consultado. En conjunto, estos datos aportan información relevante para caracterizar al estudiantado y comprender la composición demográfica de la carrera.'
    case 'trabajo_ascenso':
      return yes && yes.percentage >= (no?.percentage || 0)
        ? 'Esta distribución evidencia que una parte mayoritaria de los estudiantes ha experimentado un impacto directo y positivo de sus estudios en la situación laboral actual. En conjunto, estos datos destacan la contribución de la formación académica a la inserción o promoción profesional.'
        : 'Esta distribución evidencia que, para la mayoría de los estudiantes, los estudios no han tenido un impacto directo y positivo en su situación laboral actual, aunque también muestra que una parte significativa sí ha experimentado beneficios profesionales tangibles. En conjunto, estos datos subrayan la importancia de identificar los factores que limitan o facilitan la conexión entre la educación y el mercado laboral para fortalecer la experiencia profesional de los estudiantes.'
    case 'interes_maestria':
      return yes && yes.percentage >= (no?.percentage || 0)
        ? 'Esta distribución evidencia un interés mayoritario por parte del estudiantado en continuar su formación académica de posgrado dentro de la misma institución. En conjunto, estos datos destacan la oportunidad significativa que representa la oferta de posgrados para esta carrera, al tiempo que sugieren la importancia de considerar este interés en la planificación académica institucional.'
        : 'Esta distribución evidencia un interés limitado por continuar la formación académica de posgrado dentro de la institución. En conjunto, estos datos sugieren la importancia de analizar las necesidades y expectativas del estudiantado respecto a la oferta de cuarto nivel.'
    case 'satisfaccion_docente':
      return share >= 50
        ? 'Esta distribución evidencia una percepción mayoritariamente positiva sobre la calidad de los docentes, aunque también resalta la presencia de opiniones diversas que sugieren oportunidades para fortalecer la experiencia académica. En conjunto, estos datos destacan la valoración favorable que predomina en la carrera, al tiempo que señalan la importancia de atender las expectativas de todos los estudiantes para potenciar la calidad educativa institucional.'
        : 'Esta distribución evidencia una percepción diversa sobre la calidad de los docentes. En conjunto, estos datos señalan la importancia de atender las expectativas del estudiantado y fortalecer la experiencia académica.'
    case 'recomendaria':
      return yes && yes.percentage === 100
        ? 'Esta distribución evidencia un nivel de satisfacción y lealtad institucional absoluto por parte de los estudiantes consultados. En conjunto, estos datos destacan la percepción extremadamente favorable y la confianza que prevalece en la carrera, lo cual es un indicador muy positivo de la experiencia educativa vivida por los alumnos en esta modalidad.'
        : yes && yes.percentage >= (no?.percentage || 0)
          ? 'Esta distribución evidencia un nivel mayoritariamente favorable de satisfacción y confianza institucional. En conjunto, estos datos constituyen un indicador positivo de la experiencia educativa, aunque resulta importante atender las razones de quienes no recomendarían la institución.'
          : 'Esta distribución evidencia una percepción poco favorable sobre la experiencia educativa. En conjunto, estos datos sugieren la importancia de analizar las causas de la baja recomendación y definir acciones de mejora institucional.'
    case 'situacion_actual':
      return first.label === 'Estudia y trabaja'
        ? 'Esta distribución evidencia que la gran mayoría de los estudiantes equilibra sus estudios con actividades laborales. En conjunto, estos resultados subrayan la diversidad de realidades en las que se desenvuelven los alumnos, lo cual es un factor importante para considerar en la planificación académica y el apoyo institucional.'
        : 'Esta distribución evidencia una composición diversa en la situación académica y laboral de los estudiantes. En conjunto, estos resultados constituyen un factor importante para considerar en la planificación académica y el apoyo institucional.'
    case 'rango_edad':
      return 'Esta distribución evidencia una población diversa, con una mayor presencia de estudiantes en las etapas de vida representadas por las categorías predominantes. En conjunto, estos resultados subrayan la heterogeneidad en las edades de los alumnos, lo cual es un factor importante a considerar para la planificación académica y el apoyo institucional.'
    case 'conocimientos_utiles':
      return yes && yes.percentage === 100
        ? 'Esta distribución evidencia una percepción unánime sobre la aplicación práctica y positiva de su formación académica en sus labores diarias. En conjunto, estos datos destacan el valor aplicado de la enseñanza impartida, validando la relevancia de los contenidos académicos frente a las necesidades del entorno laboral para este grupo de estudiantes.'
        : yes && yes.percentage >= (no?.percentage || 0)
          ? 'Esta distribución evidencia una percepción mayoritariamente positiva sobre la aplicación práctica de la formación académica en el desempeño laboral. En conjunto, estos datos destacan la pertinencia de los contenidos impartidos, aunque resulta importante atender las experiencias de quienes no identifican ese aporte.'
          : 'Esta distribución evidencia una percepción poco favorable sobre la aplicación práctica de la formación académica en el desempeño laboral. En conjunto, estos datos sugieren la importancia de revisar la pertinencia de los contenidos y fortalecer su relación con las necesidades del entorno laboral.'
    case 'tipo_contrato':
      return first.label === 'Tiempo completo'
        ? 'Esta distribución evidencia que una mayoría de los estudiantes que trabajan se encuentra bajo una modalidad de tiempo completo, lo cual refleja una integración importante al mercado laboral. En conjunto, estos datos destacan la realidad laboral predominante del grupo, al tiempo que sugieren la importancia de considerar estas condiciones para entender el contexto en el que se desempeñan los estudiantes.'
        : 'Esta distribución evidencia la diversidad de condiciones laborales presentes en el grupo consultado. En conjunto, estos datos destacan la realidad laboral predominante y sugieren la importancia de considerar estas condiciones para comprender el contexto en el que se desempeñan los estudiantes.'
    default:
      return 'Esta distribución permite identificar las principales tendencias del grupo consultado. En conjunto, estos datos constituyen un insumo para el seguimiento institucional y la toma de decisiones.'
  }
}

export function generateAnalysis(question, stats, context = {}) {
  const entries = stats.entries
  if (!stats.total || !entries.length) return noData()
  const scope = scopeText(context)
  const binaryKeys = ['plazas_empleo', 'trabajo_ascenso', 'interes_maestria', 'recomendaria', 'conocimientos_utiles']
  const preparedQuestion = { ...question, binary: binaryKeys.includes(question.key) }
  return `${firstParagraph(preparedQuestion, entries, scope)}\n\n${secondParagraph(question, entries)}`
}

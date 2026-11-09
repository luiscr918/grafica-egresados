import { formatPercent } from './stats'
import { normalizeText } from './normalize'

function findEntry(stats, matcher) {
  return stats.entries.find((entry) => matcher(normalizeText(entry.label)))
}

function percentage(entry) { return entry ? formatPercent(entry.percentage) : '0%' }
function topEntries(stats, limit = 3) { return stats.entries.slice(0, limit) }
function listEntries(entries) { return entries.map((entry) => `${entry.label} (${percentage(entry)})`).join(', ') }
function context(career) { return career ? ` en ${career}` : '' }
function multipleNote(question) {
  return question.multiple
    ? ' Debido a que esta pregunta permitía seleccionar más de una opción, los porcentajes no necesariamente suman 100%; cada valor representa la proporción de graduados que seleccionó esa alternativa.'
    : ''
}

function generalAnalysis(question, stats, career) {
  const top = topEntries(stats)
  return `Los resultados${context(career)} muestran como principales respuestas: ${listEntries(top)}. Esta distribución permite identificar las tendencias predominantes entre los graduados y aporta evidencia para el seguimiento de su trayectoria académica y profesional.\n\nEn conjunto, los datos constituyen un insumo para fortalecer la pertinencia de la formación, orientar acciones de mejora y mantener una relación activa entre la institución, los graduados y el entorno laboral.${multipleNote(question)}`
}

export function generateAnalysis(question, stats, career = '') {
  if (!stats.entries.length) return 'No se registraron respuestas válidas para esta pregunta.'
  const yes = findEntry(stats, (label) => label === 'si' || label === 'sí')
  const no = findEntry(stats, (label) => label === 'no')
  const partial = findEntry(stats, (label) => label.includes('parcial'))
  const top = topEntries(stats)
  const area = career ? ` de ${career}` : ''

  switch (question.key) {
    case 'trabajando': {
      const working = yes?.percentage >= (no?.percentage || 0)
      return `La proporción de graduados${area} que actualmente se encuentra trabajando alcanza el ${percentage(yes)}, mientras que el ${percentage(no)} indica que no tiene empleo al momento de la encuesta. ${working ? 'Este resultado evidencia una inserción laboral favorable y una conexión importante entre la formación recibida y las oportunidades disponibles.' : 'Este resultado evidencia que todavía existen dificultades relevantes para la inserción laboral de una parte importante de la cohorte.'}\n\nLa presencia de graduados que aún no trabajan constituye una oportunidad para fortalecer la bolsa de empleo, la preparación para procesos de selección y la vinculación con instituciones empleadoras. Asimismo, conviene dar seguimiento a las causas asociadas al desempleo para orientar acciones de acompañamiento más específicas.`
    }
    case 'organizacion':
      return `Entre los graduados que respondieron esta pregunta, las organizaciones más frecuentes son ${listEntries(top)}. La distribución evidencia la diversidad de espacios en los que se desempeñan los profesionales y permite reconocer cuáles sectores están absorbiendo principalmente el talento formado por la institución.\n\nEstos resultados pueden orientar el fortalecimiento de convenios y acciones de vinculación con los sectores de mayor presencia. También es importante ampliar las oportunidades hacia otros tipos de organizaciones para diversificar las alternativas de empleo y mejorar la transición de los graduados hacia puestos relacionados con su formación.`
    case 'relacion_formacion':
      return `El ${percentage(yes)} de los graduados señala que su cargo está relacionado con la formación recibida, mientras que el ${percentage(partial)} identifica una relación parcial y el ${percentage(no)} manifiesta que no existe relación. La predominancia de respuestas favorables refleja una pertinencia laboral positiva de la carrera${area}.\n\nSin embargo, la proporción de graduados con relación parcial o nula muestra la necesidad de continuar fortaleciendo las prácticas preprofesionales, la orientación laboral y el contacto con empleadores. Estas acciones pueden facilitar que el primer empleo corresponda de manera más directa con las competencias desarrolladas durante la carrera.`
    case 'cargo_actual':
      return `Los cargos reportados por los graduados presentan como principales respuestas ${listEntries(top)}. Esta distribución permite observar los roles concretos que están ocupando los profesionales y evidencia el nivel de correspondencia entre el perfil de egreso y las funciones que demanda el mercado laboral.\n\nLa variedad de cargos también refleja posibilidades de desempeño más allá de una única ocupación. Se recomienda utilizar esta información para revisar la pertinencia de las competencias profesionales, reforzar los perfiles ocupacionales y promover experiencias prácticas vinculadas con los cargos de mayor demanda.`
    case 'tiempo_primer_empleo': {
      const early = stats.entries.filter((entry) => /menos de 3|entre 3 y 6|entre tres y seis/.test(normalizeText(entry.label))).reduce((sum, entry) => sum + entry.percentage, 0)
      const noEmployment = findEntry(stats, (label) => label.includes('aun no') || label.includes('no consigo'))
      return `El ${formatPercent(early)} de los graduados consiguió su primer empleo durante los primeros seis meses posteriores a la graduación. Las respuestas más frecuentes fueron ${listEntries(top)}, lo que permite valorar la velocidad de inserción laboral de la cohorte.\n\nLa existencia de un ${percentage(noEmployment)} que aún no consigue empleo evidencia que, aunque una parte importante logra incorporarse tempranamente al mercado, persisten casos que requieren acompañamiento. Es conveniente reforzar la preparación para la búsqueda de empleo, la difusión de vacantes y la conexión con organizaciones públicas y privadas.`
    }
    case 'oportunidades_laborales': {
      const positive = findEntry(stats, (label) => label.includes('muchas'))
      const limited = findEntry(stats, (label) => label.includes('algunas') || label.includes('limitadas'))
      const scarce = findEntry(stats, (label) => label.includes('pocas') || label.includes('no existen'))
      return `El ${percentage(positive)} de los graduados percibe que existen muchas oportunidades laborales, mientras que el ${percentage(limited)} considera que las plazas son limitadas y el ${percentage(scarce)} identifica una oferta insuficiente. La percepción predominante permite observar un mercado con oportunidades, aunque condicionado por la competencia y la disponibilidad de vacantes.\n\nEn este contexto, la empleabilidad no depende únicamente de la existencia de plazas, sino también de la experiencia, la especialización y la capacidad de diferenciarse profesionalmente. Por ello, resulta pertinente fortalecer la formación continua, las certificaciones y las estrategias institucionales de vinculación laboral.`
    }
    case 'ventajas_titulo': {
      const clear = findEntry(stats, (label) => label.includes('claras') || label.includes('si ha brindado') || label.includes('proporcionado ventajas competitivas claras'))
      const partialAdvantage = findEntry(stats, (label) => label.includes('algunas ventajas'))
      return `El ${percentage(clear)} de los graduados considera que su título le ha brindado ventajas competitivas claras, mientras que el ${percentage(partialAdvantage)} reconoce beneficios parciales y el ${percentage(no)} no identifica una ventaja determinante. En conjunto, la valoración favorable evidencia que la titulación representa un respaldo importante para la búsqueda y el desempeño laboral.\n\nLas respuestas parciales o negativas sugieren que el título debe complementarse con experiencia, actualización y competencias diferenciadoras. Esto refuerza la importancia de promover certificaciones, prácticas pertinentes y oportunidades de formación continua después de la graduación.`
    }
    case 'obstaculos_empleo':
      return `Los principales obstáculos identificados por los graduados son ${listEntries(top)}. Estos resultados muestran que la inserción laboral está condicionada principalmente por factores del mercado, como la competencia, la disponibilidad de vacantes y la experiencia solicitada por los empleadores.${multipleNote(question)}\n\nLa institución puede responder a estas dificultades mediante el fortalecimiento de prácticas preprofesionales, talleres de empleabilidad, preparación para entrevistas y una red activa de contactos con organizaciones. También resulta conveniente orientar a los graduados sobre certificaciones y estrategias para construir experiencia profesional desde etapas tempranas.`
    case 'contenidos_actualizados':
      return `El ${percentage(yes)} de los graduados considera que los contenidos académicos estuvieron actualizados y alineados con las necesidades del mercado laboral, frente al ${percentage(no)} que expresa una percepción negativa y al ${percentage(partial)} que identifica una actualización parcial. La valoración predominante refleja una percepción favorable de la pertinencia curricular.\n\nNo obstante, las respuestas que señalan desactualización constituyen una oportunidad de mejora. Es recomendable revisar periódicamente la malla curricular con participación de empleadores, graduados y docentes, incorporando nuevas herramientas, metodologías y tendencias propias de cada campo profesional.`
    case 'competencias_utiles':
      return `Las competencias adquiridas que los graduados consideran más útiles son ${listEntries(top)}. La tendencia evidencia que las habilidades aplicadas, técnicas y transversales tienen un papel central en el desempeño profesional y en la capacidad de responder a situaciones reales del trabajo.${multipleNote(question)}\n\nEstos resultados respaldan la importancia de mantener un enfoque práctico y fortalecer la articulación entre asignaturas, proyectos, prácticas y necesidades del sector productivo. Las competencias con menor frecuencia también deben revisarse para determinar si requieren mayor presencia o aplicación en el proceso formativo.`
    case 'competencias_fortalecer':
      return `Las áreas que los graduados consideran prioritario incluir o fortalecer son ${listEntries(top)}. Estas respuestas reflejan las transformaciones del entorno profesional y las expectativas de quienes ya han enfrentado las exigencias del mercado laboral.${multipleNote(question)}\n\nLas sugerencias constituyen una referencia directa para la actualización curricular y la planificación de actividades complementarias. Su incorporación debe priorizar competencias digitales, especializadas y socio-profesionales que permitan mejorar la adaptación, la innovación y la empleabilidad de los futuros graduados.`
    case 'preparacion_laboral':
      return `La valoración de los proyectos integradores, las prácticas preprofesionales y los trabajos de titulación se concentra en ${listEntries(top)}. Esto evidencia el aporte que tienen las experiencias aplicadas para desarrollar competencias, resolver problemas reales y comprender las dinámicas del entorno profesional.\n\nCuando estas actividades son percibidas como parciales o poco significativas, se vuelve necesario revisar su pertinencia, seguimiento y relación con el perfil de egreso. El fortalecimiento de escenarios reales y la retroalimentación de empleadores pueden aumentar su impacto en la preparación laboral.`
    case 'mejoras_malla':
      return `Las mejoras más solicitadas para la malla curricular son ${listEntries(top)}. Las respuestas muestran una demanda por una formación más práctica, actualizada y conectada con las herramientas y situaciones que los graduados encuentran en el ejercicio profesional.${multipleNote(question)}\n\nEstas propuestas pueden convertirse en líneas de mejora curricular mediante la actualización de contenidos, el incremento de actividades prácticas y la incorporación de metodologías innovadoras. La participación periódica de graduados y empleadores ayudaría a verificar que los cambios respondan a necesidades reales.`
    case 'preparacion_docente':
      return `El ${percentage(yes)} de los graduados considera que los docentes contaban con la preparación y experiencia adecuada, mientras que el ${percentage(partial)} identifica una preparación parcial y el ${percentage(no)} expresa una valoración negativa. La percepción favorable constituye un indicador positivo sobre la calidad y pertinencia del acompañamiento docente.\n\nLas respuestas parciales o negativas señalan la importancia de mantener procesos de actualización disciplinar, capacitación pedagógica y conexión de los docentes con el ejercicio profesional. Estas acciones contribuyen a que los conocimientos impartidos se mantengan vigentes y aplicables.`
    case 'formacion_adicional':
      return `Las opciones de formación adicional más recomendadas por los graduados son ${listEntries(top)}. La diversidad de respuestas evidencia interés por continuar desarrollando competencias específicas y complementarias después de finalizar la carrera.\n\nEsta información puede orientar una oferta de talleres, cursos y certificaciones vinculada con las necesidades reales de cada profesión. Priorizar las alternativas más solicitadas permitiría fortalecer la educación continua y mantener el vínculo institucional con los graduados.`
    case 'recomendaria_itsqmet':
      return `El ${percentage(yes)} de los graduados recomendaría el ITSQMET a otras personas interesadas en estudiar la carrera, mientras que el ${percentage(no)} manifiesta que no lo haría. La respuesta favorable constituye un indicador de satisfacción, confianza institucional y valoración de la experiencia formativa.\n\nLa proporción que no recomendaría la institución debe analizarse de manera cualitativa para identificar oportunidades concretas de mejora. Atender esas experiencias permitiría consolidar la reputación institucional y fortalecer la relación con futuros estudiantes y graduados.`
    case 'aspectos_itsqmet':
      return `Los aspectos que los graduados destacan con mayor frecuencia son ${listEntries(top)}. Estos resultados muestran los atributos institucionales que son más visibles y valorados por quienes ya culminaron su proceso formativo.${multipleNote(question)}\n\nLa institución puede utilizar estas fortalezas como elementos de posicionamiento y, al mismo tiempo, revisar los aspectos menos mencionados para determinar si requieren mayor comunicación o mejoras en la experiencia educativa. La combinación de calidad académica, acompañamiento y vinculación laboral resulta clave para la satisfacción integral.`
    case 'sugerencias_estudiantes':
      return `Las sugerencias expresadas por los graduados se concentran principalmente en ${listEntries(top)}. Aunque se trata de respuestas abiertas, estas tendencias permiten reconocer preocupaciones y expectativas relacionadas con la experiencia de los estudiantes actuales.\n\nLas recomendaciones pueden organizarse en acciones de acompañamiento académico, fortalecimiento de la práctica, disponibilidad de recursos y conexión con el entorno laboral. Analizar el contenido completo de las respuestas permitiría convertir estas percepciones en un plan de mejora priorizado y verificable.`
    case 'formacion_continuar':
      return `Las preferencias de formación continua más frecuentes son ${listEntries(top)}. El resultado evidencia que los graduados mantienen interés por ampliar sus conocimientos y mejorar sus oportunidades profesionales mediante estudios posteriores, cursos o certificaciones.\n\nEsta información representa una oportunidad para diseñar una oferta de educación continua alineada con la demanda de cada carrera. Mantener canales de comunicación con los graduados permitiría actualizar periódicamente esta oferta y fortalecer su desarrollo profesional.`
    default:
      return generalAnalysis(question, stats, career)
  }
}

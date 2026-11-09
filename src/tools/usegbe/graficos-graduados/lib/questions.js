const categoryPalette = ['#195B8F', '#D78324', '#6D4C9C', '#248A72', '#B34766', '#4F7C8D', '#8A6F35', '#5F6B3D']

const multipleKeys = new Set(['obstaculos_empleo', 'competencias_utiles', 'competencias_fortalecer', 'mejoras_malla', 'aspectos_itsqmet'])
export const questions = [
  ['trabajando', '¿Actualmente se encuentra trabajando?'],
  ['organizacion', 'Si su respuesta anterior fue "Sí", ¿en qué tipo de organización trabaja?'],
  ['relacion_formacion', '¿El cargo que desempeña está relacionado con su formación profesional?'],
  ['cargo_actual', '¿Cuál es su cargo actual?'],
  ['tiempo_primer_empleo', '¿Cuánto tiempo le tomó conseguir su primer empleo después de graduarse?'],
  ['oportunidades_laborales', '¿Considera que existen suficientes oportunidades laborales en su área profesional en el mercado actual?'],
  ['ventajas_titulo', '¿Considera que su título le ha brindado ventajas competitivas en el mercado laboral?'],
  ['obstaculos_empleo', '¿Cuáles considera que son los principales obstáculos para conseguir empleo en su área profesional? (Puede seleccionar más de una opción)'],
  ['contenidos_actualizados', '¿Considera que los contenidos académicos de la carrera estuvieron actualizados y alineados con las necesidades del mercado laboral?'],
  ['competencias_utiles', '¿Qué competencias o habilidades adquiridas durante la carrera considera que han sido más útiles en su vida laboral? (Puede seleccionar más de una opción)'],
  ['competencias_fortalecer', '¿Cuáles considera que son las áreas o competencias que deberían incluirse o fortalecerse en la carrera? (Puede seleccionar más de una opción)'],
  ['preparacion_laboral', '¿En qué medida los proyectos integradores, prácticas preprofesionales o trabajos de titulación contribuyeron a su preparación laboral?'],
  ['mejoras_malla', '¿Qué mejoras propondría en la malla curricular para hacerla más relevante en el contexto laboral actual? (Puede seleccionar más de una opción)'],
  ['preparacion_docente', '¿Considera que los docentes contaban con la preparación y experiencia adecuada para impartir los conocimientos de la carrera?'],
  ['formacion_adicional', '¿Recomendaría algún taller, curso adicional o certificación que considere relevante para la carrera?'],
  ['recomendaria_itsqmet', '¿Recomendaría el ITSQMET a otras personas interesadas en estudiar esta carrera?'],
  ['aspectos_itsqmet', '¿Qué aspectos destacaría del ITSQMET como institución educativa? (Puede seleccionar más de una opción)'],
  ['sugerencias_estudiantes', '¿Qué sugerencias daría para mejorar la experiencia de los estudiantes actuales?'],
  ['formacion_continuar', '¿Qué tipo de formación le interesaría continuar?'],
].map(([key, title]) => ({ key, title, multiple: multipleKeys.has(key), shortTitle: title.replace(/^¿|\?$/g, '') }))

export const careerOptions = ['Administración', 'Contabilidad', 'Desarrollo de Software', 'Educación Inicial', 'Gestión del Talento Humano', 'Marketing Digital y Comercio', 'Tecnología en Enfermería', 'Redes y Telecomunicaciones', 'Seguridad Ciudadana y Orden Público']

const fixedColors = { Sí: '#118DFF', Si: '#118DFF', No: '#E66C37', 'No aplica': '#9AA0A6' }
export function colorForCategory(category, index = 0) { return fixedColors[category] || categoryPalette[index % categoryPalette.length] }

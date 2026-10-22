const fixedColors = {
  'Muy bueno': '#5B1A8B',
  Excelente: '#8E6CC7',
  Regular: '#2CA02C',
  Deficiente: '#17BECF',
  Neutral: '#1B7F8C',
  Sí: '#118DFF',
  No: '#E66C37',
  'No aplica': '#9AA0A6',
}

const categoryPalette = ['#195B8F', '#D78324', '#6D4C9C', '#248A72', '#B34766', '#4F7C8D', '#8A6F35', '#5F6B3D']

export const questions = [
  { key: 'formacion_carrera', title: '¿Cómo considera la formación adquirida en la carrera?', shortTitle: 'Formación adquirida en la carrera' },
  { key: 'plazas_empleo', title: '¿Considera que el área de estudio dispone de un adecuado número de plazas de empleo?', shortTitle: 'Plazas de empleo' },
  { key: 'satisfaccion_administrativo', title: 'Satisfacción con el personal administrativo', shortTitle: 'Satisfacción administrativa' },
  { key: 'etnia', title: 'Autoidentificación étnica', shortTitle: 'Autoidentificación étnica' },
  { key: 'trabajo_ascenso', title: '¿Ha conseguido trabajo o ascenso gracias a los estudios?', shortTitle: 'Trabajo o ascenso' },
  { key: 'interes_maestria', title: '¿Le interesaría estudiar una maestría tecnológica en el ITSQMET?', shortTitle: 'Interés en maestría' },
  { key: 'satisfaccion_docente', title: 'Satisfacción con la planta docente', shortTitle: 'Satisfacción docente' },
  { key: 'recomendaria', title: '¿Recomendaría estudiar en el ITSQMET?', shortTitle: 'Recomendación' },
  { key: 'situacion_actual', title: 'En la actualidad usted:', shortTitle: 'Situación actual' },
  { key: 'rango_edad', title: 'Rango de edad', shortTitle: 'Rango de edad' },
  { key: 'tipo_contrato', title: 'Tipo de contrato', shortTitle: 'Tipo de contrato' },
  { key: 'conocimientos_utiles', title: '¿Los conocimientos le sirven para el desempeño laboral?', shortTitle: 'Conocimientos útiles' },
]

export const questionByKey = Object.fromEntries(questions.map((question) => [question.key, question]))

export const careerOptions = [
  'Administración', 'Administración (Online)', 'Administración de Empresas e Inteligencia de Negocios',
  'Gestión del Talento Humano', 'Gestión del Talento Humano (Online)', 'Administración del Talento Humano',
  'Enfermería', 'Contabilidad', 'Contabilidad (Online)', 'Desarrollo de Software', 'Desarrollo de Software (Online)',
  'Redes y Telecomunicaciones', 'Redes y Telecomunicaciones (Online)', 'Educación Inicial', 'Educación Básica',
  'Pedagogía', 'Procesamiento de Alimentos', 'Mecánica Automotriz', 'Estética Integral',
  'Seguridad Ciudadana y Orden Público', 'Prevención de Riesgos Laborales', 'Marketing Digital y Comercio Electrónico',
  'Contabilidad y Tributación',
]

export function colorForCategory(category, index = 0) {
  return fixedColors[category] || categoryPalette[index % categoryPalette.length]
}

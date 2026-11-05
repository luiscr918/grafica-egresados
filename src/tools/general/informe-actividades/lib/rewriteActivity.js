const replacements = [
  [/\bmandar mensaje\b/gi, 'Enviar comunicación'],
  [/\bmandar correo\b/gi, 'Enviar correo electrónico'],
  [/\bhacer acuerdo\b/gi, 'Coordinar'],
  [/\bverificar\b/gi, 'Verificar'],
  [/\bhacer\b/gi, 'Realizar'],
  [/\bforms\b/gi, 'formulario'],
  [/\bfocus group\b/gi, 'grupo focal'],
  [/\bmasterclass\b/gi, 'Master Class'],
  [/\bmaster class\b/gi, 'Master Class'],
  [/\barts?\b/gi, 'artes'],
  [/\bfutbol\b/gi, 'fútbol'],
  [/\brobotica\b/gi, 'robótica'],
  [/\bpublicacion\b/gi, 'publicación'],
  [/\binforme final\b/gi, 'informe final'],
]

function sentenceCase(value) {
  const text = value.trim().replace(/\s+/g, ' ').replace(/[.]+$/g, '')
  return text ? `${text.charAt(0).toUpperCase()}${text.slice(1)}.` : ''
}

export function inferArea(text) {
  const match = String(text || '').match(/^\s*\[(URI|UFC|USEGBE)\]/i)
  return match ? match[1].toUpperCase() : ''
}

export function cleanActivityText(value) {
  return String(value || '').replace(/^\s*\[(URI|UFC|USEGBE)\]\s*/i, '').trim()
}

export function refineActivity(value) {
  let result = cleanActivityText(value)
  replacements.forEach(([pattern, replacement]) => { result = result.replace(pattern, replacement) })
  result = result.replace(/\s+/g, ' ').replace(/\bde de\b/gi, 'de')
  if (/^(realizar|enviar|coordinar|verificar|dar seguimiento|actualizar|elaborar|organizar|preparar|gestionar|revisar|registrar|recopilar|generar|completar|desarrollar|participar|atender|crear|solicitar|imprimir|publicar|consolidar|validar|difundir|coordinar)/i.test(result)) {
    return sentenceCase(result)
  }
  return sentenceCase(`Dar seguimiento a ${result}`)
}

export function inferCategory(text, area) {
  const value = `${area} ${text}`.toLowerCase()
  if (/convenio|cliee|akea|kfc|itb|red académica/.test(value)) return 'Convenios y relaciones institucionales'
  if (/club|fútbol|robot|casa abierta|certificado/.test(value)) return 'Clubes y formación complementaria'
  if (/master|clase magistral|docente|participante/.test(value)) return 'Coordinación académica y Master Class'
  if (/egresad|graduad|encuesta|focus group|sisacad/.test(value)) return 'Seguimiento a egresados y graduados'
  if (/bolsa|vacante|hoja de vida|perfil|empresa empleadora/.test(value)) return 'Bolsa de empleo'
  if (/noticia|arte|publicación|marketing|difusión/.test(value)) return 'Comunicación y difusión'
  return area === 'URI' ? 'Gestión de relaciones institucionales' : area === 'UFC' ? 'Gestión de formación complementaria' : 'Gestión y seguimiento'
}

const FIELD_LABELS = {
  empresa: 'nombre de la empresa', ruc: 'número de ruc', contacto: 'nombre del contacto', mailContacto: 'mail del contacto',
  telefono: 'teléfono del contacto', cargoContacto: 'cargo del contacto', tipoVacantes: 'tipo de vacantes', numeroVacantes: 'número de vacantes',
  area: 'área para la vacante', funciones: 'funciones a ejecutar', direccion: 'dirección de la vacante', ciudad: 'ciudad', remuneracion: 'remuneración', horario: 'horario laboral',
}

function keyForLabel(label) {
  const normalized = normalize(label)
  return Object.entries(FIELD_LABELS).find(([, value]) => normalize(value) === normalized)?.[0]
}

function normalize(value) { return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim() }

export function parseSolicitud(email) {
  const source = String(email ?? '').replace(/\r/g, '').trim()
  const fields = Object.fromEntries(Object.keys(FIELD_LABELS).map((key) => [key, '']))
  const labelPattern = Object.values(FIELD_LABELS).map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
  const pattern = new RegExp(`(?:^|\\n)\\s*[*-]?\\s*(${labelPattern})\\s*:\\s*([\\s\\S]*?)(?=\\n\\s*[*-]?\\s*(?:${labelPattern})\\s*:|$)`, 'gi')
  let match
  while ((match = pattern.exec(source))) {
    const key = keyForLabel(match[1])
    if (key) fields[key] = match[2].trim().replace(/^['"]|['"]$/g, '').replace(/\n+/g, ' ').replace(/\s+/g, ' ')
  }
  return fields
}

export function companyTitle(value) {
  const normalized = normalize(value)
  if (normalized === normalize('Instituto Superior Tecnológico Quito Metropolitano')) return 'ITSQMET'
  return String(value || '').toUpperCase()
}

export function normalName(value) { return String(value || '').trim().replace(/\s+/g, ' ').replace(/^(.)/, (match) => match.toUpperCase()) }

export function suggestVacancy(fields) {
  const functions = fields.funciones || ''
  const match = functions.match(/^\s*como\s+([^,]+),/i)
  if (/supervisar y controlar el inventario/i.test(functions) && /taller mec[aá]nico/i.test(functions)) return 'Supervisor de Inventarios – Taller Mecánico'
  return match ? normalName(match[1]) : ''
}

export function suggestIntro(fields) {
  const company = normalName(fields.empresa)
  let summary = (fields.funciones || '').replace(/^\s*como\s+[^,]+,\s*tu rol abarca\s*/i, '').split(/[.;]/)[0].trim()
  summary = summary.replace(/^\W+|\W+$/g, '')
  if (summary.length > 200) { const shortened = summary.slice(0, 200); summary = `${shortened.slice(0, shortened.lastIndexOf(' ')).replace(/[ ,;:]+$/, '')}...` }
  return company && summary ? `${company} busca talento para ${summary}.` : ''
}

export function suggestLocation(fields) {
  const city = normalName(fields.ciudad)
  const address = fields.direccion || ''
  const barrio = address.match(/\b(?:barrio|sector)\s+([^,.;]+)/i)?.[1]
  const beforeCity = address.match(/^(.+?)\s*-\s*(?:quito|guayaquil|cuenca)\b/i)?.[1]
  const sector = (barrio || beforeCity || '').replace(/\s+/g, ' ').trim().replace(/["'.]+$/g, '')
  const formattedSector = normalName(sector || city).replace(/^El\b/, 'el')
  return city ? `${city}|Sector ${formattedSector}` : ''
}

export function suggestFunctions(value) {
  const source = String(value || '').trim()
  const hasOther = /entre otras/i.test(source)
  const clean = source.replace(/\bentre otras(?: actividades)?\.?/gi, '').trim()
  const parts = clean.split(/[.;]+/).map((item) => item.trim()).filter(Boolean)
  const result = []
  for (const part of parts) {
    if (part.length < 35 && result.length) result[result.length - 1] += ` ${part}`
    else result.push(part)
  }
  const limited = result.slice(0, 3)
  if (hasOther && limited.length) limited[limited.length - 1] = `${limited[limited.length - 1].replace(/[.]$/, '')} Entre otras.`
  return limited
}

function formatHour(hour, minutes, suffix) {
  let numeric = Number(hour)
  if (suffix?.toLowerCase() === 'pm' && numeric < 12) numeric += 12
  if (suffix?.toLowerCase() === 'am' && numeric === 12) numeric = 0
  const isPm = numeric >= 12
  let shown = numeric % 12 || 12
  if (suffix === undefined && shown === 0) shown = 12
  return `${String(shown).padStart(1, '0')}:${minutes || '00'} ${isPm ? 'p. m.' : 'a. m.'}`
}

export function normalizeSchedule(value) {
  const source = String(value || '').toLowerCase()
  const dayText = /lunes\s+a\s+viernes|lunes\s*-\s*viernes/.test(source) ? 'lunes a viernes' : 'lunes a viernes'
  const hours = source.match(/(\d{1,2})(?::|h)?(\d{2})?\s*(am|pm|a\.\s*m\.|p\.\s*m\.)?\s*(?:a|hasta|-|–)\s*(\d{1,2})(?::|h)?(\d{2})?\s*(am|pm|a\.\s*m\.|p\.\s*m\.)?/i)
  if (!hours) return value || ''
  const startSuffix = hours[3]?.replace(/\./g, '').replace(/\s/g, '')
  const endSuffix = hours[6]?.replace(/\./g, '').replace(/\s/g, '') || startSuffix
  return `${dayText}, de ${formatHour(hours[1], hours[2], startSuffix)} a ${formatHour(hours[4], hours[5], endSuffix)}`
}

export function areaTag(value) { return String(value || '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim().split(/\s+/).map((part) => normalName(part)).join('') }

export function buildInitialForm(fields) {
  const empresa = companyTitle(fields.empresa)
  const ciudad = String(fields.ciudad || '').toUpperCase()
  const shortCompany = empresa.split(/\s+/)[0] || ''
  const vacancy = suggestVacancy(fields)
  const hashtags = `#GraduadosITSQMET #OfertaLaboral #AlumniITSQMET #BolsaDeEmpleo #${areaTag(fields.area)} #Empleo${normalName(fields.ciudad).replace(/\s+/g, '') || 'Quito'} #OportunidadLaboral #ITSQMET`
  return { empresa, ciudad, nombreVacante: vacancy, intro: suggestIntro(fields), ubicacion: suggestLocation(fields), formacion: fields.area ? `Tecnólogo Superior en ${fields.area} o carreras afines.` : '', funciones: suggestFunctions(fields.funciones), horario: normalizeSchedule(fields.horario), enlace: '', fechaLimite: '', asunto: vacancy ? `Hoja de Vida – ${vacancy} ${shortCompany}` : '', hashtags, imagenes: [] }
}

export const exampleNexsys = `Hola Yesenia Ortega, tienes una solicitud nueva en tu bandeja de bolsa de empleo ITSQMET, verifica los siguientes datos:\n* Nombre de la empresa: Nexsys del Ecuador\n* Número de RUC: 1791726537001\n* Nombre del Contacto: Verónica Enriquez\n* Mail del contacto: JefeTTHH@nexsysla.com\n* Teléfono del contacto: +593985375355\n* Cargo del contacto: Jefa de Talento Humano\n* Tipo de Vacantes: Oferta de empleo formal\n* Número de Vacantes: 1\n* Área para la vacante: Diseño Multimedia\n* Funciones a ejecutar: Como especialista técnico de preventas, tu rol abarca brindar soporte experto a lo largo de todo el ciclo comercial mediante demostraciones de alto impacto, validaciones técnicas y acompañamiento directo a clientes y socios, además de diseñar e impartir capacitaciones clave para el desarrollo de los partners; para lograrlo, es fundamental contar con un sólido dominio de las herramientas de Adobe, así como con una comprensión profunda de los flujos de trabajo creativos y la gestión eficiente de activos digitales.\n* Dirección de la vacante: El Batán- Quito Norte\n* Ciudad: Quito\n* Remuneración: 482 482\n* Horario Laboral: De Lunes a Viernes de 8:30 am a 6:00 pm\nRecuerda dar una respuesta oportuna.`

export const exampleItsqmet = `* Nombre de la empresa: Instituto Superior Tecnológico Quito Metropolitano\n* Área para la vacante: Contabilidad\n* Funciones a ejecutar: Supervisar y controlar el inventario de materiales, herramientas, repuestos e insumos del taller mecánico del ITSQMET. Registrar las entradas y salidas de productos, verificar las existencias, mantener actualizada la información del inventario y elaborar reportes de control. Apoyar en la organización y almacenamiento de los materiales, garantizando su adecuado uso y disponibilidad. Entre otras\n* Dirección de la vacante: Calle Carán N3-195 y Calle B, barrio La Tola, frente a la Iglesia de La Tola.\n* Ciudad: Quito\n* Remuneración: 530 530\n* Horario Laboral: 8am-5pm`

export function runParserExamples() {
  const first = buildInitialForm(parseSolicitud(exampleNexsys))
  const second = buildInitialForm(parseSolicitud(exampleItsqmet))
  return { nexsys: first, itsqmet: second, passed: first.nombreVacante === 'Especialista técnico de preventas' && first.ubicacion === 'Quito|Sector el Batán' && first.horario.includes('8:30 a. m. a 6:00 p. m.') && second.empresa === 'ITSQMET' && second.nombreVacante === 'Supervisor de Inventarios – Taller Mecánico' && second.ubicacion === 'Quito|Sector La Tola' && second.horario.includes('8:00 a. m. a 5:00 p. m.') }
}

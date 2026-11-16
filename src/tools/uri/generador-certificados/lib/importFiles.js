import * as XLSX from 'xlsx'
import { civilTime, clean, emailKey, headerKey, nameKey, normalize, unionSeconds } from './model.js'

export const FORM_COLUMNS = {
  name: { label: 'Nombre completo', patterns: ['apellidosynombres', 'nombresyapellidos', 'nombrecompleto'] },
  identity: { label: 'Cédula / identificación', patterns: ['numerodecedula', 'cedula', 'identificacion', 'numeroidentificacion'] },
  institutionalEmail: { label: 'Correo institucional', patterns: ['correoelectronicoinstitucional', 'correoinstitucional'] },
  personalEmail: { label: 'Correo personal', patterns: ['correoelectronicopersonal', 'correopersonal', 'correoelectronico'] },
  institution: { label: 'Institución', patterns: ['institucionalaquepertenece', 'institucion'] },
}

function findColumn(headers, candidates) { return headers.findIndex((h) => candidates.includes(headerKey(h))) }

export function formTable(rows) {
  const headerIndex = rows.findIndex((row) => row.some((cell) => FORM_COLUMNS.name.patterns.includes(headerKey(cell))))
  const index = headerIndex < 0 ? 0 : headerIndex
  const headers = (rows[index] || []).map(clean)
  return { headers, rows: rows.slice(index + 1).filter((r) => r.some((v) => clean(v))), mapping: Object.fromEntries(Object.entries(FORM_COLUMNS).map(([key, config]) => [key, findColumn(headers, config.patterns)])) }
}

export function parseForms(table, mapping = table.mapping) {
  if (Number(mapping.name) < 0 || !table.headers.length) throw new Error('Selecciona la columna de nombres completos de Forms.')
  const groups = new Map(), warnings = []
  let blankNames = 0
  for (const [index, row] of table.rows.entries()) {
    const name = clean(row[Number(mapping.name)])
    if (!name) { blankNames++; continue }
    const identity = clean(row[Number(mapping.identity)]).replace(/\s/g, '')
    const emails = [...new Set([mapping.institutionalEmail, mapping.personalEmail].map((i) => Number(i) >= 0 ? emailKey(row[Number(i)]) : '').filter((v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)))]
    // No name-only deduplication: different people may share a name.
    const key = identity ? `id:${identity}` : emails.length ? `email:${emails[0]}` : `row:${index}`
    const consentIssue = table.headers.some((h, i) => /autoriza/.test(normalize(h)) && /^(no|no autorizo)\b/.test(normalize(row[i])))
    const existing = groups.get(key)
    if (existing) {
      existing.emails = [...new Set([...existing.emails, ...emails])]
      existing.names = [...new Set([...existing.names, name])]
      existing.consentIssue ||= consentIssue
      existing.responses++
    } else groups.set(key, { id: `forms-${key}`, name, names: [name], emails, institution: clean(row[Number(mapping.institution)]), consentIssue, responses: 1 })
  }
  if (!groups.size) throw new Error('Forms no contiene registros con nombre en la columna seleccionada.')
  if (blankNames) warnings.push(`${blankNames} respuestas sin nombre se omitieron.`)
  const duplicates = [...groups.values()].reduce((sum, p) => sum + p.responses - 1, 0)
  if (duplicates) warnings.push(`${duplicates} respuestas repetidas se consolidaron por identificación o correo.`)
  return { registrations: [...groups.values()], responseCount: table.rows.length, duplicates, warnings }
}

export function parseTeamsDate(value, dateOrder = 'mdy') {
  if (value instanceof Date) return Date.UTC(value.getFullYear(), value.getMonth(), value.getDate(), value.getHours(), value.getMinutes(), value.getSeconds()) / 1000
  const text = clean(value).replace(/\u200e/g, '')
  const iso = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}(?::\d{2})?)/.exec(text)
  if (iso) return civilTime(iso[1], iso[2])
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM|a\.?\s*m\.?|p\.?\s*m\.?)?$/i.exec(text)
  if (!match) return NaN
  let [, first, second, year, hour, minute, seconds = '0', meridiem] = match
  year = Number(year) < 100 ? 2000 + Number(year) : Number(year)
  let month = dateOrder === 'mdy' ? first : second, day = dateOrder === 'mdy' ? second : first
  hour = Number(hour)
  if (meridiem) { if (hour < 1 || hour > 12) return NaN; hour = hour % 12 + (/^p/i.test(meridiem) ? 12 : 0) }
  return civilTime(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`, `${String(hour).padStart(2, '0')}:${minute}:${seconds.padStart(2, '0')}`)
}

export function parseDuration(value) {
  const text = normalize(value)
  const clock = /^(\d+):(\d{2})(?::(\d{2}))?$/.exec(text)
  if (clock) return Number(clock[1]) * (clock[3] === undefined ? 60 : 3600) + Number(clock[2]) * (clock[3] === undefined ? 1 : 60) + Number(clock[3] || 0)
  let seconds = 0
  for (const match of text.matchAll(/(\d+(?:[.,]\d+)?)\s*(h(?:oras?)?|min(?:utos?)?|s(?:egundos?)?)\b/g)) seconds += Number(match[1].replace(',', '.')) * (match[2][0] === 'h' ? 3600 : match[2][0] === 'm' ? 60 : 1)
  return seconds
}

export function parseDelimited(text) {
  const counts = { '\t': 0, ';': 0, ',': 0 }
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '"') { if (inQuotes && text[i + 1] === '"') i++; else inQuotes = !inQuotes }
    else if (!inQuotes && text[i] in counts) counts[text[i]]++
  }
  const delimiter = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0]
  const rows = [], row = []
  let field = '', quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (c === '"') { if (quoted && text[i + 1] === '"') { field += '"'; i++ } else quoted = !quoted }
    else if (!quoted && (c === delimiter || c === '\n' || c === '\r')) {
      row.push(field); field = ''
      if (c !== delimiter) { rows.push([...row]); row.length = 0; if (c === '\r' && text[i + 1] === '\n') i++ }
    } else field += c
  }
  if (quoted) throw new Error('El archivo de texto contiene comillas sin cerrar.')
  if (field || row.length) { row.push(field); rows.push([...row]) }
  return rows
}

export function readSheets(buffer, filename) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  if (/\.(csv|tsv|txt)$/i.test(filename)) {
    const utf16 = bytes[0] === 255 && bytes[1] === 254 || bytes[1] === 0
    const be = bytes[0] === 254 && bytes[1] === 255
    let text = new TextDecoder(be ? 'utf-16be' : utf16 ? 'utf-16le' : 'utf-8').decode(bytes).replace(/^\uFEFF/, '')
    if (!utf16 && !be && text.includes('\uFFFD')) text = new TextDecoder('windows-1252').decode(bytes)
    return [{ name: 'Registro', rows: parseDelimited(text) }]
  }
  const book = XLSX.read(bytes, { type: 'array', cellDates: false })
  return book.SheetNames.map((name) => ({ name, rows: XLSX.utils.sheet_to_json(book.Sheets[name], { header: 1, defval: '', raw: false, blankrows: true }) }))
}

export function parseTeams(rows, dateOrder = 'mdy') {
  const people = new Map(), warnings = []
  let mode = '', columns = null, invalid = 0, activityRows = 0
  const summary = {}
  const getPerson = (name, email, upn, role) => {
    const address = emailKey(email || upn)
    const id = `teams-${address || normalize(name)}`
    if (!people.has(id)) people.set(id, { id, name: clean(name), emails: [...new Set([emailKey(email), emailKey(upn)].filter(Boolean))], teamsRole: clean(role), sessions: [], reportedSeconds: 0 })
    return people.get(id)
  }
  for (const row of rows) {
    const first = normalize(row[0])
    if (!row.some((c) => clean(c))) continue
    if (/^\d+\.\s/.test(first) && row.filter((c) => clean(c)).length === 1) { mode = first.includes('actividad') || first.includes('activit') ? 'activities' : first.includes('participant') ? 'participants' : 'summary'; columns = null; continue }
    if (['titulodelareunion', 'meetingtitle', 'horadeinicio', 'starttime', 'horadefinalizacion', 'endtime'].includes(headerKey(row[0]))) summary[headerKey(row[0])] = clean(row[1])
    const nameIndex = findColumn(row, ['nombre', 'name', 'fullname', 'nombredelparticipante'])
    const startIndex = findColumn(row, ['horadeentrada', 'join time'.replace(' ', ''), 'primeraentrada', 'firstjoin', 'firstjointime', 'jointime'])
    const endIndex = findColumn(row, ['horadesalida', 'leavetime', 'ultimasalida', 'lastleave', 'lastleavetime'])
    if (nameIndex >= 0 && startIndex >= 0 && endIndex >= 0) {
      columns = { name: nameIndex, start: startIndex, end: endIndex, email: findColumn(row, ['correoelectronico', 'email']), upn: findColumn(row, ['iddeparticipanteupn', 'participantidupn']), role: findColumn(row, ['rol', 'role']), duration: findColumn(row, ['duracion', 'duraciondelareunion', 'inmeetingduration', 'duration']) }
      if (!mode || mode === 'summary') mode = headerKey(row[startIndex]).includes('primera') || headerKey(row[startIndex]).includes('first') ? 'participants' : 'activities'
      continue
    }
    if (!columns) continue
    const name = clean(row[columns.name])
    if (!name) continue
    const person = getPerson(name, row[columns.email], row[columns.upn], row[columns.role])
    const start = parseTeamsDate(row[columns.start], dateOrder), end = parseTeamsDate(row[columns.end], dateOrder)
    const duration = parseDuration(row[columns.duration])
    if (mode === 'participants') person.reportedSeconds = duration
    if (mode === 'activities') activityRows++
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) { invalid++; if (mode === 'activities') person.incomplete = true; continue }
    const session = { start, end }
    if (mode === 'activities') person.sessions.push(session)
    else person.summarySession = { ...session, duration }
  }
  if (!people.size) throw new Error('No se encontró una tabla de Teams con Nombre, Hora de entrada/salida o Primera entrada/Última salida.')
  for (const person of people.values()) {
    // A summary spanning reconnections is NOT continuous attendance evidence.
    if (!activityRows && person.summarySession) {
      if (Math.abs(person.summarySession.end - person.summarySession.start - person.summarySession.duration) <= 2) person.sessions.push({ start: person.summarySession.start, end: person.summarySession.end })
      else person.incomplete = true
    }
    if (!person.sessions.length) person.incomplete = true
    delete person.summarySession
  }
  if (invalid) warnings.push(`${invalid} intervalos inválidos se omitieron. Revisa el orden de fecha de Teams (mes/día o día/mes).`)
  const incomplete = [...people.values()].filter((p) => p.incomplete).length
  if (incomplete) warnings.push(`${incomplete} personas sin intervalos completos: se necesita la sección «Actividades de la reunión» para evaluar sus reconexiones.`)
  if (![...people.values()].some((p) => p.sessions.length)) throw new Error('No se pudieron leer intervalos válidos de asistencia. Revisa el formato de fechas o exporta el detalle de actividades de Teams.')
  const moderators = [...people.values()].filter((p) => /moderador|presenter/.test(normalize(p.teamsRole)) && p.sessions.length)
  moderators.sort((a, b) => unionSeconds(b.sessions) - unionSeconds(a.sessions))
  const reference = moderators[0]
  const allSessions = [...people.values()].flatMap((p) => p.sessions)
  const start = reference ? Math.min(...reference.sessions.map((s) => s.start)) : Math.min(...allSessions.map((s) => s.start))
  const end = reference ? Math.max(...reference.sessions.map((s) => s.end)) : Math.max(...allSessions.map((s) => s.end))
  const iso = (stamp) => new Date(stamp * 1000).toISOString()
  return {
    people: [...people.values()], warnings, summary,
    suggestion: { date: iso(start).slice(0, 10), startTime: iso(start).slice(11, 19), endTime: iso(end).slice(11, 19), reference: reference?.name || 'reunión completa (revisar)', title: summary.titulodelareunion || summary.meetingtitle || '' },
  }
}

export function possibleRegistrations(person, registrations) {
  const words = nameKey(person.name || person.originalTeams).split(' ').filter((w) => w.length > 2)
  return registrations.map((r) => ({ registration: r, score: Math.max(...r.names.map((n) => { const other = nameKey(n).split(' '); return words.filter((w) => other.includes(w)).length / Math.max(1, Math.min(words.length, other.length)) })) })).filter((s) => s.score >= .5).sort((a, b) => b.score - a.score).slice(0, 5).map((s) => s.registration.id)
}

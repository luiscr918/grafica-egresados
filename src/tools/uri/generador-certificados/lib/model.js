export const ROLE_LABELS = { organizer: 'Organizadora', speaker: 'Ponente', participant: 'Participante', review: 'Moderación por confirmar', excluded: 'Excluir' }

export const DEFAULT_TEXTS = {
  organizer: 'Por su **destacada coordinación, presentación y liderazgo en la planificación, organización y desarrollo de actividades y eventos institucionales**, en el marco de la Clase Magistral: **«{tema}»**, con una duración de {horas} horas.\n\nEvento organizado e impulsado como representante de la **Unidad de Relaciones Interinstitucionales del ITSQMET**, como parte de las acciones de cooperación interinstitucional desarrolladas con **{institucion}**.\n\nSu gestión permitió articular y ejecutar este espacio académico, orientado al intercambio y actualización de conocimientos en {enfoque}.\n\nSe reconoce especialmente su compromiso, liderazgo y capacidad de coordinación, contribuyendo al fortalecimiento de la comunidad académica y a la generación de espacios de aprendizaje e intercambio de experiencias con impacto institucional y social.',
  speaker: 'Por su **participación como Ponente en la Conferencia Magistral: «{tema}»**.\n\nOrganizada e impulsada por la **Unidad de Relaciones Interinstitucionales del ITSQMET**, en coordinación con **{institucion}**, desarrollada en modalidad {modalidad} con una duración de {horas} horas académicas.\n\nLa actividad tuvo como propósito fomentar la actualización profesional y el intercambio de conocimientos en torno a {enfoque}.',
  participant: 'Por su **participación en la Clase Magistral: «{tema}»**, con una duración de {horas} horas.\n\nOrganizada e impulsada por la **Unidad de Relaciones Interinstitucionales ITSQMET**, en el marco de las acciones de cooperación interinstitucional con **{institucion}**.\n\nLa actividad tuvo como propósito contribuir al fortalecimiento de las competencias profesionales mediante la actualización e intercambio de conocimientos relacionados con {enfoque}.',
}

export function blankEvent() {
  return {
    title: '', institution: '', date: '', startTime: '', endTime: '', windowConfirmed: false,
    percentage: 80, tolerance: 1, modality: 'virtual', focus: '',
    hours: { organizer: 40, speaker: 3, participant: 3 }, texts: { ...DEFAULT_TEXTS },
    organizerName: 'Magali Yesenia Ortega Flores',
    signers: [
      { name: 'Dr. Alex León', title: 'Vicerrectorado ITSQMET' },
      { name: 'MSc. Yesenia Ortega', title: 'Coord. Unidad de Relaciones Interinstitucionales' },
      { name: '', title: '' },
    ],
  }
}

export const clean = (value) => String(value ?? '').replace(/\s+/g, ' ').trim()
export const normalize = (value) => clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
export const headerKey = (value) => normalize(value).replace(/[^a-z0-9]/g, '')
export const emailKey = (value) => clean(value).toLowerCase()
export const nameKey = (value) => normalize(value).replace(/\(.*?\)/g, '').replace(/[^a-z ]/g, ' ').split(/\s+/).filter(Boolean).sort().join(' ')

export function titleCase(value) {
  return clean(value).toLocaleLowerCase('es').split(' ').map((word, i) => i && ['de', 'del', 'la', 'las', 'los', 'y'].includes(word) ? word : word.charAt(0).toLocaleUpperCase('es') + word.slice(1)).join(' ')
}

// A proposal, never a silent correction: imported names need user review.
export function proposeName(formName, teamsName = '') {
  const formWords = clean(formName).split(' ')
  const teamWords = clean(teamsName).split(' ')
  const useTeam = formName && teamWords.length >= 4 && formWords.length < teamWords.length
  const source = clean(useTeam ? teamsName : formName || teamsName).replace(/\s*\((?:externo|invitado|guest|external)\)\s*/ig, '')
  const words = source.split(' ')
  const teamsWords = clean(teamsName).split(' ')
  if (!useTeam && formName && teamsName && nameKey(formName) === nameKey(teamsName) && normalize(words[0]) !== normalize(teamsWords[0])) return titleCase(words.length === 3 ? teamsName : source)
  if (words.length >= 4 && !['de', 'del', 'la'].includes(normalize(words[1]))) return titleCase([...words.slice(2), ...words.slice(0, 2)].join(' '))
  return titleCase(source)
}

export function formatDuration(value) {
  const seconds = Math.max(0, Math.round(Number(value) || 0))
  return `${Math.floor(seconds / 3600)}:${String(Math.floor(seconds % 3600 / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}

// Civil-time seconds, not browser-local instants: Teams dates retain their clock
// time in all time zones. No Date.parse locale guessing.
export function civilTime(date, time) {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date || '')
  const t = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(time || '')
  if (!d || !t) return NaN
  const [year, month, day] = d.slice(1).map(Number)
  const [hour, minute, second = 0] = t.slice(1).map((part) => Number(part || 0))
  if (hour > 23 || minute > 59 || second > 59) return NaN
  const stamp = Date.UTC(year, month - 1, day, hour, minute, second)
  const check = new Date(stamp)
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return NaN
  return stamp / 1000
}

export function windowOf(event) {
  const start = civilTime(event.date, event.startTime)
  const end = civilTime(event.date, event.endTime)
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) throw new Error('Define una fecha y un tramo de clase válido; la hora final debe ser posterior a la inicial.')
  if (!Number.isFinite(Number(event.percentage)) || Number(event.percentage) <= 0 || Number(event.percentage) > 100) throw new Error('La asistencia requerida debe ser mayor que 0 y hasta 100 %.')
  if (clean(event.tolerance) === '' || !Number.isFinite(Number(event.tolerance)) || Number(event.tolerance) < 0) throw new Error('La tolerancia debe ser un número mayor o igual a 0 minutos.')
  const duration = end - start
  return { start, end, duration, strict: Math.ceil(duration * Number(event.percentage) / 100), minimum: Math.max(0, Math.ceil(duration * Number(event.percentage) / 100 - Number(event.tolerance) * 60)) }
}

export function policyKey(event) {
  return JSON.stringify([civilTime(event.date, event.startTime), civilTime(event.date, event.endTime), Number(event.percentage), Number(event.tolerance), Boolean(event.windowConfirmed)])
}

export function unionSeconds(intervals, start = -Infinity, end = Infinity) {
  const spans = intervals.map((s) => [Math.max(start, s.start), Math.min(end, s.end)]).filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b) && b > a).sort((a, b) => a[0] - b[0])
  let seconds = 0, lastEnd = -Infinity
  for (const [a, b] of spans) { seconds += Math.max(0, b - Math.max(a, lastEnd)); lastEnd = Math.max(lastEnd, b) }
  return seconds
}

export function evaluatePerson(person, event) {
  let interval, issue = ''
  try { interval = windowOf(event) } catch (error) { issue = error.message }
  const totalSeconds = person.snapshot ? person.snapshot.totalSeconds : person.reportedSeconds || unionSeconds(person.sessions || [])
  const seconds = person.snapshot ? person.snapshot.seconds : interval ? unionSeconds(person.sessions || [], interval.start, interval.end) : 0
  const base = { seconds, totalSeconds, percentage: interval ? Math.min(100, seconds / interval.duration * 100) : 0, eligible: false }
  if (!person.include || person.role === 'excluded') return { ...base, code: 'excluded', label: 'Excluido' }
  if (person.role === 'review') return { ...base, code: 'review', label: 'Confirmar rol de moderación' }
  const namePending = !clean(person.certificateName) || !person.nameConfirmed
  if (['organizer', 'speaker'].includes(person.role)) return namePending ? { ...base, code: 'name', label: 'Revisar nombre' } : { ...base, eligible: true, code: 'role', label: 'Certificado por rol (exento)' }
  if (person.snapshot && person.snapshot.policyKey !== policyKey(event)) return { ...base, code: 'review', label: 'Recarga los originales para recalcular' }
  if (!person.registration) return { ...base, code: 'forms', label: 'Sin registro de Forms vinculado' }
  if (person.registration.consentIssue && !person.consentReviewed) return { ...base, code: 'review', label: 'Revisar respuestas de autorización' }
  if (person.incomplete) return { ...base, code: 'review', label: 'Detalle de asistencia incompleto' }
  if (issue || !event.windowConfirmed) return { ...base, code: 'window', label: issue || 'Confirmar tramo de clase' }
  if (seconds >= interval.strict) return namePending ? { ...base, code: 'name', label: 'Cumple asistencia · revisar nombre' } : { ...base, eligible: true, code: 'strict', label: 'Cumple asistencia' }
  if (seconds >= interval.minimum) return namePending ? { ...base, code: 'name', label: 'Con tolerancia · revisar nombre' } : { ...base, eligible: true, code: 'tolerance', label: 'Cumple con tolerancia' }
  return { ...base, code: seconds ? 'attendance' : 'absent', label: seconds ? 'Asistencia insuficiente' : 'Sin asistencia dentro del tramo' }
}

export function evaluatedRoster(people, event) {
  return people.map((person) => ({ ...person, evaluation: evaluatePerson(person, event) }))
}

export function validateCertificateEvent(event) {
  if (!clean(event.title) || !clean(event.institution) || !event.date || !clean(event.focus)) throw new Error('Completa tema, institución, fecha y enfoque académico del evento.')
  if (!Number.isFinite(civilTime(event.date, '00:00'))) throw new Error('La fecha del evento no es válida.')
  if (clean(event.tolerance) === '' || !Number.isFinite(Number(event.tolerance)) || Number(event.tolerance) < 0) throw new Error('La tolerancia debe ser un número mayor o igual a 0 minutos.')
  if (!Number.isFinite(Number(event.percentage)) || Number(event.percentage) <= 0 || Number(event.percentage) > 100) throw new Error('La asistencia requerida debe ser mayor que 0 y hasta 100 %.')
  for (const role of ['organizer', 'speaker', 'participant']) if (!Number.isFinite(Number(event.hours[role])) || Number(event.hours[role]) <= 0) throw new Error('Las horas de cada certificado deben ser mayores que cero.')
  if (!event.signers.every((s) => clean(s.name) && clean(s.title))) throw new Error('Completa el nombre y cargo de los tres firmantes.')
}

export function createSnapshot(event, people) {
  validateCertificateEvent(event)
  const recipients = evaluatedRoster(people, event).filter((p) => p.evaluation.eligible)
  if (!recipients.length) throw new Error('Todavía no hay acreedores listos para certificar.')
  return {
    schemaVersion: 1, event: JSON.parse(JSON.stringify(event)),
    recipients: recipients.map((p) => ({
      id: p.id, certificateName: clean(p.certificateName), role: p.role, include: true, nameConfirmed: true,
      notes: clean(p.notes), consentReviewed: Boolean(p.consentReviewed),
      registration: p.registration ? { id: p.registration.id, name: p.registration.name, emails: p.registration.emails, consentIssue: p.registration.consentIssue } : null,
      originalTeams: p.originalTeams || '', originalForm: p.originalForm || '',
      snapshot: { ...p.evaluation, policyKey: policyKey(event) },
    })),
  }
}

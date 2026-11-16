import { clean, emailKey, nameKey, normalize, proposeName } from './model.js'
import { possibleRegistrations } from './importFiles.js'

export function organizerPerson(name) {
  return { id: 'organizer', certificateName: name, nameConfirmed: true, role: 'organizer', include: true, registration: null, sessions: [], originalTeams: '', originalForm: '', notes: '', consentReviewed: false }
}

export function buildRoster(forms, teams, organizerName) {
  const registrations = forms?.registrations || [], used = new Set()
  const organizer = organizerPerson(organizerName)
  const people = []
  for (const person of teams?.people || []) {
    if (nameKey(person.name) === nameKey(organizerName) || person.emails.includes('mortegaf@itsqmet.edu.ec')) {
      organizer.sessions.push(...person.sessions)
      organizer.reportedSeconds = (organizer.reportedSeconds || 0) + person.reportedSeconds
      organizer.originalTeams = person.name
      organizer.incomplete = person.incomplete || false
      continue
    }
    const emailMatches = registrations.filter((r) => r.emails.some((e) => person.emails.includes(emailKey(e))))
    const registration = emailMatches.length === 1 && !used.has(emailMatches[0].id) ? emailMatches[0] : null
    if (registration) used.add(registration.id)
    people.push({
      id: person.id, certificateName: proposeName(registration?.name, person.name), nameConfirmed: false,
      role: /moderador|presenter/.test(normalize(person.teamsRole)) ? 'review' : 'participant',
      include: true, registration, sessions: person.sessions, reportedSeconds: person.reportedSeconds, incomplete: Boolean(person.incomplete),
      originalTeams: person.name, originalForm: registration?.name || '', teamsRole: person.teamsRole,
      matchMethod: registration ? 'Correo exacto' : '', candidateIds: possibleRegistrations(person, registrations),
      notes: '', consentReviewed: false,
    })
  }
  for (const registration of registrations) if (!used.has(registration.id)) people.push({
    id: registration.id, certificateName: proposeName(registration.name), nameConfirmed: false,
    role: 'participant', include: true, registration, sessions: [], originalTeams: '', originalForm: registration.name,
    matchMethod: 'Solo inscripción', candidateIds: [], notes: '', consentReviewed: false,
  })
  return [organizer, ...people]
}

export function linkRegistration(people, personId, registration) {
  const previous = people.find((p) => p.id === personId)?.registration
  const owner = people.find((p) => p.id !== personId && p.registration?.id === registration?.id)
  if (owner?.originalTeams) throw new Error('Esta inscripción ya está vinculada a otra asistencia. Si son la misma persona, fusiona primero sus registros.')
  const linked = people.filter((p) => !registration || p.id === personId || p.id !== owner?.id).map((p) => p.id !== personId ? p : {
    ...p, registration, originalForm: registration?.name || '', matchMethod: registration ? 'Vínculo manual confirmado' : '',
    certificateName: registration ? proposeName(registration.name, p.originalTeams) : p.certificateName,
    nameConfirmed: false, consentReviewed: false,
  })
  if (previous && previous.id !== registration?.id && !linked.some((p) => p.registration?.id === previous.id)) {
    linked.push({ ...organizerPerson(proposeName(previous.name)), id: previous.id, role: 'participant', nameConfirmed: false, registration: previous, originalForm: previous.name, matchMethod: 'Solo inscripción' })
  }
  return linked
}

export function mergePeople(people, targetId, sourceId) {
  const target = people.find((p) => p.id === targetId), source = people.find((p) => p.id === sourceId)
  if (!target || !source || targetId === sourceId || target.snapshot || source.snapshot) throw new Error('Selecciona dos registros importados distintos para fusionar.')
  if (source.id === 'organizer' && target.id !== 'organizer') throw new Error('Para unir asistencia a la organizadora, abre su registro y selecciónala como destino.')
  if (target.registration && source.registration && target.registration.id !== source.registration.id) throw new Error('Los registros tienen inscripciones distintas. Desvincula primero la inscripción incorrecta.')
  const registration = target.registration || source.registration
  return people.filter((p) => p.id !== sourceId).map((p) => p.id !== targetId ? p : {
    ...p, registration, originalForm: registration?.name || '',
    originalTeams: [target.originalTeams, source.originalTeams].filter(Boolean).join(' / '),
    sessions: [...target.sessions, ...source.sessions], incomplete: Boolean(target.incomplete || source.incomplete),
    reportedSeconds: (target.reportedSeconds || 0) + (source.reportedSeconds || 0),
    matchMethod: 'Asistencias fusionadas manualmente', notes: [clean(target.notes), clean(source.notes)].filter(Boolean).join(' · '),
    consentReviewed: false,
  })
}

export function addPerson(role = 'speaker') {
  return { ...organizerPerson(''), id: `manual-${crypto.randomUUID()}`, nameConfirmed: false, role }
}

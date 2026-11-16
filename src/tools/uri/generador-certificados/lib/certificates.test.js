import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { PDFDocument } from 'pdf-lib'
import { blankEvent, civilTime, createSnapshot, evaluatePerson, formatDuration, policyKey, unionSeconds, windowOf } from './model.js'
import { formTable, parseDelimited, parseDuration, parseForms, parseTeams, parseTeamsDate, readSheets } from './importFiles.js'
import { buildRoster, linkRegistration, mergePeople, organizerPerson } from './roster.js'
import { generateCertificates, loadCertificateAssets } from './certificates.js'
import { buildReportWorkbook } from './exportReport.js'
import { designBoxes, constrainBox } from './design.js'

const event = () => ({ ...blankEvent(), title: 'Inteligencia Artificial Generativa Aplicada a la Docencia de Educación Superior', institution: 'Universidad de Ejemplo', focus: 'innovación educativa y desarrollo profesional', date: '2026-11-12', startTime: '15:00:00', endTime: '16:00:00', windowConfirmed: true, signers: [...blankEvent().signers.slice(0, 2), { name: 'Dra. Ana Ejemplo', title: 'Representante institucional' }] })
const person = (seconds = 2880) => ({ ...organizerPerson('María José Pérez Díaz'), id: 'p1', role: 'participant', registration: { id: 'f1', name: 'Pérez Díaz María José', names: ['Pérez Díaz María José'], emails: ['persona@example.org'], consentIssue: false }, sessions: [{ start: civilTime('2026-11-12', '15:00:00'), end: civilTime('2026-11-12', '15:00:00') + seconds }] })

test('Civil dates are explicit, validate calendar and preserve US AM/PM export clocks', () => {
  assert.equal(parseTeamsDate('11/06/26, 3:03:30 PM'), civilTime('2026-11-06', '15:03:30'))
  assert.equal(parseTeamsDate('06/11/2026 15:03:30', 'dmy'), civilTime('2026-11-06', '15:03:30'))
  assert.equal(parseTeamsDate('11/06/26, 12:03:30 AM'), civilTime('2026-11-06', '00:03:30'))
  assert.ok(Number.isNaN(parseTeamsDate('not a date')))
  assert.ok(Number.isNaN(civilTime('2026-02-30', '15:00')))
  assert.equal(parseDuration('1 h 2 min 3\u00a0s'), 3723)
  assert.equal(parseDuration('1:02:03'), 3723)
  assert.deepEqual(parseDelimited('Nombre;Correo\r\n"Apellido; Nombre";a@b.ec'), [['Nombre', 'Correo'], ['Apellido; Nombre', 'a@b.ec']])
})

test('Attendance clips to the class, removes gaps and overlapping devices', () => {
  assert.equal(unionSeconds([{ start: 0, end: 30 }, { start: 20, end: 40 }, { start: 50, end: 90 }], 10, 70), 50)
  const p = person(4 * 3600)
  assert.equal(evaluatePerson(p, event()).seconds, 3600)
  p.sessions = [{ start: civilTime('2026-11-12', '14:00'), end: civilTime('2026-11-12', '15:20') }, { start: civilTime('2026-11-12', '15:30'), end: civilTime('2026-11-12', '16:30') }]
  assert.equal(evaluatePerson(p, event()).seconds, 3000)
})

test('One-minute default, at most two minutes, and exact-second boundaries', () => {
  assert.equal(windowOf(event()).minimum, 2820)
  assert.equal(evaluatePerson(person(2820), event()).code, 'tolerance')
  assert.equal(evaluatePerson(person(2819), event()).eligible, false)
  assert.equal(evaluatePerson(person(2760), { ...event(), tolerance: 2 }).eligible, true)
  assert.throws(() => windowOf({ ...event(), tolerance: 2.01 }), /0 y 2/)
  assert.equal(evaluatePerson(person(2880), { ...event(), windowConfirmed: false }).eligible, false)
})

test('Selection does not bypass window/name review, and exclusion preserves attendance evidence', () => {
  const pending = { ...person(), include: true, nameConfirmed: false }
  assert.equal(evaluatePerson(pending, { ...event(), windowConfirmed: false }).code, 'window')
  assert.equal(evaluatePerson(pending, event()).code, 'name')
  assert.equal(evaluatePerson({ ...pending, nameConfirmed: true }, event()).eligible, true)
  for (const p of [{ ...person(), include: false }, { ...person(), role: 'excluded' }]) {
    const result = evaluatePerson(p, event())
    assert.equal(result.eligible, false)
    assert.equal(result.code, 'excluded')
    assert.equal(result.seconds, 2880)
    assert.equal(result.totalSeconds, 2880)
    assert.equal(result.percentage, 80)
  }
})

test('Forms stays mandatory for participants; special roles are explicit and exempt', () => {
  const p = { ...person(), registration: null }
  assert.equal(evaluatePerson(p, event()).code, 'forms')
  assert.equal(evaluatePerson({ ...p, role: 'speaker' }, event()).eligible, true)
  assert.equal(evaluatePerson({ ...p, role: 'review' }, event()).eligible, false)
  assert.equal(evaluatePerson({ ...p, role: 'organizer' }, event()).eligible, true)
  assert.equal(evaluatePerson({ ...person(), nameConfirmed: false }, event()).eligible, false)
  const issue = { ...person(), registration: { ...person().registration, consentIssue: true } }
  assert.equal(evaluatePerson(issue, event()).eligible, false)
  assert.equal(evaluatePerson({ ...issue, consentReviewed: true }, event()).eligible, true)
  assert.equal(evaluatePerson({ ...person(), incomplete: true }, event()).eligible, false)
})

test('Forms deduplicates identity, keeps accents and aggregates duplicate answers', () => {
  const forms = parseForms(formTable([
    ['Apellidos y Nombres', 'Número de cédula', 'Correo Electrónico Institucional', '¿Autoriza?'],
    ['Pérez Díaz María José', '0012345678', 'A@EXAMPLE.ORG ', 'Sí'],
    ['María José Pérez Díaz', '0012345678', 'b@example.org', 'No'],
    ['Pérez Díaz María José', '0099999999', 'other@example.org', 'Sí'],
  ]))
  assert.equal(forms.registrations.length, 2)
  assert.equal(forms.duplicates, 1)
  assert.equal(forms.registrations[0].consentIssue, true)
  assert.deepEqual(forms.registrations[0].emails, ['a@example.org', 'b@example.org'])
})

test('Manual linking cannot double-assign a registration; merges preserve intervals', () => {
  const a = { ...person(), id: 'a', originalTeams: 'María Pérez', originalForm: 'Pérez Díaz María José' }
  const b = { ...person(600), id: 'b', originalTeams: 'María (invitada)', registration: null }
  assert.throws(() => linkRegistration([a, b], 'b', a.registration), /otra asistencia/)
  const merged = mergePeople([a, b], 'a', 'b')
  assert.equal(merged.length, 1)
  assert.equal(evaluatePerson(merged[0], event()).seconds, 2880)
  const formsOnly = { ...a, id: 'f-only', originalTeams: '' }
  const linked = linkRegistration([b, formsOnly], 'b', formsOnly.registration)
  assert.equal(linked.length, 1)
  assert.equal(linked[0].registration.id, 'f1')
  const unlinked = linkRegistration([a], 'a', null)
  assert.equal(unlinked.length, 2)
  assert.equal(unlinked.find((p) => !p.originalTeams).registration.id, 'f1')
})

test('Persistence contains only final recipients; loaded evidence invalidates when the time policy changes', () => {
  const payload = createSnapshot(event(), [person(), { ...person(20), id: 'absent' }])
  assert.equal(payload.recipients.length, 1)
  assert.equal(payload.recipients[0].sessions, undefined)
  assert.equal(payload.recipients[0].snapshot.policyKey, policyKey(event()))
  assert.equal(evaluatePerson(payload.recipients[0], event()).eligible, true)
  assert.equal(evaluatePerson(payload.recipients[0], { ...event(), startTime: '15:01' }).eligible, false)
  const book = buildReportWorkbook(event(), [person(), { ...person(20), id: 'absent' }])
  assert.deepEqual(book.SheetNames, ['Resumen', 'Para certificados', 'Detalle de evaluación', 'Pendientes'])
})

for (const [folder, responses, unique, teamsCount, duration] of [['chaco', 21, 19, 16, '0:55:53'], ['grupo_kfc', 27, 26, 22, '1:14:08'], ['u_israel', 19, 19, 15, '1:35:37']]) {
  const path = new URL(`../../../../../material_para_certificados/${folder}/`, import.meta.url)
  test(`Original reference files: ${folder}`, { skip: !existsSync(new URL('registro_forms.xlsx', path)) }, () => {
    const forms = parseForms(formTable(readSheets(readFileSync(new URL('registro_forms.xlsx', path)), 'forms.xlsx')[0].rows))
    const teams = parseTeams(readSheets(readFileSync(new URL('registro_teams.csv', path)), 'teams.csv')[0].rows)
    assert.equal(forms.responseCount, responses)
    assert.equal(forms.registrations.length, unique)
    assert.equal(teams.people.length, teamsCount)
    assert.equal(teams.warnings.length, 0)
    const e = { ...event(), ...teams.suggestion }
    assert.equal(formatDuration(windowOf(e).duration), duration)
    const roster = buildRoster(forms, teams, e.organizerName)
    assert.equal(roster.filter((p) => p.role === 'organizer').length, 1)
    assert.equal(roster.filter((p) => p.role === 'speaker').length, 0)
    if (folder === 'chaco') assert.equal(roster.filter((p) => p.role === 'review').length, 2)
    if (folder === 'u_israel') assert.equal(forms.registrations.filter((r) => r.consentIssue).length, 1)
  })

  test(`Reviewed recipient decisions: ${folder}`, { skip: !existsSync(new URL('registro_forms.xlsx', path)) }, () => {
    const forms = parseForms(formTable(readSheets(readFileSync(new URL('registro_forms.xlsx', path)), 'forms.xlsx')[0].rows))
    const teams = parseTeams(readSheets(readFileSync(new URL('registro_teams.csv', path)), 'teams.csv')[0].rows)
    const e = { ...event(), ...teams.suggestion }
    let rows = buildRoster(forms, teams, e.organizerName).map((p) => ({ ...p, nameConfirmed: true }))
    if (folder === 'grupo_kfc') {
      const attendee = rows.find((p) => /CASTRO CONSTANTE/.test(p.originalTeams))
      const registration = forms.registrations.find((r) => r.name === 'Veronica Castro')
      assert.equal(attendee.registration, null, 'The misspelled email must not be auto-linked')
      rows = linkRegistration(rows, attendee.id, registration).map((p) => ({ ...p, nameConfirmed: true, role: p.role === 'review' ? 'speaker' : p.role }))
      assert.equal(rows.filter((p) => evaluatePerson(p, e).eligible).length, 9)
    } else if (folder === 'chaco') {
      rows = rows.map((p) => ({ ...p, role: p.role === 'review' ? /katherine/i.test(p.originalTeams) ? 'speaker' : 'excluded' : p.role }))
      assert.equal(rows.filter((p) => evaluatePerson(p, e).eligible).length, 5, 'One moderator was confirmed as speaker; the other is not automatically certified')
    } else {
      rows = rows.map((p) => ({ ...p, role: p.role === 'review' ? 'speaker' : p.role }))
      assert.equal(rows.filter((p) => evaluatePerson(p, e).eligible).length, 7, 'The conflicting authorization remains pending')
      rows = rows.map((p) => ({ ...p, consentReviewed: true }))
      assert.equal(rows.filter((p) => evaluatePerson(p, e).eligible).length, 8)
    }
  })
}

const assetsPath = new URL('../../../../../public/certificados/', import.meta.url)
test('Editable layouts persist per role, preserve eligibility and reject out-of-page or overflowing blocks', async () => {
  const assets = await loadCertificateAssets((file) => readFileSync(new URL(file, assetsPath)))
  const e = event(), p = person()
  let initial
  await generateCertificates(e, [p], { assets, onLayout: (value) => { initial = value } })
  const { width, height } = initial
  const box = constrainBox({ ...initial.boxes.signer0, x: 35, y: 450, width: 180, height: 80, scale: .7 }, width, height)
  e.designs = { participant: { signer0: { x: box.x, y: box.y, width: box.width, height: box.height, scale: box.scale } } }
  const payload = createSnapshot(e, [p])
  assert.deepEqual(payload.event.designs, e.designs)
  assert.equal(evaluatePerson(payload.recipients[0], payload.event).eligible, true)
  const restored = designBoxes(payload.event, 'participant', width, height)
  assert.equal(restored.signer0.y, 450)
  assert.equal(designBoxes(e, 'speaker', width, height).signer0.y, 485)
  assert.equal((await PDFDocument.load(await generateCertificates(payload.event, payload.recipients, { assets }))).getPageCount(), 1)
  await assert.rejects(generateCertificates({ ...e, designs: { participant: { signer0: { ...box, x: width } } } }, [p], { assets }), /dentro de la página/)
  await assert.rejects(generateCertificates({ ...e, designs: { participant: { body: { width: 30, height: 12 } } } }, [p], { assets }), /demasiado extensa/)
  assert.equal(constrainBox({ ...box, x: -40, y: height + 10 }, width, height).x, 0)
  assert.equal(constrainBox({ ...box, x: -40, y: height + 10 }, width, height).y, height - box.height)
})

test('Actual Canva fonts and backgrounds generate three roles, long names, and reject overflow', async () => {
  const assets = await loadCertificateAssets((file) => readFileSync(new URL(file, assetsPath)))
  const rows = [organizerPerson(event().organizerName), { ...person(), role: 'speaker' }, { ...person(), certificateName: 'María de los Ángeles Alejandra Fernanda De la Cruz Pérez del Río' }]
  const bytes = await generateCertificates(event(), rows, { assets })
  assert.equal((await PDFDocument.load(bytes)).getPageCount(), 3)
  const longInstitution = 'Gobierno Autónomo Descentralizado Municipal y sus Unidades de Cooperación Interinstitucional, Formación Continua, Innovación Educativa y Desarrollo Social de la Región Amazónica del Ecuador'
  assert.equal((await PDFDocument.load(await generateCertificates({ ...event(), institution: longInstitution }, [rows[2]], { assets }))).getPageCount(), 1)
  await assert.rejects(generateCertificates(event(), [{ ...person(), certificateName: 'Nombre 😀' }], { assets }), /caracteres/)
  await assert.rejects(generateCertificates({ ...event(), texts: { ...event().texts, participant: 'Texto muy extenso. '.repeat(800) } }, [person()], { assets }), /demasiado extensa/)
  await assert.rejects(generateCertificates(event(), [{ ...person(), nameConfirmed: false }], { assets }), /requisitos/)
})

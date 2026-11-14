import test from 'node:test'
import assert from 'node:assert/strict'
import { importTrelloReport, parseTrelloExport } from './trello.js'

const period = { startDate: '2026-10-26', endDate: '2026-11-25', activities: [] }
const card = (id, due = '2026-11-05T12:00:00Z', extra = {}) => ({ id, name: '[URI] Revisar convenio', due, ...extra })
const board = (cards) => ({ cards, lists: [{ id: 'list-1', name: 'Realizado' }] })

test('filtra por rango inclusivo entre meses y omite tarjetas sin fecha', () => {
  const result = importTrelloReport(JSON.stringify(board([
    card('start', '2026-10-26T00:00:00Z'), card('end', '2026-11-25T23:59:59Z'),
    card('before', '2026-10-25T23:59:59Z'), card('after', '2026-11-26T00:00:00Z'),
    card('undated', null), card('template', undefined, { name: 'Plantilla de trabajo' }),
  ])), period)
  assert.deepEqual(result.activities.map((item) => item.sourceId), ['start', 'end'])
  assert.deepEqual(result.summary, { added: 2, existing: 0, outsidePeriod: 2, withoutDate: 1, existingDuplicates: 0 })
})

test('prioriza vencimiento y usa última actividad si falta una fecha válida', () => {
  const result = parseTrelloExport(board([
    card('due', '2026-10-20T12:00:00Z', { dateLastActivity: '2026-11-05T12:00:00Z' }),
    card('fallback', null, { dateLastActivity: '2026-11-06T12:00:00Z' }),
    card('invalid', '2026-02-30T00:00:00Z', { dateLastActivity: '2026-11-07T12:00:00Z' }),
  ]))
  assert.deepEqual(result.map((item) => item.date), ['2026-10-20', '2026-11-06', '2026-11-07'])
})

test('importar el mismo archivo dos veces es idempotente y no modifica entradas', () => {
  const input = board([card('one'), card('one')])
  const first = importTrelloReport(input, period)
  const saved = structuredClone(first.activities)
  const second = importTrelloReport(input, { ...period, activities: first.activities })
  assert.equal(first.activities.length, 1)
  assert.equal(second.summary.added, 0)
  assert.equal(second.summary.existing, 1)
  assert.deepEqual(second.activities, first.activities)
  assert.deepEqual(first.activities, saved)
  assert.equal(period.activities.length, 0)
})

test('exportaciones semanales superpuestas agregan solo las tarjetas nuevas', () => {
  const first = importTrelloReport(board([card('one'), card('two')]), period)
  const second = importTrelloReport(board([card('two'), card('three')]), { ...period, activities: first.activities })
  assert.deepEqual(second.activities.map((item) => item.sourceId), ['three', 'one', 'two'])
  assert.equal(second.summary.added, 1)
  assert.equal(second.summary.existing, 1)
})

test('actualiza datos de Trello sin sobreescribir correcciones, inclusión o evidencias', () => {
  const first = importTrelloReport(board([card('one')]), period)
  const existing = { ...first.activities[0], refined: 'Texto profesional corregido.', area: 'UFC', category: 'Personalizada', date: '2026-11-10', include: false, evidence: 'Enlace institucional' }
  const changed = card('one', '2026-11-12T12:00:00Z', { name: '[URI] Elaborar convenio actualizado', desc: 'Descripción nueva', idList: 'list-1' })
  const result = importTrelloReport(board([changed]), { ...period, activities: [existing] })
  const activity = result.activities[0]
  assert.equal(activity.original, 'Elaborar convenio actualizado')
  assert.equal(activity.notes, 'Descripción nueva')
  assert.equal(activity.list, 'Realizado')
  for (const field of ['refined', 'area', 'category', 'date', 'include', 'evidence']) assert.equal(activity[field], existing[field])
  const third = importTrelloReport(board([changed]), { ...period, activities: result.activities })
  assert.deepEqual(third.activities, result.activities)
})

test('conserva todos los campos editables de registros anteriores sin snapshot', () => {
  const legacy = { id: 'trello-one', source: 'Trello', original: 'Anterior', refined: 'Corregido', date: '2026-11-01', include: false, area: 'UFC', evidence: 'Prueba' }
  const result = importTrelloReport(board([card('one')]), { ...period, activities: [legacy] })
  assert.equal(result.activities.length, 1)
  for (const field of Object.keys(legacy)) assert.equal(result.activities[0][field], legacy[field])
  assert.equal(result.activities[0].sourceId, 'one')
})

test('colapsa duplicados anteriores por ID sin mezclar tarjetas distintas ni manuales', () => {
  const first = importTrelloReport(board([card('one'), card('two')]), period)
  const manual = { id: 'manual-1', source: 'Manual', original: 'Revisar convenio' }
  const result = importTrelloReport(board([card('one')]), { ...period, activities: [manual, ...first.activities, first.activities[0]] })
  assert.equal(result.activities.length, 3)
  assert.equal(result.summary.existingDuplicates, 1)
  assert.deepEqual(result.activities[0], manual)
})

test('rechaza rangos incompletos, invertidos o inválidos', () => {
  for (const invalid of [{ startDate: '' }, { endDate: '' }, { startDate: '2026-12-01' }, { endDate: '2026-02-30' }]) {
    assert.throws(() => importTrelloReport(board([card('one')]), { ...period, ...invalid }), /fecha/)
  }
})

test('rechaza JSON ajeno a Trello y tarjetas sin identidad estable', () => {
  for (const invalid of [null, [], {}, { cards: {} }, { cards: [null] }, { cards: [{ name: 'Sin ID' }] }, { cards: [], lists: {} }]) {
    assert.throws(() => importTrelloReport(invalid, period))
  }
  assert.throws(() => importTrelloReport('{', period))
})

test('un archivo sin coincidencias conserva la bitácora y muestra las exclusiones', () => {
  const existing = importTrelloReport(board([card('one')]), period).activities
  const result = importTrelloReport(board([card('outside', '2026-09-01T00:00:00Z')]), { ...period, activities: existing })
  assert.deepEqual(result.activities, existing)
  assert.equal(result.summary.added, 0)
  assert.equal(result.summary.outsidePeriod, 1)
})

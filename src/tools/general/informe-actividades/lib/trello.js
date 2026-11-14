import { cleanActivityText, inferArea, inferCategory, refineActivity } from './rewriteActivity.js'

const syncedFields = ['original', 'refined', 'area', 'category', 'date', 'notes', 'list']

function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

function referenceDate(card) {
  const due = typeof card.due === 'string' ? card.due.slice(0, 10) : ''
  const lastActivity = typeof card.dateLastActivity === 'string' ? card.dateLastActivity.slice(0, 10) : ''
  return validDate(due) ? due : validDate(lastActivity) ? lastActivity : ''
}

export function validateTrelloPeriod({ startDate, endDate }) {
  if (!validDate(startDate) || !validDate(endDate)) throw new Error('Completa la fecha inicial y la fecha final antes de importar Trello.')
  if (startDate > endDate) throw new Error('La fecha inicial no puede ser posterior a la fecha final.')
}

export function parseTrelloExport(raw) {
  const board = typeof raw === 'string' ? JSON.parse(raw) : raw
  if (!board || !Array.isArray(board.cards) || (board.lists !== undefined && !Array.isArray(board.lists))) throw new Error('El archivo no es una exportación de tablero de Trello válida.')
  if (board.cards.some((card) => !card || typeof card.id !== 'string' || !card.id.trim())) throw new Error('Hay tarjetas sin identificador de Trello. Exporta nuevamente el tablero para evitar duplicados.')
  const lists = new Map((board.lists || []).map((list) => [list.id, list.name]))
  return board.cards.filter((card) => !/plantilla|leer primero|cómo usamos/i.test(card.name || '')).map((card) => {
    const area = inferArea(card.name) || inferArea(card.desc) || ''
    const sourceText = cleanActivityText(card.name)
    return {
      id: `trello-${card.id}`,
      source: 'Trello',
      sourceId: card.id || '',
      area,
      category: inferCategory(sourceText, area),
      original: sourceText,
      refined: refineActivity(sourceText),
      date: referenceDate(card),
      status: 'realizada',
      include: true,
      evidence: '',
      notes: card.desc || '',
      list: lists.get(card.idList) || '',
    }
  })
}

function trelloKey(activity) {
  if (activity.source !== 'Trello') return ''
  return activity.sourceId || (activity.id?.startsWith('trello-') ? activity.id.slice(7) : '')
}

function snapshot(activity) {
  return Object.fromEntries(syncedFields.map((field) => [field, activity[field]]))
}

export function importTrelloReport(raw, report) {
  validateTrelloPeriod(report)
  const candidates = parseTrelloExport(raw)
  const incoming = new Map()
  let outsidePeriod = 0
  let withoutDate = 0
  for (const activity of candidates) {
    if (!activity.date) { withoutDate++; continue }
    if (activity.date < report.startDate || activity.date > report.endDate) { outsidePeriod++; continue }
    incoming.set(activity.sourceId, activity)
  }

  const seen = new Set()
  let existingDuplicates = 0
  const activities = (report.activities || []).filter((activity) => {
    const key = trelloKey(activity)
    if (!key) return true
    if (seen.has(key)) { existingDuplicates++; return false }
    seen.add(key)
    return true
  }).map((existing) => {
    const latest = incoming.get(trelloKey(existing))
    if (!latest) return existing
    const merged = { ...existing, sourceId: latest.sourceId }
    for (const field of syncedFields) {
      // Actualizar solo valores que no han sido corregidos en la bitácora.
      // Los registros antiguos sin snapshot conservan sus campos editables.
      if (existing.trelloSnapshot && existing[field] === existing.trelloSnapshot[field]) merged[field] = latest[field]
    }
    merged.trelloSnapshot = snapshot(latest)
    return merged
  })
  const added = [...incoming.values()].filter((activity) => !seen.has(activity.sourceId)).map((activity) => ({ ...activity, trelloSnapshot: snapshot(activity) }))
  return {
    activities: [...added, ...activities],
    summary: { added: added.length, existing: incoming.size - added.length, outsidePeriod, withoutDate, existingDuplicates },
  }
}

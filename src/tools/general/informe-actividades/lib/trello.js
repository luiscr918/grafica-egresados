import { cleanActivityText, inferArea, inferCategory, refineActivity } from './rewriteActivity'

export function parseTrelloExport(raw) {
  const board = typeof raw === 'string' ? JSON.parse(raw) : raw
  const lists = new Map((board.lists || []).map((list) => [list.id, list.name]))
  return (board.cards || []).filter((card) => !/plantilla|leer primero|cómo usamos/i.test(card.name || '')).map((card, index) => {
    const area = inferArea(card.name) || inferArea(card.desc) || ''
    const sourceText = cleanActivityText(card.name)
    return {
      id: `trello-${card.id || index}`,
      source: 'Trello',
      sourceId: card.id || '',
      area,
      category: inferCategory(sourceText, area),
      original: sourceText,
      refined: refineActivity(sourceText),
      date: card.due ? card.due.slice(0, 10) : card.dateLastActivity ? card.dateLastActivity.slice(0, 10) : '',
      status: 'realizada',
      include: true,
      evidence: '',
      notes: card.desc || '',
      list: lists.get(card.idList) || '',
    }
  })
}

import { colorForCategory } from './questions'
import { cleanValue } from './normalize'

export function getStats(records, question) {
  const counts = new Map()
  for (const record of records) {
    const value = cleanValue(record[question.key])
    if (!value) continue
    counts.set(value, (counts.get(value) || 0) + 1)
  }
  const total = [...counts.values()].reduce((sum, value) => sum + value, 0)
  const entries = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es'))
    .map(([label, count], index) => ({ label, count, percentage: total ? (count / total) * 100 : 0, color: colorForCategory(label, index) }))
  return { entries, total }
}

export function formatPercent(value) {
  return `${Number(value).toFixed(2).replace('.', ',')}%`
}

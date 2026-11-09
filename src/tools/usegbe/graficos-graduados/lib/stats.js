import { colorForCategory } from './questions'
import { cleanValue, splitAnswers } from './normalize'

export function getStats(records, question) {
  const counts = new Map()
  for (const record of records) {
    const values = question.multiple ? splitAnswers(record[question.key]) : [cleanValue(record[question.key])]
    for (const value of values) if (value) counts.set(value, (counts.get(value) || 0) + 1)
  }
  const total = question.multiple ? records.length : [...counts.values()].reduce((sum, value) => sum + value, 0)
  return { entries: [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es')).map(([label, count], index) => ({ label, count, percentage: records.length ? (count / records.length) * 100 : 0, color: colorForCategory(label, index) })), total }
}
export function formatPercent(value) { return `${Number(value).toFixed(1).replace('.', ',')}%` }

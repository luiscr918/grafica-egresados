import { useRef } from 'react'
import { Bar, Pie } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js'
import ChartDataLabels from 'chartjs-plugin-datalabels'
import { formatPercent } from '../lib/stats'

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend, ChartDataLabels)
export function PieChart({ stats }) { const ref = useRef(null); return <Pie ref={ref} data={{ labels: stats.entries.map((e) => `${e.label}: ${e.count} (${formatPercent(e.percentage)})`), datasets: [{ data: stats.entries.map((e) => e.count), backgroundColor: stats.entries.map((e) => e.color), borderColor: '#fff', borderWidth: 2 }] }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'left' }, datalabels: { display: false } } }} /> }
export function BarChart({ stats }) { return <Bar data={{ labels: stats.entries.map((e) => e.label), datasets: [{ data: stats.entries.map((e) => e.count), backgroundColor: '#118DFF', borderRadius: 4, barThickness: 25 }] }} options={{ indexAxis: 'y', responsive: true, maintainAspectRatio: false, layout: { padding: { right: 112 } }, scales: { x: { beginAtZero: true, ticks: { precision: 0 } }, y: { grid: { display: false } } }, plugins: { legend: { display: false }, datalabels: { clip: false, anchor: 'end', align: 'right', color: '#243447', font: { weight: 'bold' }, formatter: (_value, context) => formatPercent(stats.entries[context.dataIndex].percentage) } } }} /> }

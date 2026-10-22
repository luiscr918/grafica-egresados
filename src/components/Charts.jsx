import { useRef } from 'react'
import { Bar, Pie } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js'
import ChartDataLabels from 'chartjs-plugin-datalabels'
import { formatPercent } from '../lib/stats'

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend, ChartDataLabels)

export function PieChart({ stats }) {
  const chartRef = useRef(null)
  const labels = stats.entries.map((entry) => `${entry.label}: ${entry.count} (${formatPercent(entry.percentage)})`)
  return <Pie ref={chartRef} data={{ labels, datasets: [{ data: stats.entries.map((entry) => entry.count), backgroundColor: stats.entries.map((entry) => entry.color), borderColor: '#fff', borderWidth: 2 }] }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'left', title: { display: true, text: 'Respuesta', font: { weight: 'bold' } }, labels: { boxWidth: 12, font: { size: 12 } } }, datalabels: { display: false } } }} />
}

export function BarChart({ stats }) {
  return <Bar data={{ labels: stats.entries.map((entry) => entry.label), datasets: [{ data: stats.entries.map((entry) => entry.count), backgroundColor: '#118DFF', borderRadius: 4, barThickness: 25 }] }} options={{ indexAxis: 'y', responsive: true, maintainAspectRatio: false, layout: { padding: { right: 112 } }, scales: { x: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: '#e6ebf0' }, title: { display: true, text: 'Recuento de numeroIdentificacion' } }, y: { grid: { display: false } } }, plugins: { legend: { display: false }, datalabels: { clip: false, anchor: 'end', align: 'right', color: '#243447', font: { weight: 'bold' }, formatter: (_value, context) => formatPercent(stats.entries[context.dataIndex].percentage) } } }} />
}

import { Chart, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js'
import ChartDataLabels from 'chartjs-plugin-datalabels'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { jsPDF } from 'jspdf'
import { formatPercent } from './stats'

Chart.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend, ChartDataLabels)

function makeCanvas(width, height) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

function chartOptions(type, stats, scale) {
  const isPie = type === 'pie'
  return {
    responsive: false,
    animation: false,
    devicePixelRatio: 1,
    maintainAspectRatio: false,
    plugins: {
      legend: isPie ? { display: true, position: 'left', title: { display: true, text: 'Respuesta', font: { size: 15 * scale, weight: 'bold' } }, labels: { boxWidth: 14 * scale, font: { size: 13 * scale } } } : { display: false },
      tooltip: { enabled: false },
      datalabels: isPie ? { display: false } : {
        clip: false, anchor: 'end', align: 'right', color: '#243447', font: { size: 14 * scale, weight: 'bold' }, formatter: (_value, context) => formatPercent(stats.entries[context.dataIndex].percentage),
      },
    },
    layout: isPie ? {} : { padding: { right: 118 * scale } },
    scales: isPie ? {} : {
      x: { beginAtZero: true, ticks: { precision: 0, font: { size: 13 * scale } }, grid: { color: '#e6ebf0' }, title: { display: true, text: 'Recuento de numeroIdentificacion', font: { size: 13 * scale } } },
      y: { ticks: { font: { size: 13 * scale } }, grid: { display: false } },
    },
  }
}

export async function renderQuestionPng(question, stats, scale = 2) {
  const width = 920 * scale
  const height = 540 * scale
  const output = makeCanvas(width, height)
  const context = output.getContext('2d')
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, width, height)
  context.fillStyle = '#162536'
  context.font = `700 ${18 * scale}px Arial`
  const title = `${question.number}. ${question.title}`
  const words = title.split(' ')
  let line = ''
  let y = 32
  for (const word of words) {
    const candidate = `${line} ${word}`.trim()
    if (context.measureText(candidate).width > width - 48 * scale && line) {
      context.fillText(line, 24 * scale, y * scale)
      line = word
      y += 25
    } else line = candidate
  }
  context.fillText(line, 24 * scale, y * scale)

  const pieCanvas = makeCanvas(390 * scale, 420 * scale)
  const barCanvas = makeCanvas(470 * scale, 420 * scale)
  const labels = stats.entries.map((entry) => `${entry.label}: ${entry.count} (${formatPercent(entry.percentage)})`)
  const values = stats.entries.map((entry) => entry.count)
  const pie = new Chart(pieCanvas, { type: 'pie', data: { labels, datasets: [{ data: values, backgroundColor: stats.entries.map((entry) => entry.color), borderColor: '#fff', borderWidth: 2 * scale }] }, options: chartOptions('pie', stats, scale) })
  const bar = new Chart(barCanvas, { type: 'bar', data: { labels, datasets: [{ data: values, backgroundColor: '#118DFF', borderRadius: 3 * scale, barThickness: 26 * scale }] }, options: { ...chartOptions('bar', stats, scale), indexAxis: 'y' } })
  context.drawImage(pieCanvas, 18 * scale, (y + 20) * scale, 390 * scale, 420 * scale)
  context.drawImage(barCanvas, 430 * scale, (y + 20) * scale, 470 * scale, 420 * scale)
  context.fillStyle = '#536273'
  context.font = `600 ${15 * scale}px Arial`
  context.fillText(`Total: ${stats.total}`, 24 * scale, height - 24 * scale)
  pie.destroy()
  bar.destroy()
  return output.toDataURL('image/png')
}

export function downloadDataUrl(dataUrl, filename) {
  const link = document.createElement('a')
  link.href = dataUrl
  link.download = filename
  link.click()
}

export async function copyDataUrl(dataUrl) {
  const response = await fetch(dataUrl)
  const blob = await response.blob()
  await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })])
}

export async function downloadZip(items, filename) {
  const zip = new JSZip()
  for (const item of items) {
    const base64 = item.dataUrl.split(',')[1]
    zip.file(item.filename, base64, { base64: true })
  }
  const blob = await zip.generateAsync({ type: 'blob' })
  saveAs(blob, filename)
}

export function downloadPdf(items, filename, reportTitle, recordCount) {
  const document = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true })
  const pageWidth = document.internal.pageSize.getWidth()
  const pageHeight = document.internal.pageSize.getHeight()
  const margin = 8
  const imageWidth = 250
  const imageHeight = imageWidth * 540 / 920

  document.setFillColor(18, 43, 66)
  document.rect(0, 0, pageWidth, pageHeight, 'F')
  document.setTextColor(125, 186, 240)
  document.setFont('helvetica', 'bold')
  document.setFontSize(11)
  document.text('ITSQMET · USEGBE', 24, 28)
  document.setTextColor(255, 255, 255)
  document.setFontSize(27)
  document.text('Gráficos de seguimiento a egresados', 24, 78)
  document.setTextColor(183, 201, 218)
  document.setFont('helvetica', 'normal')
  document.setFontSize(17)
  const titleLines = document.splitTextToSize(reportTitle, pageWidth - 48)
  document.text(titleLines, 24, 94)
  document.setFontSize(12)
  document.text(`${recordCount} egresados · ${new Date().toLocaleDateString('es-EC')}`, 24, 112 + (titleLines.length - 1) * 8)

  items.forEach((item) => {
    document.addPage()
    const imageX = (pageWidth - imageWidth) / 2
    document.addImage(item.dataUrl, 'PNG', imageX, margin, imageWidth, imageHeight, undefined, 'FAST')
    document.setTextColor(35, 57, 76)
    document.setFont('helvetica', 'bold')
    document.setFontSize(10)
    document.text('Análisis', margin, 163)
    document.setFont('helvetica', 'normal')
    document.setFontSize(9)
    const analysisLines = document.splitTextToSize(item.analysis || '', pageWidth - margin * 2)
    document.text(analysisLines, margin, 170, { lineHeightFactor: 1.35 })
  })
  document.save(filename)
}

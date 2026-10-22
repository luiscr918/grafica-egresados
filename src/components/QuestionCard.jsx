import { useState } from 'react'
import { Check, Clipboard, Download } from 'lucide-react'
import { BarChart, PieChart } from './Charts'
import { downloadDataUrl, copyDataUrl, renderQuestionPng } from '../lib/exportImage'
import { notifyError, notifySuccess } from '../lib/alerts'

export default function QuestionCard({ question, stats, resolution }) {
  const [status, setStatus] = useState('')
  const filename = `${String(question.number).padStart(2, '0')}_${question.key}`

  async function exportPng() {
    setStatus('Preparando imagen...')
    const dataUrl = await renderQuestionPng(question, stats, resolution)
    downloadDataUrl(dataUrl, `${filename}.png`)
    setStatus('PNG descargado')
    notifySuccess('PNG descargado correctamente')
    window.setTimeout(() => setStatus(''), 2200)
  }

  async function copyImage() {
    try {
      setStatus('Copiando imagen...')
      const dataUrl = await renderQuestionPng(question, stats, resolution)
      await copyDataUrl(dataUrl)
      setStatus('Imagen copiada')
    } catch {
      setStatus('El navegador no permite copiar imágenes')
      notifyError('No se pudo copiar la imagen', 'El navegador no permite copiar imágenes.')
    }
    window.setTimeout(() => setStatus(''), 2600)
  }

  return (
    <article className="question-card">
      <div className="question-heading">
        <div>
          <span className="question-number">{String(question.number).padStart(2, '0')}</span>
          <h2>{question.title}</h2>
        </div>
        <div className="card-actions">
          <button className="button button-light" onClick={exportPng}><Download size={15} /> Descargar PNG</button>
          <button className="button button-ghost" onClick={copyImage}><Clipboard size={15} /> Copiar imagen</button>
        </div>
      </div>
      {stats.total ? <div className="charts-grid"><div className="chart-wrap pie-wrap"><PieChart stats={stats} /></div><div className="chart-wrap"><BarChart stats={stats} /></div></div> : <div className="empty-chart">No hay respuestas válidas para esta pregunta.</div>}
      <div className="question-footer"><span>Total: {stats.total}</span>{status && <span className="export-status"><Check size={14} /> {status}</span>}</div>
    </article>
  )
}

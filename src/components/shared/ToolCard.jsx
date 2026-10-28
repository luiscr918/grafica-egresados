import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function ToolCard({ area, tool }) {
  const Icon = tool.icono
  return <article className="tool-card">
    <div className="tool-card-icon"><Icon size={24} /></div>
    <div className="tool-card-copy"><h3>{tool.nombre}</h3><p>{tool.descripcion}</p></div>
    <Link className="button button-primary" to={`/${area.id}/${tool.id}`}>Abrir <ArrowUpRight size={16} /></Link>
  </article>
}

import { ChevronRight, Home } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Breadcrumb({ area, tool }) {
  return <nav className="breadcrumb" aria-label="Migas de pan">
    <Link to="/"><Home size={14} /> Inicio</Link>
    {area && <><ChevronRight size={14} /><Link to={`/${area.id}`}>{area.nombre}</Link></>}
    {tool && <><ChevronRight size={14} /><span>{tool.nombre}</span></>}
  </nav>
}

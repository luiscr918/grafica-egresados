import { Link, useParams } from 'react-router-dom'
import { findArea } from '../config/tools'
import Breadcrumb from '../components/shared/Breadcrumb'
import ToolCard from '../components/shared/ToolCard'

export default function AreaPage() {
  const { area: areaId } = useParams()
  const area = findArea(areaId)
  if (!area) return <NotFoundArea />
  const Icon = area.icono
  return <main className="workspace portal-workspace"><Breadcrumb area={area} /><div className="area-heading"><div className="area-heading-icon"><Icon size={30} /></div><div><p className="eyebrow">Área institucional</p><h1>{area.nombre}</h1><p>{area.descripcion}</p></div></div><div className="section-intro tools-heading"><div><p className="eyebrow">02 / Herramientas</p><h2>Herramientas disponibles</h2></div><Link className="button button-ghost" to="/">Cambiar de área</Link></div>{area.herramientas.length ? <div className="tools-list">{area.herramientas.map((tool) => <ToolCard area={area} tool={tool} key={tool.id} />)}</div> : <div className="empty-state"><span>Próximamente</span><h2>Estamos preparando herramientas para {area.nombre}</h2><p>Regresa pronto para encontrar nuevas soluciones internas.</p></div>}</main>
}

function NotFoundArea() { return <main className="workspace"><h1>Área no encontrada</h1><Link className="button button-primary" to="/">Volver al inicio</Link></main> }

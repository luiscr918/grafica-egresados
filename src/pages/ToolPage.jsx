import { Link, useParams } from 'react-router-dom'
import { findArea, findTool } from '../config/tools'
import Breadcrumb from '../components/shared/Breadcrumb'

export default function ToolPage() {
  const { area: areaId, herramienta: toolId } = useParams()
  const area = findArea(areaId)
  const tool = findTool(areaId, toolId)
  if (!area || !tool) return <main className="workspace"><h1>Herramienta no encontrada</h1><Link className="button button-primary" to="/">Volver al inicio</Link></main>
  const Tool = tool.componente
  return <><div className="tool-route-bar"><Breadcrumb area={area} tool={tool} /></div><Tool /></>
}

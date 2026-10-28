import { ArrowLeft, ShieldCheck } from 'lucide-react'
import { Link, Outlet } from 'react-router-dom'

export default function Layout() {
  return <div className="app-shell portal-shell">
    <header className="portal-header">
      <div className="portal-header-inner">
        <Link className="brand-mark" to="/">ITSQMET <span>· PORTAL INTERNO</span></Link>
        <div className="portal-header-actions"><span><ShieldCheck size={15} /> Procesamiento local</span><Link className="header-home-link" to="/"><ArrowLeft size={15} /> Inicio</Link></div>
      </div>
    </header>
    <Outlet />
    <footer>ITSQMET · Unidad de Seguimiento a Egresados, Bienestar y Estadística</footer>
  </div>
}

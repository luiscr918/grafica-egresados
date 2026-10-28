import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { areas } from '../config/tools'

export default function Home() {
  return <main>
    <section className="hero portal-hero"><div className="hero-content">
      <p className="eyebrow">Portal de herramientas internas</p>
      <h1>Un solo lugar para el trabajo de cada área.</h1>
      <p className="hero-copy">Accede a las herramientas institucionales de ITSQMET desde un único portal, sencillo y organizado.</p>
    </div><div className="hero-tools"><span className="privacy-note">Selecciona tu área para comenzar <ArrowRight size={16} /></span></div></section>
    <section className="workspace portal-workspace"><div className="section-intro"><div><p className="eyebrow">01 / Áreas</p><h2>Selecciona tu área</h2><p>Encuentra las herramientas disponibles para tu equipo.</p></div></div>
      <div className="area-grid">{areas.map((area) => { const Icon = area.icono; return <Link className="area-card" to={`/${area.id}`} key={area.id}><div className="area-card-top"><div className="area-icon"><Icon size={29} /></div><ArrowUpRight size={19} /></div><strong>{area.nombre}</strong><p>{area.descripcion}</p><span>{area.herramientas.length ? `${area.herramientas.length} herramienta${area.herramientas.length === 1 ? '' : 's'} disponible${area.herramientas.length === 1 ? '' : 's'}` : 'Próximamente'}</span></Link> })}</div>
    </section>
  </main>
}

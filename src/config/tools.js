import { BarChart3, BriefcaseBusiness, Building2, GraduationCap, Landmark } from 'lucide-react'
import { lazy } from 'react'

export const areas = [
  {
    id: 'usegbe',
    nombre: 'USEGBE',
    descripcion: 'Seguimiento a egresados, bienestar y oportunidades laborales.',
    icono: GraduationCap,
    herramientas: [
      {
        id: 'graficos-egresados',
        nombre: 'Gráficos de seguimiento a egresados',
        descripcion: 'Carga respuestas Excel y genera gráficos institucionales por pregunta y carrera.',
        icono: BarChart3,
        componente: lazy(() => import('../tools/usegbe/graficos-egresados/GraficosEgresados.jsx')),
      },
      {
        id: 'solicitud-marketing-bolsa-empleo',
        nombre: 'Solicitud de marketing – Bolsa de empleo',
        descripcion: 'Convierte el correo de una vacante en un requerimiento editable y un documento Word.',
        icono: BriefcaseBusiness,
        componente: lazy(() => import('../tools/usegbe/solicitud-marketing/SolicitudMarketing.jsx')),
      },
    ],
  },
  {
    id: 'uri',
    nombre: 'URI',
    descripcion: 'Herramientas para relaciones institucionales y vinculación.',
    icono: Building2,
    herramientas: [],
  },
  {
    id: 'ufc',
    nombre: 'UFC',
    descripcion: 'Herramientas para formación continua y gestión académica.',
    icono: Landmark,
    herramientas: [],
  },
]

export function findArea(id) {
  return areas.find((area) => area.id === id)
}

export function findTool(areaId, toolId) {
  return findArea(areaId)?.herramientas.find((tool) => tool.id === toolId)
}

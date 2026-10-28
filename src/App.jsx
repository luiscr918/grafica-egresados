import { Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Layout from './components/shared/Layout'
import Home from './pages/Home'
import AreaPage from './pages/AreaPage'
import ToolPage from './pages/ToolPage'

function Loading() { return <div className="route-loading">Cargando herramienta...</div> }

export default function App() {
  return <BrowserRouter><Routes><Route element={<Layout />}><Route path="/" element={<Home />} /><Route path="/:area" element={<AreaPage />} /><Route path="/:area/:herramienta" element={<Suspense fallback={<Loading />}><ToolPage /></Suspense>} /><Route path="*" element={<Home />} /></Route></Routes></BrowserRouter>
}

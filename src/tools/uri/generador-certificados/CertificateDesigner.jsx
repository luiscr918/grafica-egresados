import { useEffect, useRef, useState } from 'react'
import { constrainBox, designBoxes } from './lib/design.js'
import { ROLE_LABELS } from './lib/model.js'

let renderer
async function pdfRenderer() {
  if (!renderer) renderer = Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')]).then(([pdfjs, worker]) => {
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default
    return pdfjs
  }).catch((error) => { renderer = null; throw error })
  return renderer
}

export default function CertificateDesigner({ event, people, onChange, disabled }) {
  const [personId, setPersonId] = useState('')
  const [selected, setSelected] = useState('heading')
  const [size, setSize] = useState({ width: 841.89, height: 595.28 })
  const [status, setStatus] = useState(''), [error, setError] = useState(''), [painted, setPainted] = useState(false)
  const canvas = useRef(null), stage = useRef(null), gesture = useRef(null)
  const person = people.find((p) => p.id === personId) || people[0]
  const role = person?.role
  const boxes = role ? designBoxes(event, role, size.width, size.height) : {}
  const box = boxes[selected]

  useEffect(() => {
    if (!person) return
    let active = true, task, renderTask
    setStatus('Actualizando vista previa…'); setError('')
    const timer = setTimeout(async () => {
      try {
        const [{ generateCertificates }, pdfjs] = await Promise.all([import('./lib/certificates.js'), pdfRenderer()])
        const bytes = await generateCertificates(event, [person])
        if (!active) return
        task = pdfjs.getDocument({ data: bytes })
        const document = await task.promise
        const page = await document.getPage(1)
        if (!active) return
        const dimensions = page.getViewport({ scale: 1 })
        // Render offscreen so an outdated request never replaces a newer preview.
        const viewport = page.getViewport({ scale: 1.5 })
        const buffer = window.document.createElement('canvas')
        buffer.width = Math.ceil(viewport.width); buffer.height = Math.ceil(viewport.height)
        renderTask = page.render({ canvasContext: buffer.getContext('2d'), viewport })
        await renderTask.promise
        if (!active || !canvas.current) return
        canvas.current.width = buffer.width; canvas.current.height = buffer.height
        canvas.current.getContext('2d').drawImage(buffer, 0, 0)
        setSize({ width: dimensions.width, height: dimensions.height }); setPainted(true); setStatus('Vista previa actualizada')
      } catch (issue) {
        if (active) { setError(issue.message); setStatus('La vista previa no está actualizada') }
      } finally { await task?.destroy() }
    }, 450)
    return () => { active = false; clearTimeout(timer); renderTask?.cancel(); task?.destroy() }
  }, [event, person])

  function update(key, value) {
    const next = constrainBox(value, size.width, size.height)
    const { x, y, width, height, scale } = next
    onChange({ ...event, designs: { ...event.designs, [role]: { ...event.designs?.[role], [key]: { x, y, width, height, scale } } } })
  }
  function start(e, key, resize = false) {
    if (disabled) return
    e.preventDefault(); e.stopPropagation(); setSelected(key)
    const rect = stage.current.getBoundingClientRect()
    gesture.current = { key, resize, box: boxes[key], x: e.clientX, y: e.clientY, ratio: size.width / rect.width }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  function move(e) {
    const g = gesture.current
    if (!g || disabled) return
    const dx = (e.clientX - g.x) * g.ratio, dy = (e.clientY - g.y) * g.ratio
    update(g.key, g.resize ? { ...g.box, width: g.box.width + dx, height: g.box.height + dy } : { ...g.box, x: g.box.x + dx, y: g.box.y + dy })
  }
  function keyMove(e, key) {
    const delta = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key]
    if (!delta || disabled) return
    e.preventDefault()
    update(key, { ...boxes[key], x: boxes[key].x + delta[0] * (e.shiftKey ? 10 : 1), y: boxes[key].y + delta[1] * (e.shiftKey ? 10 : 1) })
  }
  return <div className="cert-designer">
    <h3>Editor visual de distribución</h3>
    <p className="cert-help">Selecciona un bloque y arrástralo. Usa la esquina inferior derecha para cambiar su espacio y «Tamaño del texto» para reducirlo o ampliarlo. Cada firma mueve su nombre y cargo juntos. Los ajustes se aplican a todos los certificados del mismo rol en este evento y se conservan al guardar el expediente. El fondo decorativo es fijo.</p>
    {!person ? <p className="message message-info">Completa la revisión de al menos un acreedor para editar su modelo.</p> : <>
      <div className="cert-fields">
        <label>Persona de muestra<select aria-label="Persona de muestra" value={person.id} onChange={(e) => { setPersonId(e.target.value); setSelected('heading'); setPainted(false) }}>{people.map((p) => <option key={p.id} value={p.id}>{p.certificateName} · {ROLE_LABELS[p.role]}</option>)}</select></label>
        <label>Elemento a editar<select aria-label="Elemento a editar" value={box ? selected : ''} onChange={(e) => setSelected(e.target.value)}><option value="" disabled>Seleccionar elemento</option>{Object.entries(boxes).map(([key, item]) => <option key={key} value={key}>{item.label}</option>)}</select></label>
      </div>
      <p className="cert-help"><strong>Modelo: {ROLE_LABELS[role]}</strong>. Posiciones y dimensiones en puntos. También puedes mover con las flechas del teclado; Mayús + flecha mueve 10 puntos.</p>
      {box && <div className="cert-designer-controls">
        {Object.entries({ x: 'Posición horizontal', y: 'Posición vertical', width: 'Ancho del bloque', height: 'Alto del bloque' }).map(([key, label]) => <label key={key}>{label}<input type="number" step="1" min={key === 'width' ? 20 : key === 'height' ? 12 : 0} value={Math.round(box[key] * 10) / 10} onChange={(e) => { if (e.target.value !== '') update(selected, { ...box, [key]: Number(e.target.value) }) }} /></label>)}
        <label>Tamaño del texto (%)<input type="number" min="40" max="200" step="5" value={Math.round(box.scale * 100)} onChange={(e) => { if (e.target.value !== '') update(selected, { ...box, scale: Number(e.target.value) / 100 }) }} /></label>
      </div>}
      <div className="cert-button-row"><button type="button" className="cert-text-button" disabled={!event.designs?.[role]?.[selected]} onClick={() => { const next = { ...event.designs?.[role] }; delete next[selected]; onChange({ ...event, designs: { ...event.designs, [role]: next } }) }}>Restaurar elemento</button><button type="button" className="cert-text-button" disabled={!Object.keys(event.designs?.[role] || {}).length} onClick={() => onChange({ ...event, designs: { ...event.designs, [role]: {} } })}>Restaurar distribución de este modelo</button></div>
      <p className="cert-help" role="status">{status}</p>
      {error && <p className="message message-error" role="alert">{error} Ajusta el espacio o reduce el texto. La última imagen se conserva como referencia; las descargas validan de nuevo el diseño.</p>}
      <div className={`cert-designer-stage ${error ? 'has-error' : ''}`} ref={stage} style={{ aspectRatio: `${size.width} / ${size.height}` }}>
        <canvas ref={canvas} aria-label="Vista previa editable del certificado" />
        {painted && Object.entries(boxes).map(([key, item]) => <div key={key} role="button" tabIndex={disabled ? -1 : 0} aria-label={`Mover ${item.label}`} aria-pressed={selected === key} className={`cert-design-box ${selected === key ? 'selected' : ''}`} style={{ left: `${item.x / size.width * 100}%`, top: `${item.y / size.height * 100}%`, width: `${item.width / size.width * 100}%`, height: `${item.height / size.height * 100}%` }} onFocus={() => setSelected(key)} onKeyDown={(e) => keyMove(e, key)} onPointerDown={(e) => start(e, key)} onPointerMove={move} onPointerUp={() => { gesture.current = null }} onPointerCancel={() => { gesture.current = null }} onLostPointerCapture={() => { gesture.current = null }}>
          <span className="cert-design-box-label">{item.label}</span><span role="button" tabIndex={-1} aria-label={`Redimensionar ${item.label}`} className="cert-design-handle" onPointerDown={(e) => start(e, key, true)} />
        </div>)}
      </div>
    </>}
  </div>
}

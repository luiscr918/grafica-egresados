import { useEffect, useRef, useState } from 'react'
import { alignBox, changeDesign, constrainBox, designBoxes, resizeBox } from './lib/design.js'
import { ROLE_LABELS } from './lib/model.js'
import { changeLogo, logoBoxes, MAX_LOGO_DATA, readLogo } from './lib/logos.js'

let renderer
async function pdfRenderer() {
  if (!renderer) renderer = Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')]).then(([pdfjs, worker]) => {
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default
    return pdfjs
  }).catch((error) => { renderer = null; throw error })
  return renderer
}

export default function CertificateDesigner({ event, people, onChange, disabled: externallyDisabled }) {
  const [uploading, setUploading] = useState(false), [logoError, setLogoError] = useState('')
  const disabled = externallyDisabled || uploading
  const latest = useRef(event), alive = useRef(true)
  latest.current = event
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  const [personId, setPersonId] = useState('')
  const [selected, setSelected] = useState('heading')
  const [editing, setEditing] = useState('')
  const [scope, setScope] = useState('person'), [guides, setGuides] = useState([])
  const [size, setSize] = useState({ width: 841.89, height: 595.28 })
  const [status, setStatus] = useState(''), [error, setError] = useState(''), [painted, setPainted] = useState(false)
  const canvas = useRef(null), stage = useRef(null), gesture = useRef(null)
  const person = people.find((p) => p.id === personId) || people[0]
  const role = person?.role
  const boxes = role ? { ...designBoxes(scope === 'model' ? { ...event, certificateDesigns: {} } : event, role, size.width, size.height, person.id), ...logoBoxes(event, size.width, size.height) } : {}
  const box = boxes[selected]
  const isLogo = selected.startsWith('logo:')
  const personal = event.certificateDesigns?.[person?.id]
  const saved = scope === 'model' ? event.designs?.[role] : personal?.role === role ? personal.boxes : {}
  const editingBox = editing === selected ? boxes[editing] : null
  const signer = editingBox && event.signers[Number(editing.replace('signer', ''))]

  async function uploadLogos(e) {
    const files = [...e.target.files]
    e.target.value = ''
    if (!files.length || disabled) return
    const initial = event
    setUploading(true); setLogoError('')
    try {
      const added = []
      for (const file of files) added.push(await readLogo(file, (initial.logos || []).length + added.length))
      if (!alive.current) return
      if (latest.current !== initial) throw new Error('El evento cambió mientras se leían los logos. Selecciona los archivos nuevamente.')
      const logos = [...(initial.logos || []), ...added]
      if (logos.reduce((total, logo) => total + logo.dataUrl.length, 0) > MAX_LOGO_DATA) throw new Error('Los logos ocupan demasiado espacio para guardar el expediente. Usa PNG más pequeños o elimina alguno.')
      // Keep the initial frame inside the page, including very wide/tall PNGs.
      const next = { ...initial, logos: logos.map((logo) => constrainBox({ ...logo, scale: 1 }, size.width, size.height)) }
      logoBoxes(next, size.width, size.height)
      onChange(next); setSelected(`logo:${added[0].id}`); setEditing('')
    } catch (issue) { if (alive.current) setLogoError(issue.message) }
    finally { if (alive.current) setUploading(false) }
  }

  useEffect(() => {
    if (!person) return
    let active = true, task, renderTask
    setStatus('Actualizando vista previa…'); setError('')
    const timer = setTimeout(async () => {
      try {
        const [{ generateCertificates }, pdfjs] = await Promise.all([import('./lib/certificates.js'), pdfRenderer()])
        const bytes = await generateCertificates(scope === 'model' ? { ...event, certificateDesigns: {} } : event, [person])
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
  }, [event, person, scope])

  function update(key, value) {
    if (disabled) return
    const next = constrainBox(value, size.width, size.height)
    if (key.startsWith('logo:')) { onChange(changeLogo(event, key, next)); return }
    onChange(changeDesign(event, person, scope, key, Object.fromEntries(Object.entries(next).filter(([field]) => field !== 'label'))))
  }
  function start(e, key, resize = '') {
    if (disabled || e.button !== 0) return
    e.preventDefault(); e.stopPropagation(); setSelected(key)
    e.currentTarget.closest('.cert-design-box').focus({ preventScroll: true })
    const rect = stage.current.getBoundingClientRect()
    gesture.current = { key, resize, box: boxes[key], x: e.clientX, y: e.clientY, ratio: size.width / rect.width }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  function move(e) {
    const g = gesture.current
    if (!g || disabled) return
    const dx = (e.clientX - g.x) * g.ratio, dy = (e.clientY - g.y) * g.ratio
    if (g.resize) {
      setGuides([])
      update(g.key, resizeBox(g.box, g.resize, dx, dy, size.width, size.height))
    } else {
      const candidate = { ...g.box, x: g.box.x + dx, y: g.box.y + dy }
      const aligned = e.altKey ? { box: candidate, guides: [] } : alignBox(candidate, Object.fromEntries(Object.entries(boxes).filter(([key]) => key !== g.key)), size.width, size.height, 5 * g.ratio)
      setGuides(aligned.guides); update(g.key, aligned.box)
    }
  }
  function end() { gesture.current = null; setGuides([]) }
  function editText(key) {
    if (disabled || !key.startsWith('signer')) return
    end(); setSelected(key); setEditing(key)
  }
  function closeText() {
    setEditing('')
    stage.current?.querySelector('.cert-design-box.selected')?.focus({ preventScroll: true })
  }
  function keyMove(e, key) {
    if (e.key === 'F2' && key.startsWith('signer') && !disabled) { e.preventDefault(); editText(key); return }
    const delta = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key]
    if (!delta || disabled || !boxes[key] || e.altKey || e.ctrlKey || e.metaKey) return
    e.preventDefault(); e.stopPropagation(); setGuides([])
    update(key, { ...boxes[key], x: boxes[key].x + delta[0] * (e.shiftKey ? 10 : 1), y: boxes[key].y + delta[1] * (e.shiftKey ? 10 : 1) })
  }
  return <div className="cert-designer">
    <h3>Editor visual de distribución</h3>
    <div className="cert-logo-panel">
      <h4>Logos compartidos de la generación</h4>
      <p className="cert-help">El fondo es el mismo para organizadores, ponentes y participantes. Sube tus logos PNG (con transparencia si la tienen), selecciónalos y acomódalos en el lienzo. Su posición y tamaño se aplican siempre a todos los certificados, incluso al editar uno individual. Las imágenes mantienen sus proporciones dentro del bloque y se guardan con el expediente.</p>
      <label>Subir logos PNG<input aria-label="Subir logos PNG" type="file" accept="image/png,.png" multiple disabled={disabled} onChange={uploadLogos} /></label>
      {uploading && <p role="status">Preparando logos…</p>}
      {logoError && <p className="message message-error" role="alert">{logoError}</p>}
      <div className="cert-logo-list">{(event.logos || []).map((logo) => <div className="cert-logo-item" key={logo.id}>
        <button type="button" className="cert-logo-select" disabled={disabled} aria-pressed={selected === `logo:${logo.id}`} onClick={() => { setSelected(`logo:${logo.id}`); setEditing('') }}><img src={logo.dataUrl} alt="" /><span>{logo.name}</span></button>
        <button type="button" className="cert-text-button" disabled={disabled} aria-label={`Quitar logo ${logo.name}`} onClick={() => { onChange(changeLogo(event, `logo:${logo.id}`, null)); if (selected === `logo:${logo.id}`) setSelected('heading') }}>Quitar</button>
      </div>)}</div>
    </div>
    <p className="cert-help">Selecciona un bloque y arrástralo o muévelo con las flechas del teclado. Cambia su espacio desde cualquiera de sus lados o esquinas y usa «Tamaño del texto» para reducir o ampliar las letras. Haz doble clic en una firma para editar su nombre y cargo; Enter en el cargo crea una nueva línea. Los ajustes se conservan al guardar el expediente.</p>
    {!person ? <p className="message message-info">Completa la revisión de al menos un acreedor para editar su modelo.</p> : <>
      <div className="cert-fields">
        <label>Persona de muestra<select aria-label="Persona de muestra" disabled={disabled} value={person.id} onChange={(e) => { end(); setEditing(''); setPersonId(e.target.value); setSelected('heading'); setPainted(false) }}>{people.map((p) => <option key={p.id} value={p.id}>{p.certificateName} · {ROLE_LABELS[p.role]}</option>)}</select></label>
        <label>Elemento a editar<select aria-label="Elemento a editar" disabled={disabled} value={box ? selected : ''} onChange={(e) => setSelected(e.target.value)}><option value="" disabled>Seleccionar elemento</option>{Object.entries(boxes).map(([key, item]) => <option key={key} value={key}>{item.label}</option>)}</select></label>
      </div>
      <fieldset className="cert-design-scope" disabled={disabled}>
        <legend>¿A quién se aplican los cambios?</legend>
        <label><input type="radio" name="certificate-design-scope" checked={scope === 'person'} onChange={() => { end(); setEditing(''); setScope('person') }} />Solo este certificado</label>
        <label><input type="radio" name="certificate-design-scope" checked={scope === 'model'} onChange={() => { end(); setEditing(''); setScope('model') }} />Todos los certificados de este modelo</label>
        <p className="cert-help" role="status">{isLogo ? <strong>Logo compartido: cualquier cambio se aplica a todos los roles y personas de esta generación.</strong> : scope === 'person' ? <>Editando únicamente a <strong>{person.certificateName}</strong>. Los demás conservan su distribución. Restaurar recupera la plantilla de {ROLE_LABELS[role]}.</> : <>Editando los textos y firmas de <strong>{ROLE_LABELS[role]}</strong>. Cada elemento que cambies se aplica a todas las personas de este rol y reemplaza sus ajustes individuales de ese elemento. La vista muestra la plantilla común.</>}</p>
      </fieldset>
      <p className="cert-help"><strong>Modelo: {ROLE_LABELS[role]}</strong>. Flechas: 1 punto; Mayús + flecha: 10 puntos. Al arrastrar aparecen guías de centro y alineación; mantén Alt para mover sin ajuste. El fondo decorativo es fijo.</p>
      {box && <fieldset className="cert-designer-controls" disabled={disabled}>
        {Object.entries({ x: 'Posición horizontal', y: 'Posición vertical', width: 'Ancho del bloque', height: 'Alto del bloque' }).map(([key, label]) => <label key={key}>{label}<input type="number" step="1" min={key === 'width' ? 20 : key === 'height' ? 12 : 0} value={Math.round(box[key] * 10) / 10} onChange={(e) => { if (e.target.value !== '') update(selected, { ...box, [key]: Number(e.target.value) }) }} /></label>)}
        {!isLogo && <label>Tamaño del texto (%)<input type="number" min="40" max="200" step="5" value={Math.round(box.scale * 100)} onChange={(e) => { if (e.target.value !== '') update(selected, { ...box, scale: Number(e.target.value) / 100 }) }} /></label>}
      </fieldset>}
      {!isLogo && <div className="cert-button-row"><button type="button" className="cert-text-button" disabled={disabled || (!saved?.[selected] && !(scope === 'model' && Object.values(event.certificateDesigns || {}).some((p) => p.role === role && p.boxes?.[selected])))} onClick={() => onChange(changeDesign(event, person, scope, selected, null))}>Restaurar elemento</button><button type="button" className="cert-text-button" disabled={disabled || (!Object.keys(saved || {}).length && !(scope === 'model' && Object.values(event.certificateDesigns || {}).some((p) => p.role === role)))} onClick={() => onChange(changeDesign(event, person, scope, null, null))}>{scope === 'person' ? 'Restaurar este certificado a la plantilla' : 'Restaurar distribución de este modelo'}</button>
        {selected.startsWith('signer') && <button type="button" className="cert-text-button" disabled={disabled} onClick={() => editText(selected)}>Editar texto de esta firma</button>}
        {scope === 'person' && <button type="button" className="cert-text-button" disabled={disabled || personal?.role !== role || !Object.keys(personal.boxes || {}).length} onClick={() => {
          let next = event
          for (const [key, item] of Object.entries(boxes).filter(([key]) => !key.startsWith('logo:'))) next = changeDesign(next, person, 'model', key, Object.fromEntries(Object.entries(item).filter(([field]) => field !== 'label')))
          onChange(next); setScope('model')
        }}>Aplicar esta distribución a todos los certificados de {ROLE_LABELS[role]}</button>}
      </div>}
      <p className="cert-help" role="status">{status}</p>
      {error && <p className="message message-error" role="alert">{error} Ajusta el espacio o reduce el texto. La última imagen se conserva como referencia; las descargas validan de nuevo el diseño.</p>}
      <div className={`cert-designer-stage ${error ? 'has-error' : ''}`} ref={stage} onKeyDown={(e) => keyMove(e, selected)} style={{ aspectRatio: `${size.width} / ${size.height}` }}>
        <canvas ref={canvas} aria-label="Vista previa editable del certificado" />
        {painted && Object.entries(boxes).map(([key, item]) => <div key={key} role="button" tabIndex={disabled ? -1 : 0} aria-label={`Mover ${item.label}`} aria-pressed={selected === key} className={`cert-design-box ${selected === key ? 'selected' : ''}`} style={{ left: `${item.x / size.width * 100}%`, top: `${item.y / size.height * 100}%`, width: `${item.width / size.width * 100}%`, height: `${item.height / size.height * 100}%` }} onFocus={() => setSelected(key)} onDoubleClick={(e) => { if (!e.target.closest('.cert-design-handle')) editText(key) }} onPointerDown={(e) => start(e, key)} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end}>
          <span className="cert-design-box-label">{item.label}</span>{Object.entries({ nw: 'esquina superior izquierda', n: 'arriba', ne: 'esquina superior derecha', e: 'derecha', se: '', s: 'abajo', sw: 'esquina inferior izquierda', w: 'izquierda' }).map(([direction, label]) => <span key={direction} role="button" tabIndex={-1} aria-label={`Redimensionar ${item.label}${label ? `: ${label}` : ''}`} className={`cert-design-handle handle-${direction}`} onPointerDown={(e) => start(e, key, direction)} />)}
        </div>)}
        {guides.map((guide) => <div key={guide.axis} className={`cert-alignment-guide guide-${guide.axis}`} style={guide.axis === 'x' ? { left: `${guide.position / size.width * 100}%` } : { top: `${guide.position / size.height * 100}%` }}><span>{guide.label}</span></div>)}
        {signer && <div role="dialog" aria-label="Editar texto de firma" className="cert-signature-editor" onPointerDown={(e) => e.stopPropagation()} onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Escape') { e.preventDefault(); closeText() } }}>
          <strong>Editar firma</strong>
          <p className="cert-help">{scope === 'person' ? `Solo ${person.certificateName}` : `Todos los certificados de ${ROLE_LABELS[role]}`}. Cambios en vivo; Enter en el cargo respeta el salto de línea.</p>
          <label>Nombre de la firma<input aria-label="Nombre de la firma" disabled={disabled} value={editingBox.signerName ?? signer.name} onChange={(e) => update(editing, { ...editingBox, signerName: e.target.value })} /></label>
          <label>Cargo de la firma<textarea aria-label="Cargo de la firma" autoFocus disabled={disabled} rows={3} value={editingBox.signerTitle ?? signer.title} onChange={(e) => update(editing, { ...editingBox, signerTitle: e.target.value })} /></label>
          <button type="button" className="cert-text-button" onClick={closeText}>Listo, ver certificado</button>
        </div>}
      </div>
    </>}
  </div>
}

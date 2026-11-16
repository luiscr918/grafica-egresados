// Coordinates are PDF points, measured from the top-left of the page.
export const SIGNER_INDICES = { organizer: [0, 2], speaker: [0, 1], participant: [0, 1, 2] }

export function designBoxes(event, role, width, height, personId) {
  const indices = SIGNER_INDICES[role]
  const column = (width - 100) / indices.length
  const defaults = {
    heading: { label: 'Título CERTIFICADO', x: 55, y: 134, width: width - 94, height: 57, scale: 1 },
    recipient: { label: 'Nombre del acreedor', x: 55, y: 196, width: width - 110, height: 76, scale: 1 },
    body: { label: 'Redacción', x: 50, y: 278, width: width - 100, height: 190, scale: 1 },
  }
  indices.forEach((index, i) => {
    defaults[`signer${index}`] = { label: `Firma ${i + 1}: nombre y cargo`, x: 60 + column * i, y: 485, width: column - 20, height: Math.min(65, height - 485), scale: 1 }
  })
  return Object.fromEntries(Object.entries(defaults).map(([key, box]) => {
    const personal = event.certificateDesigns?.[personId]
    const saved = { ...event.designs?.[role]?.[key], ...(personal?.role === role ? personal.boxes?.[key] : {}) }
    const result = { ...box }
    for (const field of ['x', 'y', 'width', 'height', 'scale']) {
      if (saved[field] !== undefined) {
        if (typeof saved[field] !== 'number' || !Number.isFinite(saved[field])) throw new Error(`Diseño de ${box.label}: valor inválido.`)
        result[field] = saved[field]
      }
    }
    if (key.startsWith('signer')) for (const field of ['signerName', 'signerTitle']) {
      if (saved[field] !== undefined) {
        if (typeof saved[field] !== 'string') throw new Error(`Diseño de ${box.label}: texto inválido.`)
        result[field] = saved[field]
      }
    }
    if (result.x < 0 || result.y < 0 || result.width < 20 || result.height < 12 || result.scale < .4 || result.scale > 2 || result.x + result.width > width + .1 || result.y + result.height > height + .1) throw new Error(`Diseño de ${box.label}: el bloque debe estar dentro de la página y tener un tamaño válido.`)
    return [key, result]
  }))
}

export function constrainBox(box, width, height) {
  const w = Math.min(width, Math.max(20, box.width)), h = Math.min(height, Math.max(12, box.height))
  return { ...box, width: w, height: h, x: Math.max(0, Math.min(width - w, box.x)), y: Math.max(0, Math.min(height - h, box.y)), scale: Math.max(.4, Math.min(2, box.scale)) }
}

// A template edit replaces this element's exceptions, so "all" really means all.
// Other personalized elements and other roles remain independent.
export function changeDesign(event, person, scope, key, value) {
  const certificateDesigns = { ...event.certificateDesigns }
  if (scope === 'person') {
    const previous = certificateDesigns[person.id]
    const boxes = { ...(previous?.role === person.role ? previous.boxes : {}) }
    if (!key) Object.keys(boxes).forEach((name) => delete boxes[name])
    else if (value) boxes[key] = value
    else delete boxes[key]
    if (Object.keys(boxes).length) certificateDesigns[person.id] = { role: person.role, boxes }
    else delete certificateDesigns[person.id]
    return { ...event, certificateDesigns }
  }
  const model = { ...event.designs?.[person.role] }
  if (!key) Object.keys(model).forEach((name) => delete model[name])
  else if (value) model[key] = value
  else delete model[key]
  for (const [id, personal] of Object.entries(certificateDesigns)) {
    if (personal.role !== person.role) continue
    const boxes = { ...personal.boxes }
    if (key) delete boxes[key]
    else Object.keys(boxes).forEach((name) => delete boxes[name])
    if (Object.keys(boxes).length) certificateDesigns[id] = { ...personal, boxes }
    else delete certificateDesigns[id]
  }
  return { ...event, designs: { ...event.designs, [person.role]: model }, certificateDesigns }
}

export function resizeBox(box, direction, dx, dy, width, height) {
  let left = box.x, top = box.y, right = box.x + box.width, bottom = box.y + box.height
  if (direction.includes('w')) left = Math.max(0, Math.min(right - 20, left + dx))
  if (direction.includes('e')) right = Math.min(width, Math.max(left + 20, right + dx))
  if (direction.includes('n')) top = Math.max(0, Math.min(bottom - 12, top + dy))
  if (direction.includes('s')) bottom = Math.min(height, Math.max(top + 12, bottom + dy))
  return { ...box, x: left, y: top, width: right - left, height: bottom - top }
}

export function alignBox(box, others, width, height, threshold = 4) {
  const next = constrainBox(box, width, height), guides = []
  for (const [axis, length, page] of [['x', 'width', width], ['y', 'height', height]]) {
    const targets = [{ position: page / 2, label: 'Centro de la página' }]
    for (const other of Object.values(others)) {
      for (const fraction of [0, .5, 1]) targets.push({ position: other[axis] + other[length] * fraction, label: other.label })
    }
    let best
    for (const target of targets) for (const fraction of [0, .5, 1]) {
      const delta = target.position - (next[axis] + next[length] * fraction)
      const position = next[axis] + delta
      if (Math.abs(delta) <= threshold && position >= 0 && position + next[length] <= page && (!best || Math.abs(delta) < Math.abs(best.delta) - .01)) best = { ...target, delta }
    }
    if (best) { next[axis] += best.delta; guides.push({ axis, position: best.position, label: best.label }) }
  }
  return { box: next, guides }
}

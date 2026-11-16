// Coordinates are PDF points, measured from the top-left of the page.
export const SIGNER_INDICES = { organizer: [0, 2], speaker: [0, 1], participant: [0, 1, 2] }

export function designBoxes(event, role, width, height) {
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
    const saved = event.designs?.[role]?.[key] || {}
    const result = { ...box }
    for (const field of ['x', 'y', 'width', 'height', 'scale']) {
      if (saved[field] !== undefined) {
        if (typeof saved[field] !== 'number' || !Number.isFinite(saved[field])) throw new Error(`Diseño de ${box.label}: valor inválido.`)
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

// Logos belong to the event, never to a role or an individual certificate.
export const MAX_LOGO_DATA = 550000
const PNG_PREFIX = 'data:image/png;base64,'

export function logoBoxes(event, width, height) {
  const logos = event.logos || []
  if (!Array.isArray(logos)) throw new Error('La configuración de logos no es válida.')
  if (logos.reduce((total, logo) => total + (logo.dataUrl?.length || 0), 0) > MAX_LOGO_DATA) throw new Error('Los logos ocupan demasiado espacio. Usa imágenes más pequeñas o elimina un logo.')
  const boxes = {}, ids = new Set()
  for (const logo of logos) {
    if (typeof logo.id !== 'string' || !/^[\w-]+$/.test(logo.id) || ids.has(logo.id)) throw new Error('Identificador de logo inválido o duplicado.')
    ids.add(logo.id)
    if (typeof logo.dataUrl !== 'string' || !/^data:image\/png;base64,iVBORw0KGgo[A-Za-z0-9+/]*={0,2}$/.test(logo.dataUrl)) throw new Error(`El logo «${logo.name || ''}» debe ser una imagen PNG válida.`)
    if (['x', 'y', 'width', 'height'].some((field) => typeof logo[field] !== 'number' || !Number.isFinite(logo[field])) || logo.x < 0 || logo.y < 0 || logo.width < 20 || logo.height < 12 || logo.x + logo.width > width + .1 || logo.y + logo.height > height + .1) throw new Error(`El logo «${logo.name || ''}» debe estar dentro de la página y tener un tamaño válido.`)
    boxes[`logo:${logo.id}`] = { label: `Logo: ${logo.name || 'PNG'}`, x: logo.x, y: logo.y, width: logo.width, height: logo.height, scale: 1 }
  }
  return boxes
}

export function changeLogo(event, key, box) {
  return { ...event, logos: (event.logos || []).flatMap((logo) => {
    if (`logo:${logo.id}` !== key) return [logo]
    return box ? [{ ...logo, ...Object.fromEntries(['x', 'y', 'width', 'height'].map((field) => [field, box[field]])) }] : []
  }) }
}

// Fit inside the editable frame, preserving the PNG's aspect ratio.
export function fitLogo(image, box) {
  const ratio = Math.min(box.width / image.width, box.height / image.height)
  const width = image.width * ratio, height = image.height * ratio
  return { x: box.x + (box.width - width) / 2, y: box.y + (box.height - height) / 2, width, height }
}

export async function readLogo(file, index = 0) {
  if (file.size > 20 * 1024 * 1024) throw new Error(`«${file.name}» supera 20 MB. Usa una versión más pequeña.`)
  const bytes = new Uint8Array(await file.arrayBuffer())
  if (![137, 80, 78, 71, 13, 10, 26, 10].every((value, i) => bytes[i] === value)) throw new Error(`«${file.name}» no es una imagen PNG. Selecciona un archivo .png.`)
  // Check the IHDR before decoding large images in the browser.
  if (bytes.length < 24) throw new Error(`«${file.name}» es un PNG incompleto.`)
  const header = new DataView(bytes.buffer)
  const w = header.getUint32(16), h = header.getUint32(20)
  if (!w || !h || w * h > 16000000) throw new Error(`«${file.name}» tiene dimensiones demasiado grandes. Reduce la imagen a menos de 16 megapíxeles.`)
  const bitmap = await createImageBitmap(file)
  try {
    const canvas = document.createElement('canvas')
    let edge = Math.min(1200, Math.max(bitmap.width, bitmap.height)), dataUrl
    do {
      const ratio = Math.min(1, edge / Math.max(bitmap.width, bitmap.height))
      canvas.width = Math.max(1, Math.round(bitmap.width * ratio)); canvas.height = Math.max(1, Math.round(bitmap.height * ratio))
      canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
      dataUrl = canvas.toDataURL('image/png')
      if (dataUrl.length <= 180000) break
      edge = Math.floor(edge * .75)
    } while (edge >= 200)
    if (!dataUrl.startsWith(PNG_PREFIX) || dataUrl.length > 180000) throw new Error(`«${file.name}» ocupa demasiado espacio. Usa un PNG más sencillo o pequeño.`)
    const ratio = Math.min(150 / bitmap.width, 65 / bitmap.height)
    return { id: crypto.randomUUID(), name: file.name, dataUrl, x: 310 + (index % 3) * 160, y: 60 + Math.floor(index / 3) * 15, width: Math.max(20, bitmap.width * ratio), height: Math.max(12, bitmap.height * ratio) }
  } finally { bitmap.close() }
}

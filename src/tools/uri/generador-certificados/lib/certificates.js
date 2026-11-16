import { PDFDocument, rgb } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import { clean, evaluatePerson, ROLE_LABELS, validateCertificateEvent } from './model.js'
import { designBoxes, SIGNER_INDICES } from './design.js'
import { fitLogo, logoBoxes } from './logos.js'

const FILES = ['fondo-unico.pdf', 'NewIconScript.otf', 'BeatrixAntiqua.otf', 'Poppins-Regular.ttf', 'Poppins-Bold.ttf']
const BLUE = rgb(.075, .23, .36), GOLD = rgb(.79, .6, .2), INK = rgb(.04, .08, .11)
let assetPromise
const characterSets = new WeakMap()

export async function loadCertificateAssets(loader) {
  if (loader) return Promise.all(FILES.map(loader))
  if (!assetPromise) assetPromise = Promise.all(FILES.map(async (file) => {
    const response = await fetch(`${import.meta.env?.BASE_URL || '/'}certificados/${file}`)
    if (!response.ok) throw new Error(`No se pudo cargar el recurso de certificados: ${file}.`)
    return new Uint8Array(await response.arrayBuffer())
  })).catch((error) => { assetPromise = null; throw error })
  return assetPromise
}

function checkCharacters(text, font, field) {
  if (!characterSets.has(font)) characterSets.set(font, new Set(font.getCharacterSet()))
  const supported = characterSets.get(font)
  const missing = [...new Set([...text.normalize('NFC')].filter((c) => c !== '\n' && !supported.has(c.codePointAt(0))))]
  if (missing.length) throw new Error(`${field}: la fuente no contiene estos caracteres: ${missing.join(' ')}. Corrige el texto antes de generar.`)
}

function linesFor(text, font, size, width) {
  const lines = []
  for (const paragraph of text.split('\n')) {
    let line = ''
    for (const word of clean(paragraph).split(' ')) {
      if (font.widthOfTextAtSize(word, size) > width) return null
      const next = line ? `${line} ${word}` : word
      if (font.widthOfTextAtSize(next, size) <= width) line = next
      else { lines.push(line); line = word }
    }
    lines.push(line)
  }
  return lines
}

export function fitText(text, font, { width, height, maxSize, minSize, maxLines, leading = 1.3, balanced = false }) {
  text = text.replace(/\r\n?/g, '\n').normalize('NFC').trim()
  if (!text) throw new Error('Completa el texto de la firma antes de generar el certificado.')
  checkCharacters(text, font, 'Texto')
  for (let size = maxSize; size >= minSize; size = Math.round((size - .5) * 10) / 10) {
    let lines = linesFor(text, font, size, width)
    if (balanced && !text.includes('\n') && maxLines === 2 && lines?.length > 1) {
      const words = clean(text).split(' '), candidates = []
      for (let i = 1; i < words.length; i++) {
        const first = words.slice(0, i).join(' '), second = words.slice(i).join(' ')
        if (/(?:^|\s)(de|del|la|las|los|y)$/i.test(first)) continue
        const widest = Math.max(font.widthOfTextAtSize(first, size), font.widthOfTextAtSize(second, size))
        if (widest <= width) candidates.push({ lines: [first, second], widest })
      }
      candidates.sort((a, b) => a.widest - b.widest)
      if (candidates.length) lines = candidates[0].lines
    }
    if (lines && lines.length <= maxLines && (lines.length - 1) * size * leading + font.heightAtSize(size) <= height) return { lines, size, leading }
  }
  throw new Error(`El texto «${text.slice(0, 75)}…» no cabe de forma legible. Ajusta su redacción o longitud.`)
}

function richParagraphs(template, event, role) {
  const values = { tema: event.title, institucion: event.institution, horas: String(event.hours[role]), enfoque: event.focus, modalidad: event.modality, fecha: event.date }
  const text = template.replace(/\{([^{}]+)\}/g, (_, key) => {
    if (!(key in values)) throw new Error(`Campo desconocido en la redacción: {${key}}.`)
    return clean(values[key])
  }).normalize('NFC')
  if ((text.match(/\*\*/g) || []).length % 2) throw new Error('Revisa la redacción: cada negrita debe abrir y cerrar con **.')
  return text.split(/\n\s*\n/).filter((p) => p.trim()).map((p) => {
    let bold = false
    return p.split(/(\*\*)/).flatMap((part) => {
      if (part === '**') { bold = !bold; return [] }
      return part.split(/(\s+)/).filter(Boolean).map((word) => ({ text: /\s/.test(word[0]) ? word.includes('\n') ? '\n' : ' ' : word, bold }))
    })
  })
}

function richLayout(paragraphs, fonts, width, height, scale = 1) {
  for (let size = 12 * scale; size >= 9.5 * scale - .01; size -= .25 * scale) {
    const blocks = []
    let y = 0, failed = false
    for (const paragraph of paragraphs) {
      let line = [], lineWidth = 0
      const finish = () => {
        while (line.at(-1)?.text === ' ') { const item = line.pop(); lineWidth -= item.width }
        if (line.length) { blocks.push({ items: line, width: lineWidth, offset: y }); y += size * 1.4 }
        line = []; lineWidth = 0
      }
      for (const token of paragraph) {
        if (token.text === '\n') { finish(); continue }
        if (token.text === ' ' && !line.length) continue
        const font = token.bold ? fonts.bold : fonts.regular
        checkCharacters(token.text, font, 'Redacción')
        const w = font.widthOfTextAtSize(token.text, size)
        if (w > width) { failed = true; break }
        if (lineWidth + w > width) { finish(); if (token.text === ' ') continue }
        line.push({ ...token, width: w }); lineWidth += w
      }
      finish(); y += size * .7
    }
    if (!failed && y <= height) return { blocks, size }
  }
  throw new Error('La redacción es demasiado extensa para un certificado de una página. Reduce el texto; no se recortará su contenido.')
}

function drawCentered(page, layout, font, centerX, top, color) {
  const firstBaseline = page.getHeight() - top - font.heightAtSize(layout.size, { descender: false })
  layout.lines.forEach((line, i) => page.drawText(line, {
    x: centerX - font.widthOfTextAtSize(line, layout.size) / 2,
    y: firstBaseline - i * layout.size * layout.leading, font, size: layout.size, color,
  }))
}

async function prepare(event, people, assets) {
  validateCertificateEvent(event)
  if (!people.length) throw new Error('Selecciona al menos un acreedor para generar certificados.')
  for (const person of people) if (!evaluatePerson(person, event).eligible) throw new Error(`${person.certificateName || 'Registro sin nombre'}: todavía no cumple los requisitos de emisión.`)
  const [backgroundBytes, nameBytes, titleBytes, bodyBytes, boldBytes] = assets || await loadCertificateAssets()
  const document = await PDFDocument.create()
  document.registerFontkit(fontkit)
  // Full font embedding also supports the CFF/OTF fonts recovered from Canva.
  const [name, title, regular, bold] = await Promise.all([nameBytes, titleBytes, bodyBytes, boldBytes].map((bytes) => document.embedFont(bytes)))
  const fonts = { name, title, regular, bold }
  const backgrounds = await PDFDocument.load(backgroundBytes)
  const { width, height } = backgrounds.getPage(0).getSize()
  const sharedBoxes = logoBoxes(event, width, height)
  const logos = await Promise.all((event.logos || []).map(async (logo) => {
    try {
      const image = await document.embedPng(logo.dataUrl)
      return { image, box: fitLogo(image, sharedBoxes[`logo:${logo.id}`]) }
    } catch { throw new Error(`No se pudo leer el logo «${logo.name}». Vuelve a cargar un PNG válido.`) }
  }))
  const layouts = people.map((person) => {
    const boxes = designBoxes(event, person.role, width, height, person.id)
    const recipient = boxes.recipient
    checkCharacters(person.certificateName, name, 'Nombre')
    let nameLayout
    try { nameLayout = fitText(person.certificateName.normalize('NFC'), name, { width: recipient.width, height: recipient.height, maxSize: 38 * recipient.scale, minSize: 28 * recipient.scale, maxLines: 1 }) }
    catch { nameLayout = fitText(person.certificateName.normalize('NFC'), name, { width: recipient.width, height: recipient.height, maxSize: 30 * recipient.scale, minSize: 23 * recipient.scale, maxLines: 2, leading: 1.15, balanced: true }) }
    if (!clean(event.texts[person.role])) throw new Error(`Completa la redacción para ${ROLE_LABELS[person.role]}.`)
    const body = richLayout(richParagraphs(event.texts[person.role], event, person.role), fonts, boxes.body.width, boxes.body.height, boxes.body.scale)
    const heading = fitText('CERTIFICADO', title, { width: boxes.heading.width, height: boxes.heading.height, maxSize: 48 * boxes.heading.scale, minSize: 20 * boxes.heading.scale, maxLines: 1 })
    const signerIndices = SIGNER_INDICES[person.role]
    const signers = signerIndices.map((index) => {
      const box = boxes[`signer${index}`], scale = box.scale
      const signer = { name: box.signerName ?? event.signers[index].name, title: box.signerTitle ?? event.signers[index].title }
      const signerName = fitText(signer.name, bold, { width: box.width, height: Math.min(30 * scale, box.height), maxSize: 13 * scale, minSize: 10 * scale, maxLines: 2 })
      const nameHeight = (signerName.lines.length - 1) * signerName.size * signerName.leading + bold.heightAtSize(signerName.size)
      const signerTitle = fitText(signer.title, regular, { width: box.width, height: box.height - nameHeight - 4 * scale, maxSize: 12 * scale, minSize: 9.5 * scale, maxLines: 3 })
      return { name: signerName, title: signerTitle, nameHeight, box }
    })
    return { person, name: nameLayout, heading, body, signers, boxes }
  })
  return { document, backgrounds, fonts, layouts, logos }
}

export async function generateCertificates(event, people, options = {}) {
  const { document, backgrounds, fonts, layouts, logos } = await prepare(event, people, options.assets)
  for (const [index, layout] of layouts.entries()) {
    const role = layout.person.role
    const [page] = await document.copyPages(backgrounds, [0])
    document.addPage(page)
    const width = page.getWidth(), height = page.getHeight()
    const { boxes } = layout
    options.onLayout?.({ width, height, boxes, role })
    for (const { image, box } of logos) page.drawImage(image, { x: box.x, y: height - box.y - box.height, width: box.width, height: box.height })
    drawCentered(page, layout.heading, fonts.title, boxes.heading.x + boxes.heading.width / 2, boxes.heading.y, BLUE)
    const nameHeight = (layout.name.lines.length - 1) * layout.name.size * layout.name.leading + fonts.name.heightAtSize(layout.name.size)
    drawCentered(page, layout.name, fonts.name, boxes.recipient.x + boxes.recipient.width / 2, boxes.recipient.y + Math.max(0, (boxes.recipient.height - nameHeight) / 2), GOLD)
    for (const line of layout.body.blocks) {
      let x = boxes.body.x + (boxes.body.width - line.width) / 2
      for (const item of line.items) {
        page.drawText(item.text, { x, y: height - boxes.body.y - line.offset - fonts.regular.heightAtSize(layout.body.size, { descender: false }), size: layout.body.size, font: item.bold ? fonts.bold : fonts.regular, color: INK })
        x += item.width
      }
    }
    for (const signer of layout.signers) {
      const center = signer.box.x + signer.box.width / 2
      drawCentered(page, signer.name, fonts.bold, center, signer.box.y, BLUE)
      drawCentered(page, signer.title, fonts.regular, center, signer.box.y + signer.nameHeight + 4 * signer.box.scale, BLUE)
    }
    options.onProgress?.(index + 1, layouts.length)
    if (index % 10 === 0) await new Promise((resolve) => setTimeout(resolve, 0))
  }
  document.setTitle(`Certificados · ${event.title}`)
  document.setAuthor('URI · ITSQMET')
  return document.save()
}

export function safeFilename(value) {
  return clean(value).replace(/[<>:"/\\|?*\u0000-\u001f]/g, '').replace(/[. ]+$/g, '').slice(0, 110) || 'certificado'
}

export async function downloadCertificates(event, people, format, options = {}) {
  const { saveAs } = await import('file-saver')
  if (format !== 'zip') {
    const bytes = await generateCertificates(event, people, options)
    saveAs(new Blob([bytes], { type: 'application/pdf' }), `${safeFilename(people.length === 1 ? people[0].certificateName : event.title)}.pdf`)
    return
  }
  // Preflight the whole batch before emitting any download.
  await prepare(event, people, options.assets)
  const { default: JSZip } = await import('jszip')
  const zip = new JSZip()
  for (const [i, person] of people.entries()) {
    const bytes = await generateCertificates(event, [person], { assets: options.assets })
    zip.file(`${ROLE_LABELS[person.role]}/${String(i + 1).padStart(3, '0')}-${safeFilename(person.certificateName)}.pdf`, bytes)
    options.onProgress?.(i + 1, people.length)
  }
  saveAs(await zip.generateAsync({ type: 'blob' }), `${safeFilename(event.title)}.zip`)
}

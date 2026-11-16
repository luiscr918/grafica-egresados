// Optional browser smoke test. Mounts the workspace with an intentionally
// unauthorized synthetic UID: no real Firebase reads/writes or credentials.
// Usage: node scripts/verify-certificate-ui.mjs <temporary-dir-with-playwright>
// Add --designer-only to use synthetic recipients when original imports are unavailable.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createServer } from 'vite'
import { PDFDocument, PDFName } from 'pdf-lib'
import JSZip from 'jszip'
import XLSX from 'xlsx'

const temporary = process.argv[2]
const designerOnly = process.argv.includes('--designer-only')
if (!temporary) throw new Error('Provide an existing temporary directory containing node_modules/playwright.')
process.env.TEMP = temporary
process.env.TMP = temporary
const { chromium } = await import(pathToFileURL(join(temporary, 'node_modules/playwright/index.mjs')))
const root = dirname(dirname(fileURLToPath(import.meta.url)))
const virtual = '\0virtual:certificate-smoke.jsx'
const server = await createServer({
  root, server: { host: '127.0.0.1', port: 5187, strictPort: true, open: false },
  plugins: [{
    name: 'certificate-ui-smoke',
    resolveId(id) { if (id === 'virtual:certificate-smoke' || id === virtual) return virtual },
    load(id) {
      if (id !== virtual) return
      if (!designerOnly) return `import React from 'react'; import {createRoot} from 'react-dom/client'; import {CertificateWorkspace} from '/src/tools/uri/generador-certificados/GeneradorCertificados.jsx'; import '/src/styles.css'; createRoot(document.getElementById('root')).render(React.createElement(CertificateWorkspace,{user:{uid:'certificate-ui-smoke-not-authorized',email:'prueba-local@example.org'}}));`
      return `import React, {useState} from 'react'; import {createRoot} from 'react-dom/client';
        import Designer from '/src/tools/uri/generador-certificados/CertificateDesigner.jsx';
        import {blankEvent,civilTime,createSnapshot} from '/src/tools/uri/generador-certificados/lib/model.js';
        import {organizerPerson} from '/src/tools/uri/generador-certificados/lib/roster.js';
        import {downloadCertificates} from '/src/tools/uri/generador-certificados/lib/certificates.js';
        import '/src/styles.css'; import '/src/tools/uri/generador-certificados/certificates.css';
        const initial = {...blankEvent(),title:'Innovación educativa',institution:'Universidad de Ejemplo',focus:'formación docente',date:'2026-11-12',startTime:'15:00:00',endTime:'16:00:00',windowConfirmed:true};
        initial.signers[2]={name:'Dra. Ana Ejemplo',title:'Representante institucional'};
        const start=civilTime(initial.date,initial.startTime);
        const participant=(id,name)=>({...organizerPerson(name),id,role:'participant',registration:{id:'f'+id,consentIssue:false},sessions:[{start,end:start+3600}]});
        const people=[participant('p1','Verónica Patricia Castro Constante'),participant('p2','María José Pérez Díaz'),organizerPerson(initial.organizerName),{...organizerPerson('Agustín Cueva'),id:'speaker',role:'speaker'}];
         function Harness(){const [event,setEvent]=useState(initial),[id,setId]=useState('p1'),h=React.createElement; window.certificateSmoke={event,reopen:()=>setEvent(JSON.parse(JSON.stringify(createSnapshot(event,people))).event)}; return h('main',{className:'cert-workspace',style:{maxWidth:1100,margin:'auto',padding:20}},
          h('label',null,'Certificados a generar',h('select',{'aria-label':'Certificados a generar',value:id,onChange:e=>setId(e.target.value)},h('option',{value:'all'},'Todos'),...people.map(p=>h('option',{key:p.id,value:p.id},p.certificateName)))),
          h('button',{onClick:()=>downloadCertificates(event,id==='all'?people:people.filter(p=>p.id===id),'pdf')},'Descargar PDF'),
          h('button',{onClick:()=>downloadCertificates(event,id==='all'?people:people.filter(p=>p.id===id),'zip')},'PDF individuales en ZIP'),
          h(Designer,{event,people,onChange:setEvent}));};
        createRoot(document.getElementById('root')).render(React.createElement(Harness));`
    },
    configureServer(vite) {
      vite.middlewares.use('/__certificate_smoke', async (req, res) => {
        const html = await vite.transformIndexHtml('/__certificate_smoke', '<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/@id/__x00__virtual:certificate-smoke.jsx"></script></body></html>')
        res.setHeader('Content-Type', 'text/html'); res.end(html)
      })
    },
  }],
})
let browser
try {
  await server.listen()
  browser = await chromium.launch({ channel: 'msedge', headless: true, downloadsPath: temporary })
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true })
  page.setDefaultTimeout(20000)
  const errors = []
  page.on('pageerror', (e) => { errors.push(e.message); console.error('Browser error:', e.message) })
  await page.goto('http://127.0.0.1:5187/__certificate_smoke')
  if (!designerOnly) {
  await page.getByRole('heading', { name: 'Certificados de clases magistrales' }).waitFor()
  await page.getByRole('button', { name: 'Grupo KFC', exact: true }).click()
  await page.getByRole('button', { name: '2 Archivos', exact: true }).click()
  await page.locator('.cert-import-card input[type=file]').nth(0).setInputFiles(join(root, 'material_para_certificados/grupo_kfc/registro_forms.xlsx'))
  await page.getByRole('button', { name: 'Aplicar archivo y reconstruir cruces' }).nth(0).click()
  await page.locator('.cert-file-applied').first().waitFor()
  await page.locator('.cert-import-card input[type=file]').nth(1).setInputFiles(join(root, 'material_para_certificados/grupo_kfc/registro_teams.csv'))
  await page.getByRole('button', { name: 'Aplicar archivo y reconstruir cruces' }).nth(1).click()
  await page.locator('.cert-file-applied').nth(1).waitFor()
  await page.getByRole('button', { name: '1 Evento', exact: true }).click()
  assert.equal(await page.getByLabel('Fecha del evento', { exact: true }).inputValue(), '2026-11-06')
  assert.equal(await page.getByLabel('Inicio efectivo', { exact: true }).inputValue(), '15:03:30')
  assert.equal(await page.getByLabel('Fin efectivo', { exact: true }).inputValue(), '16:17:38')
  await page.getByLabel('Confirmo que este tramo', { exact: false }).check()
  await page.getByRole('button', { name: '3 Revisión', exact: true }).click()
  await page.getByLabel('Rol de Agustín Cueva', { exact: true }).selectOption('speaker')
  await page.getByRole('button', { name: 'Marcar nombres visibles como revisados' }).click()
  const castroRow = page.locator('.cert-roster-table tbody tr').filter({ hasText: 'Verónica Patricia Castro Constante' })
  await castroRow.getByRole('button', { name: 'Revisar', exact: true }).click()
  const registration = page.getByLabel('Inscripción de Forms vinculada')
  const option = registration.locator('option').filter({ hasText: 'Veronica Castro' })
  await registration.selectOption(await option.getAttribute('value'))
  await page.getByLabel('Revisé el nombre, su orden y ortografía.', { exact: true }).check()
  assert.equal(await page.locator('.certificate-step:not([hidden]) .cert-stat-grid strong').first().innerText(), '9')
  await page.screenshot({ path: join(temporary, 'revision-escritorio.png'), fullPage: true })
  await page.getByRole('button', { name: 'Vista previa de su certificado' }).click()
  await page.locator('iframe[title="Vista previa de certificados URI"]').waitFor()
  assert.match(await page.locator('iframe').getAttribute('src'), /^blob:/)
  }
  const pdfDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Descargar PDF', exact: true }).click()
  await (await pdfDownload).saveAs(join(temporary, 'certificado-ui.pdf'))
  assert.equal((await PDFDocument.load(await readFile(join(temporary, 'certificado-ui.pdf')))).getPageCount(), 1)
  // Edit the participant model and confirm the downloaded PDF uses the same
  // positions and font sizes shown by the actual-PDF canvas editor.
  const sampleId = await page.getByLabel('Certificados a generar').inputValue()
  await page.getByLabel('Persona de muestra', { exact: true }).selectOption(sampleId)
  await page.getByRole('radio', { name: 'Todos los certificados de este modelo', exact: true }).check()
  await page.locator('.cert-designer').getByText('Vista previa actualizada', { exact: true }).waitFor()
  await page.getByLabel('Elemento a editar', { exact: true }).selectOption('signer0')
  assert.equal(await page.locator('.cert-design-box.selected .cert-design-handle:visible').count(), 8)
  const beforeX = Number(await page.getByLabel('Posición horizontal', { exact: true }).inputValue())
  const beforeY = Number(await page.getByLabel('Posición vertical', { exact: true }).inputValue())
  const signerBox = page.getByRole('button', { name: 'Mover Firma 1: nombre y cargo', exact: true })
  await signerBox.scrollIntoViewIfNeeded()
  const rect = await signerBox.boundingBox()
  await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2)
  await page.mouse.down(); await page.mouse.move(rect.x + rect.width / 2 - 15, rect.y + rect.height / 2 - 22, { steps: 5 }); await page.mouse.up()
  let editedX = Number(await page.getByLabel('Posición horizontal', { exact: true }).inputValue())
  const editedY = Number(await page.getByLabel('Posición vertical', { exact: true }).inputValue())
  assert.ok(editedX < beforeX && editedY < beforeY, 'Dragging changes PDF-point coordinates')
  assert.equal(await signerBox.evaluate((node) => node === document.activeElement), true, 'Pointer selection focuses the block')
  await page.keyboard.press('ArrowLeft')
  assert.equal(Number(await page.getByLabel('Posición horizontal', { exact: true }).inputValue()), Math.round((editedX - 1) * 10) / 10)
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('Shift+ArrowUp')
  assert.equal(Number(await page.getByLabel('Posición vertical', { exact: true }).inputValue()), Math.round((editedY - 10) * 10) / 10)
  await page.keyboard.press('Shift+ArrowDown')
  const beforeWidth = Number(await page.getByLabel('Ancho del bloque', { exact: true }).inputValue())
  const handle = await page.getByRole('button', { name: 'Redimensionar Firma 1: nombre y cargo', exact: true }).boundingBox()
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2)
  await page.mouse.down(); await page.mouse.move(handle.x + 32, handle.y + 14, { steps: 4 }); await page.mouse.up()
  assert.ok(Number(await page.getByLabel('Ancho del bloque', { exact: true }).inputValue()) > beforeWidth)
  for (const [side, dx, dy, field] of [['arriba', 0, -5, 'Alto del bloque'], ['abajo', 0, 5, 'Alto del bloque'], ['izquierda', -5, 0, 'Ancho del bloque'], ['derecha', 5, 0, 'Ancho del bloque']]) {
    const before = Number(await page.getByLabel(field, { exact: true }).inputValue())
    const h = await page.getByRole('button', { name: `Redimensionar Firma 1: nombre y cargo: ${side}`, exact: true }).boundingBox()
    await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2)
    await page.mouse.down(); await page.mouse.move(h.x + h.width / 2 + dx, h.y + h.height / 2 + dy, { steps: 3 }); await page.mouse.up()
    assert.ok(Number(await page.getByLabel(field, { exact: true }).inputValue()) > before, `Side resize: ${side}`)
  }
  editedX = Number(await page.getByLabel('Posición horizontal', { exact: true }).inputValue())
  const savedY = await page.getByLabel('Posición vertical', { exact: true }).inputValue()
  const stage = await page.locator('.cert-designer-stage').boundingBox()
  const moving = await signerBox.boundingBox()
  await page.mouse.move(moving.x + moving.width / 2, moving.y + moving.height / 2)
  await page.mouse.down(); await page.mouse.move(stage.x + stage.width / 2, moving.y + moving.height / 2, { steps: 5 })
  await page.locator('.cert-alignment-guide.guide-x').waitFor()
  assert.match(await page.locator('.cert-alignment-guide.guide-x').innerText(), /Centro de la página/)
  await page.keyboard.down('Alt')
  await page.mouse.move(stage.x + stage.width / 2 + 1, moving.y + moving.height / 2)
  assert.equal(await page.locator('.cert-alignment-guide').count(), 0, 'Alt disables alignment')
  await page.keyboard.up('Alt'); await page.mouse.up()
  assert.equal(await page.locator('.cert-alignment-guide').count(), 0, 'Guides disappear after dragging')
  await page.getByLabel('Posición horizontal', { exact: true }).fill(String(editedX))
  await page.getByLabel('Posición vertical', { exact: true }).fill(savedY)
  await page.getByLabel('Tamaño del texto (%)', { exact: true }).fill('70')
  await page.locator('.cert-designer').getByText('Vista previa actualizada', { exact: true }).waitFor()
  assert.equal(await page.locator('.cert-designer .message-error').count(), 0)
  await page.screenshot({ path: join(temporary, 'editor-certificados.png'), fullPage: true })
  const editedDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Descargar PDF', exact: true }).click()
  await (await editedDownload).saveAs(join(temporary, 'certificado-editado.pdf'))
  async function signerMetrics(bytes) {
    return page.evaluate(async (data) => {
      const pdfjs = await import('/node_modules/pdfjs-dist/build/pdf.mjs')
      pdfjs.GlobalWorkerOptions.workerSrc = '/node_modules/pdfjs-dist/build/pdf.worker.min.mjs'
      const task = pdfjs.getDocument({ data: new Uint8Array(data) })
      try {
        const pdf = await task.promise, p = await pdf.getPage(1)
        const text = await p.getTextContent()
        const name = text.items.find((item) => item.str.includes('Alex'))
        return { x: name.transform[4], y: name.transform[5], size: Math.abs(name.transform[0]) }
      } finally { await task.destroy() }
    }, [...bytes])
  }
  const originalMetrics = await signerMetrics(await readFile(join(temporary, 'certificado-ui.pdf')))
  const editedMetrics = await signerMetrics(await readFile(join(temporary, 'certificado-editado.pdf')))
  assert.ok(editedMetrics.y > originalMetrics.y, 'Moving up in the editor moves the PDF baseline up')
  assert.ok(editedMetrics.size < originalMetrics.size * .8, 'Font reduction reaches the exported PDF')
  await page.getByLabel('Persona de muestra', { exact: true }).selectOption('organizer')
  await page.getByLabel('Elemento a editar', { exact: true }).selectOption('signer0')
  assert.equal(Number(await page.getByLabel('Posición horizontal', { exact: true }).inputValue()), 60, 'Organizer model stays independent')
  await page.getByLabel('Persona de muestra', { exact: true }).selectOption(sampleId)
  await page.getByLabel('Elemento a editar', { exact: true }).selectOption('signer0')
  assert.equal(Number(await page.getByLabel('Posición horizontal', { exact: true }).inputValue()), editedX)
  await page.getByLabel('Certificados a generar').selectOption('all')
  const zipDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'PDF individuales en ZIP', exact: true }).click()
  await (await zipDownload).saveAs(join(temporary, 'certificados-ui.zip'))
  const zip = await JSZip.loadAsync(await readFile(join(temporary, 'certificados-ui.zip')))
  assert.equal(Object.keys(zip.files).filter((name) => name.endsWith('.pdf')).length, designerOnly ? 4 : 9)
  const castroPdf = Object.values(zip.files).find((file) => file.name.endsWith('.pdf') && file.name.includes('Castro'))
  assert.deepEqual(await signerMetrics(await castroPdf.async('uint8array')), editedMetrics, 'ZIP uses the edited participant layout too')
  // Personal exception: a second participant retains the common template.
  await page.getByRole('radio', { name: 'Solo este certificado', exact: true }).check()
  await signerBox.click()
  await page.keyboard.press('Shift+ArrowRight')
  assert.equal(Number(await page.getByLabel('Posición horizontal', { exact: true }).inputValue()), editedX + 10)
  const otherParticipant = await page.getByLabel('Persona de muestra', { exact: true }).locator('option').evaluateAll((options, id) => options.find((o) => o.value !== id && /participante/i.test(o.textContent)).value, sampleId)
  await page.getByLabel('Persona de muestra', { exact: true }).selectOption(otherParticipant)
  await page.getByLabel('Elemento a editar', { exact: true }).selectOption('signer0')
  assert.equal(Number(await page.getByLabel('Posición horizontal', { exact: true }).inputValue()), editedX)
  await page.getByLabel('Persona de muestra', { exact: true }).selectOption(sampleId)
  await page.getByLabel('Elemento a editar', { exact: true }).selectOption('signer0')
  assert.equal(Number(await page.getByLabel('Posición horizontal', { exact: true }).inputValue()), editedX + 10)
  await page.getByLabel('Certificados a generar').selectOption(sampleId)
  const personalPdfDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Descargar PDF', exact: true }).click()
  const personalPdfMetrics = await signerMetrics(await readFile(await (await personalPdfDownload).path()))
  assert.ok(Math.abs(personalPdfMetrics.x - editedMetrics.x - 10) < .2, 'Individual exception reaches PDF')
  await page.getByLabel('Certificados a generar').selectOption('all')
  const personalZipDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'PDF individuales en ZIP', exact: true }).click()
  const personalZip = await JSZip.loadAsync(await readFile(await (await personalZipDownload).path()))
  const personalCastro = Object.values(personalZip.files).find((file) => file.name.endsWith('.pdf') && file.name.includes('Castro'))
  const personalMetrics = await signerMetrics(await personalCastro.async('uint8array'))
  assert.ok(Math.abs(personalMetrics.x - editedMetrics.x - 10) < .2, 'Individual exception reaches ZIP')
  assert.deepEqual(personalMetrics, personalPdfMetrics)
  await page.getByRole('button', { name: 'Restaurar este certificado a la plantilla', exact: true }).click()
  assert.equal(Number(await page.getByLabel('Posición horizontal', { exact: true }).inputValue()), editedX)
  await page.getByLabel('Posición horizontal', { exact: true }).fill(String(editedX + 5))
  await page.getByRole('button', { name: /Aplicar esta distribución a todos los certificados de/ }).click()
  await page.getByLabel('Persona de muestra', { exact: true }).selectOption(otherParticipant)
  await page.getByLabel('Elemento a editar', { exact: true }).selectOption('signer0')
  assert.equal(Number(await page.getByLabel('Posición horizontal', { exact: true }).inputValue()), editedX + 5, 'Promote individual layout to all participants')
  await page.getByLabel('Elemento a editar', { exact: true }).selectOption('signer0')
  await page.getByRole('button', { name: 'Restaurar elemento', exact: true }).click()
  assert.equal(Number(await page.getByLabel('Posición horizontal', { exact: true }).inputValue()), beforeX)
  assert.equal(Number(await page.getByLabel('Posición vertical', { exact: true }).inputValue()), beforeY)
  // Edit directly from a signature, preserving explicit newlines and scope.
  await page.getByRole('radio', { name: 'Solo este certificado', exact: true }).check()
  await signerBox.dblclick()
  const textEditor = page.getByRole('dialog', { name: 'Editar texto de firma', exact: true })
  const titleField = textEditor.getByLabel('Cargo de la firma', { exact: true })
  await titleField.fill('Representante GAD')
  await titleField.press('End'); await titleField.press('Enter')
  await page.keyboard.insertText('El Chaco (Alcaldía de Napo)')
  const title = 'Representante GAD\nEl Chaco (Alcaldía de Napo)'
  assert.equal(await titleField.inputValue(), title)
  const stationaryX = await page.getByLabel('Posición horizontal', { exact: true }).inputValue()
  await titleField.press('ArrowLeft')
  assert.equal(await page.getByLabel('Posición horizontal', { exact: true }).inputValue(), stationaryX, 'Text cursor arrows do not move the block')
  await page.locator('.cert-designer').getByText('Vista previa actualizada', { exact: true }).waitFor()
  assert.equal(await page.locator('.cert-designer .message-error').count(), 0)
  await page.screenshot({ path: join(temporary, 'editor-firma-texto.png'), fullPage: true })
  await textEditor.getByRole('button', { name: 'Listo, ver certificado', exact: true }).click()
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('F2')
  assert.equal(await titleField.inputValue(), title, 'Moving preserves edited signature text; F2 opens editing')
  await titleField.press('Escape')
  await page.getByLabel('Certificados a generar').selectOption(otherParticipant)
  const signaturePdfDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Descargar PDF', exact: true }).click()
  async function signatureLines(bytes) {
    return page.evaluate(async (data) => {
      const pdfjs = await import('/node_modules/pdfjs-dist/build/pdf.mjs')
      pdfjs.GlobalWorkerOptions.workerSrc = '/node_modules/pdfjs-dist/build/pdf.worker.min.mjs'
      const task = pdfjs.getDocument({ data: new Uint8Array(data) })
      try {
        const pdf = await task.promise, p = await pdf.getPage(1), content = await p.getTextContent()
        return content.items.filter((item) => ['Representante GAD', 'El Chaco (Alcaldía de Napo)'].includes(item.str)).map((item) => ({ text: item.str, y: item.transform[5] }))
      } finally { await task.destroy() }
    }, [...bytes])
  }
  const signatureText = await signatureLines(await readFile(await (await signaturePdfDownload).path()))
  assert.deepEqual(signatureText.map((line) => line.text), title.split('\n'))
  assert.ok(signatureText[0].y > signatureText[1].y, 'Manual line break draws on two separate PDF baselines')
  const signatureZipDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'PDF individuales en ZIP', exact: true }).click()
  const signatureZip = await JSZip.loadAsync(await readFile(await (await signatureZipDownload).path()))
  const signatureFile = Object.values(signatureZip.files).find((file) => file.name.endsWith('.pdf'))
  assert.deepEqual(await signatureLines(await signatureFile.async('uint8array')), signatureText)
  await page.getByLabel('Persona de muestra', { exact: true }).selectOption(sampleId)
  await page.getByLabel('Elemento a editar', { exact: true }).selectOption('signer0')
  await page.getByRole('button', { name: 'Editar texto de esta firma', exact: true }).click()
  assert.notEqual(await titleField.inputValue(), title, 'Other participant retains the original signature title')
  await titleField.press('Escape')
  await page.getByLabel('Persona de muestra', { exact: true }).selectOption(otherParticipant)
  await page.getByLabel('Elemento a editar', { exact: true }).selectOption('signer0')
  await page.getByRole('button', { name: /Aplicar esta distribución a todos los certificados de/ }).click()
  await page.getByLabel('Persona de muestra', { exact: true }).selectOption(sampleId)
  await page.getByLabel('Elemento a editar', { exact: true }).selectOption('signer0')
  await page.getByRole('button', { name: 'Editar texto de esta firma', exact: true }).click()
  assert.equal(await titleField.inputValue(), title, 'Promotion includes text and manual line breaks')
  await titleField.press('Escape')
  await page.getByRole('button', { name: 'Restaurar elemento', exact: true }).click()
  // Shared branding remains common even when editing in individual scope.
  const pngs = await page.evaluate(() => [[200, 100], [80, 160]].map(([w, h], i) => {
    const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h
    const ctx = canvas.getContext('2d'); ctx.fillStyle = i ? '#c29227' : '#193c5e'
    ctx.fillRect(8, 8, w - 16, h - 16); ctx.fillStyle = '#ffffff'; ctx.font = 'bold 20px sans-serif'; ctx.fillText(i ? 'B' : 'LOGO A', 15, 40)
    return canvas.toDataURL('image/png').split(',')[1]
  }))
  const uploader = page.getByLabel('Subir logos PNG', { exact: true })
  await uploader.setInputFiles(pngs.map((data, i) => ({ name: `logo-${i + 1}.png`, mimeType: 'image/png', buffer: Buffer.from(data, 'base64') })))
  await page.locator('.cert-logo-item').nth(1).waitFor()
  assert.equal(await page.locator('.cert-logo-item').count(), 2)
  await page.locator('.cert-designer').getByText('Vista previa actualizada', { exact: true }).waitFor()
  await page.getByRole('radio', { name: 'Solo este certificado', exact: true }).check()
  await page.locator('.cert-logo-select').first().click()
  assert.equal(await page.getByLabel('Tamaño del texto (%)', { exact: true }).count(), 0)
  await page.getByLabel('Posición horizontal', { exact: true }).fill('410')
  await page.getByLabel('Posición vertical', { exact: true }).fill('70')
  await page.getByLabel('Ancho del bloque', { exact: true }).fill('180')
  await page.getByLabel('Alto del bloque', { exact: true }).fill('70')
  const logoBlock = page.getByRole('button', { name: 'Mover Logo: logo-1.png', exact: true })
  await logoBlock.focus(); await page.keyboard.press('ArrowRight')
  assert.equal(await page.getByLabel('Posición horizontal', { exact: true }).inputValue(), '411')
  assert.equal(await page.locator('.cert-design-box.selected .cert-design-handle:visible').count(), 8)
  const logoHandle = await page.getByRole('button', { name: 'Redimensionar Logo: logo-1.png', exact: true }).boundingBox()
  await page.mouse.move(logoHandle.x + 6, logoHandle.y + 6); await page.mouse.down(); await page.mouse.move(logoHandle.x + 26, logoHandle.y + 16, { steps: 3 }); await page.mouse.up()
  const logoWidth = await page.getByLabel('Ancho del bloque', { exact: true }).inputValue()
  assert.ok(Number(logoWidth) > 180)
  for (const id of ['organizer', 'speaker', sampleId]) {
    await page.getByLabel('Persona de muestra', { exact: true }).selectOption(id)
    await page.locator('.cert-logo-select').first().click()
    assert.equal(await page.getByLabel('Posición horizontal', { exact: true }).inputValue(), '411')
    assert.equal(await page.getByLabel('Ancho del bloque', { exact: true }).inputValue(), logoWidth)
  }
  await uploader.setInputFiles({ name: 'falso.png', mimeType: 'image/png', buffer: Buffer.from('This is not a PNG') })
  await page.getByText('«falso.png» no es una imagen PNG.', { exact: false }).waitFor()
  assert.equal(await page.locator('.cert-logo-item').count(), 2, 'Invalid upload keeps existing branding')
  if (designerOnly) {
    const savedLogos = await page.evaluate(() => window.certificateSmoke.event.logos)
    await page.evaluate(() => window.certificateSmoke.reopen())
    assert.deepEqual(await page.evaluate(() => window.certificateSmoke.event.logos), savedLogos, 'Snapshot/reopen preserves PNG data and shared placement')
  }
  async function checkLogos(bytes, count) {
    const pdf = await PDFDocument.load(bytes)
    assert.equal(pdf.getPageCount(), count)
    for (const p of pdf.getPages()) {
      const objects = p.node.Resources().lookup(PDFName.of('XObject'))
      for (const width of [200, 80]) {
        const found = objects.entries().find(([, ref]) => pdf.context.lookup(ref).dict?.get(PDFName.of('Width'))?.asNumber() === width)
        assert.ok(found, `Shared PNG ${width}px appears on every certificate`)
        assert.ok(pdf.context.lookup(found[1]).dict.get(PDFName.of('SMask')), 'PNG transparency survives export')
      }
    }
  }
  await page.getByLabel('Certificados a generar').selectOption('all')
  const brandedDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Descargar PDF', exact: true }).click()
  await (await brandedDownload).saveAs(join(temporary, 'certificados-logos.pdf'))
  await checkLogos(await readFile(join(temporary, 'certificados-logos.pdf')), designerOnly ? 4 : 9)
  const brandedZipDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'PDF individuales en ZIP', exact: true }).click()
  const brandedZip = await JSZip.loadAsync(await readFile(await (await brandedZipDownload).path()))
  for (const file of Object.values(brandedZip.files).filter((f) => f.name.endsWith('.pdf'))) await checkLogos(await file.async('uint8array'), 1)
  await page.locator('.cert-designer').getByText('Vista previa actualizada', { exact: true }).waitFor()
  await page.screenshot({ path: join(temporary, 'editor-logos-compartidos.png'), fullPage: true })
  await page.getByRole('button', { name: 'Quitar logo logo-2.png', exact: true }).click()
  assert.equal(await page.locator('.cert-logo-item').count(), 1)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.locator('.cert-designer').getByText('Vista previa actualizada', { exact: true }).waitFor()
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'Editor must fit mobile viewport')
  await page.setViewportSize({ width: 1440, height: 1000 })
  if (!designerOnly) {
  const excelDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Informe Excel', exact: true }).click()
  await (await excelDownload).saveAs(join(temporary, 'informe-ui.xlsx'))
  const book = XLSX.read(await readFile(join(temporary, 'informe-ui.xlsx')), { type: 'buffer' })
  assert.equal(book.SheetNames.length, 4)
  assert.equal(XLSX.utils.sheet_to_json(book.Sheets['Para certificados'], { header: 1 }).length, 11)
  await page.getByRole('button', { name: 'Guardar evento y acreedores', exact: true }).click()
  await page.getByText('Esta cuenta no está autorizada para guardar certificados.', { exact: true }).last().waitFor()
  assert.equal(await page.locator('.cert-save-indicator').innerText(), 'Cambios sin guardar')
  await page.getByRole('button', { name: '3 Revisión', exact: true }).click()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: join(temporary, 'revision-movil.png'), fullPage: true })
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'Page must not overflow horizontally on mobile')
  const route = await browser.newPage()
  await route.goto('http://127.0.0.1:5187/uri/generador-certificados')
  await route.getByRole('button', { name: 'Iniciar sesión', exact: true }).waitFor()
  // Regression of the reported El Chaco case: all inclusion boxes are checked,
  // but the class window and participant names have not yet been confirmed.
  const chaco = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  chaco.on('pageerror', (e) => errors.push(e.message))
  await chaco.goto('http://127.0.0.1:5187/__certificate_smoke')
  await chaco.getByRole('button', { name: 'El Chaco', exact: true }).click()
  await chaco.getByRole('button', { name: '2 Archivos', exact: true }).click()
  for (const [i, filename] of ['registro_forms.xlsx', 'registro_teams.csv'].entries()) {
    await chaco.locator('.cert-import-card input[type=file]').nth(i).setInputFiles(join(root, 'material_para_certificados/chaco', filename))
    await chaco.getByRole('button', { name: 'Aplicar archivo y reconstruir cruces' }).nth(i).click()
    await chaco.locator('.cert-file-applied').nth(i).waitFor()
  }
  await chaco.getByRole('button', { name: '3 Revisión', exact: true }).click()
  const count = () => chaco.locator('.certificate-step:not([hidden]) .cert-stat-grid strong').first().innerText()
  assert.equal(await count(), '1')
  const lilian = 'Lilian Estefanía Mantilla Miranda'
  const lilianRow = chaco.locator('.cert-roster-table tbody tr').filter({ hasText: lilian })
  await chaco.getByRole('checkbox', { name: `Nombre revisado de ${lilian}`, exact: true }).check()
  assert.equal(await count(), '1', 'Name review alone must not bypass the window')
  await chaco.getByRole('checkbox', { name: `Seleccionar ${lilian}`, exact: true }).uncheck()
  assert.match(await lilianRow.innerText(), /0:53:00/)
  assert.match(await lilianRow.innerText(), /Excluido/)
  await chaco.getByRole('checkbox', { name: `Seleccionar ${lilian}`, exact: true }).check()
  await chaco.getByRole('button', { name: 'Confirmar este tramo', exact: true }).click()
  assert.equal(await count(), '2')
  for (const name of ['Danny Patricio Bermeo Ochoa', 'Yajaira Paola Zurita Analuisa']) await chaco.getByRole('checkbox', { name: `Nombre revisado de ${name}`, exact: true }).check()
  assert.equal(await count(), '4')
  assert.match(await chaco.locator('.cert-roster-table tbody tr').filter({ hasText: 'Yajaira Paola' }).innerText(), /Cumple con tolerancia/)
  await chaco.getByLabel('Rol de Katherine Simbaña', { exact: true }).selectOption('speaker')
  await chaco.getByRole('checkbox', { name: 'Nombre revisado de Katherine Simbaña', exact: true }).check()
  assert.equal(await count(), '5')
  await chaco.getByRole('button', { name: '4 Certificados', exact: true }).click()
  assert.equal(await chaco.getByLabel('Certificados a generar').locator('option').count(), 6)
  const chacoDownload = chaco.waitForEvent('download')
  await chaco.getByRole('button', { name: 'Descargar PDF', exact: true }).click()
  await (await chacoDownload).saveAs(join(temporary, 'chaco-cinco-certificados.pdf'))
  assert.equal((await PDFDocument.load(await readFile(join(temporary, 'chaco-cinco-certificados.pdf')))).getPageCount(), 5)
  }
  assert.deepEqual(errors, [])
   console.log('Browser smoke passed: PDF canvas editor, pointer/keyboard, eight handles/side resizes, guides/Alt, individual/model/promotion, personal PDF/ZIP metrics, inline signature line breaks; shared transparent PNG upload/move/resize/remove, invalid upload, all-role PDF/ZIP images, snapshot/reopen; restore, mobile. ' + (designerOnly ? 'Synthetic recipients; original import regressions not run.' : 'KFC9, Excel, login and El Chaco5 regression.') + ' No real Firebase access.')
} finally {
  await browser?.close()
  await server.close()
}

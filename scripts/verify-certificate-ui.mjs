// Optional browser smoke test. Mounts the workspace with an intentionally
// unauthorized synthetic UID: no real Firebase reads/writes or credentials.
// Usage: node scripts/verify-certificate-ui.mjs <temporary-dir-with-playwright>
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createServer } from 'vite'
import { PDFDocument } from 'pdf-lib'
import JSZip from 'jszip'
import XLSX from 'xlsx'

const temporary = process.argv[2]
if (!temporary) throw new Error('Provide an existing temporary directory containing node_modules/playwright.')
process.env.TEMP = temporary
process.env.TMP = temporary
const { chromium } = await import(pathToFileURL(join(temporary, 'node_modules/playwright/index.mjs')))
const root = dirname(dirname(fileURLToPath(import.meta.url)))
const virtual = '\0virtual:certificate-smoke'
const server = await createServer({
  root, server: { host: '127.0.0.1', port: 5187, strictPort: true, open: false },
  plugins: [{
    name: 'certificate-ui-smoke',
    resolveId(id) { if (id === 'virtual:certificate-smoke' || id === virtual) return virtual },
    load(id) { if (id === virtual) return `import React from 'react'; import {createRoot} from 'react-dom/client'; import {CertificateWorkspace} from '/src/tools/uri/generador-certificados/GeneradorCertificados.jsx'; import '/src/styles.css'; createRoot(document.getElementById('root')).render(React.createElement(CertificateWorkspace,{user:{uid:'certificate-ui-smoke-not-authorized',email:'prueba-local@example.org'}}));` },
    configureServer(vite) {
      vite.middlewares.use('/__certificate_smoke', async (req, res) => {
        const html = await vite.transformIndexHtml('/__certificate_smoke', '<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/@id/__x00__virtual:certificate-smoke"></script></body></html>')
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
  const pdfDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Descargar PDF', exact: true }).click()
  await (await pdfDownload).saveAs(join(temporary, 'certificado-ui.pdf'))
  assert.equal((await PDFDocument.load(await readFile(join(temporary, 'certificado-ui.pdf')))).getPageCount(), 1)
  // Edit the participant model and confirm the downloaded PDF uses the same
  // positions and font sizes shown by the actual-PDF canvas editor.
  const sampleId = await page.getByLabel('Certificados a generar').inputValue()
  await page.getByLabel('Persona de muestra', { exact: true }).selectOption(sampleId)
  await page.locator('.cert-designer').getByText('Vista previa actualizada', { exact: true }).waitFor()
  await page.getByLabel('Elemento a editar', { exact: true }).selectOption('signer0')
  const beforeX = Number(await page.getByLabel('Posición horizontal', { exact: true }).inputValue())
  const beforeY = Number(await page.getByLabel('Posición vertical', { exact: true }).inputValue())
  const signerBox = page.getByRole('button', { name: 'Mover Firma 1: nombre y cargo', exact: true })
  await signerBox.scrollIntoViewIfNeeded()
  const rect = await signerBox.boundingBox()
  await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2)
  await page.mouse.down(); await page.mouse.move(rect.x + rect.width / 2 - 15, rect.y + rect.height / 2 - 22, { steps: 5 }); await page.mouse.up()
  const editedX = Number(await page.getByLabel('Posición horizontal', { exact: true }).inputValue())
  const editedY = Number(await page.getByLabel('Posición vertical', { exact: true }).inputValue())
  assert.ok(editedX < beforeX && editedY < beforeY, 'Dragging changes PDF-point coordinates')
  const beforeWidth = Number(await page.getByLabel('Ancho del bloque', { exact: true }).inputValue())
  const handle = await page.getByRole('button', { name: 'Redimensionar Firma 1: nombre y cargo', exact: true }).boundingBox()
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2)
  await page.mouse.down(); await page.mouse.move(handle.x + 32, handle.y + 14, { steps: 4 }); await page.mouse.up()
  assert.ok(Number(await page.getByLabel('Ancho del bloque', { exact: true }).inputValue()) > beforeWidth)
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
  assert.equal(Object.keys(zip.files).filter((name) => name.endsWith('.pdf')).length, 9)
  const castroPdf = Object.values(zip.files).find((file) => file.name.endsWith('.pdf') && file.name.includes('Castro'))
  assert.deepEqual(await signerMetrics(await castroPdf.async('uint8array')), editedMetrics, 'ZIP uses the edited participant layout too')
  await page.getByLabel('Elemento a editar', { exact: true }).selectOption('signer0')
  await page.getByRole('button', { name: 'Restaurar elemento', exact: true }).click()
  assert.equal(Number(await page.getByLabel('Posición horizontal', { exact: true }).inputValue()), beforeX)
  assert.equal(Number(await page.getByLabel('Posición vertical', { exact: true }).inputValue()), beforeY)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.locator('.cert-designer').getByText('Vista previa actualizada', { exact: true }).waitFor()
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'Editor must fit mobile viewport')
  await page.setViewportSize({ width: 1440, height: 1000 })
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
  assert.deepEqual(errors, [])
  console.log('Browser smoke passed: actual PDF canvas editor, drag, resize, font reduction, independent role layouts, restore, edited PDF/ZIP text metrics and mobile; KFC9, Excel, login and El Chaco5 regression. No real Firebase access.')
} finally {
  await browser?.close()
  await server.close()
}

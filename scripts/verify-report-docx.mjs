import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import JSZip from 'jszip'
import { buildActivityReport } from '../src/tools/general/informe-actividades/lib/reportDocx.js'
import { evidenceLinks, getReportContent } from '../src/tools/general/informe-actividades/lib/reportContent.js'

const output = process.argv[2]
const report = {
  startDate: '2026-10-23', endDate: '2026-11-22', schedule: '',
  evidence: 'Respaldo adicional: revisión & validación <documental>.',
  activities: [
    { include: true, area: 'URI', category: 'Convenios de Cooperación Interinstitucional', refined: 'Organización y recopilación de documentación de respaldo para los procesos institucionales.' },
    { include: true, area: 'UFC', category: 'Gestión y seguimiento de los clubes institucionales', refined: 'Elaboración de informes y organización de evidencias de los clubes de fútbol y robótica.' },
    { include: true, area: 'USEGBE', category: 'Gestión de Bolsa de Empleo', refined: 'Seguimiento a vacantes y perfiles remitidos a empresas empleadoras.\nActualización de evidencias y registros.' },
    { include: false, area: 'URI', refined: 'NO EXPORTAR EXCLUIDA' },
    { include: true, area: '', refined: 'NO EXPORTAR SIN UNIDAD' },
    { include: true, area: 'URI', refined: '   ' },
  ],
}

for (const [variant, name, originalName] of [
  ['personal', 'luis', 'INFORME DE ACTIVIDADES OCTUBRELUIS.docx'],
  ['jefatura', 'yesenia', 'INFORME DE ACTIVIDADES OCTUBRE yess.docx'],
]) {
  const template = await readFile(new URL(`../public/informes/plantilla-${name}.docx`, import.meta.url))
  const original = await JSZip.loadAsync(await readFile(new URL(`../${originalName}`, import.meta.url)))
  const bytes = await buildActivityReport(report, variant, template)
  const zip = await JSZip.loadAsync(bytes)
  const document = await zip.file('word/document.xml').async('string')
  const header = await zip.file('word/header1.xml').async('string')
  const footer = await zip.file('word/footer1.xml').async('string')
  const footerText = footer.replace(/<[^>]+>/g, '')
  const rels = await zip.file('word/_rels/document.xml.rels').async('string')
  const text = document.replace(/<[^>]+>/g, '')
  assert.ok(!document.includes('{{'))
  assert.ok(!header.includes('{{'))
  assert.ok(header.includes('URI-UFC-USEGBE-RGI1-01-2026-11'))
  assert.ok(header.includes('23 de octubre de 2026 al 22 de noviembre de 2026'))
  assert.ok(!text.includes('NO EXPORTAR'))
  assert.ok(document.includes('&amp; validación &lt;documental&gt;'))
  assert.equal((document.match(/<w:numPr>/g) || []).length, 3)
  assert.equal((document.match(new RegExp(`<w:numId w:val="${variant === 'jefatura' ? 4 : 2}"/>`, 'g')) || []).length, 3)
  assert.equal((document.match(/<w:sectPr\b/g) || []).length, 2)
  assert.ok(document.includes('<w:br/>'))
  assert.equal(text.includes('lucastillo@itsqmet.edu.ec'), variant === 'personal')
  assert.ok(text.includes('mortegaf@itsqmet.edu.ec'))
  assert.ok(text.includes('bolsaempleo@itsqmet.edu.ec'))
  assert.ok(rels.includes(evidenceLinks.oneDrive.replaceAll('&', '&amp;')))
  assert.ok(rels.includes(evidenceLinks.sharePoint.replaceAll('&', '&amp;')))
  assert.ok(footerText.includes(variant === 'personal' ? 'Luis Castillo' : 'Yesenia Ortega'))
  assert.ok(footerText.includes(variant === 'personal' ? 'Yesenia Ortega' : 'Alex León'))
  assert.ok(text.includes(variant === 'personal' ? '9h00 a 15h00' : '8h00 a 17h00'))
  // Los recursos gráficos, las firmas, la numeración y los estilos se conservan byte por byte.
  for (const part of ['word/footer1.xml', 'word/footer2.xml', 'word/media/image1.png', 'word/media/image2.png', 'word/styles.xml', 'word/numbering.xml']) {
    assert.deepEqual(await zip.file(part).async('uint8array'), await original.file(part).async('uint8array'), part)
  }
  const custom = getReportContent({ ...report, schedule: 'Horario editado', documentCode: 'CUSTOM-123' }, variant)
  assert.equal(custom.code, 'CUSTOM-123')
  assert.ok(custom.blocks.some((block) => block.text === 'Horario editado'))
  assert.equal(custom.activityCount, 3)
  assert.ok(!custom.blocks.some((block) => block.text.includes('DOCUMENTO BASE')))
  const onlyUsegbe = getReportContent({ activities: [report.activities[2]] }, variant)
  assert.ok(onlyUsegbe.blocks.some((block) => block.text.startsWith('4.3. USEGBE')))
  assert.equal(getReportContent({ activities: [] }, variant).activityCount, 0)
  const escaped = await JSZip.loadAsync(await buildActivityReport({ ...report, documentCode: 'CODE-$&', evidence: 'Literal $& y <xml>' }, variant, template))
  assert.ok((await escaped.file('word/header1.xml').async('string')).includes('CODE-$&amp;'))
  assert.ok((await escaped.file('word/document.xml').async('string')).includes('Literal $&amp; y &lt;xml&gt;'))
  if (output) await writeFile(path.join(output, `informe-verificado-${name}.docx`), bytes)
  console.log(`OK ${name}: portada, encabezado, firmas y gráficos originales; período/código, viñetas, enlaces, filtros, saltos y horario.`)
}

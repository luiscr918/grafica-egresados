import JSZip from 'jszip'
import { getReportContent } from './reportContent.js'

const escapeXml = (value) => String(value).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')

function paragraph({ type, text, href, emails }, links, bulletId) {
  const heading = type === 'heading'
  const keepNext = heading || type === 'area' || type === 'subheading'
  const indent = type === 'activity' ? 1080 : heading ? 0 : 720
  const run = (value, isLink = false) => `<w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="22"/>${heading ? '<w:b/>' : ''}${isLink ? '<w:color w:val="0563C1"/><w:u w:val="single"/>' : ''}</w:rPr>${String(value).split(/\r\n|\r|\n/).map((line) => `<w:t xml:space="preserve">${escapeXml(line)}</w:t>`).join('<w:br/>')}</w:r>`
  const hyperlink = (value, target) => {
    const id = `reportLink${links.length + 1}`
    links.push({ id, href: target })
    return `<w:hyperlink r:id="${id}">${run(value, true)}</w:hyperlink>`
  }
  const content = emails ? emails.map((email) => hyperlink(email, `mailto:${email}`)).join(run('   ')) : href ? hyperlink(text, href) : run(text)
  // La numeración de las secciones es explícita; las actividades usan la viñeta del modelo.
  const bullet = type === 'activity' ? `<w:numPr><w:ilvl w:val="0"/><w:numId w:val="${bulletId}"/></w:numPr>` : ''
  return `<w:p><w:pPr>${keepNext ? '<w:keepNext/>' : ''}${href || emails ? '<w:keepLines/>' : ''}${bullet}<w:spacing w:before="${heading ? 160 : 0}" w:after="${heading ? 80 : 0}" w:line="360" w:lineRule="auto"/><w:ind w:left="${indent}"${type === 'activity' ? ' w:hanging="360"' : ''}/><w:jc w:val="${href || emails ? 'left' : 'both'}"/></w:pPr>${content}</w:p>`
}

export async function buildActivityReport(report, variant, template) {
  const zip = await JSZip.loadAsync(template)
  const { blocks, code } = getReportContent(report, variant)
  const title = blocks.find((block) => block.type === 'title').text
  const links = []
  // Los originales tienen diferentes IDs de numeración: 2 es decimal en Yesenia.
  const bulletId = variant === 'jefatura' ? 4 : 2
  const body = blocks.filter((block) => block.type !== 'title').map((block) => paragraph(block, links, bulletId)).join('')
  const replace = (xml) => xml.replaceAll('{{REPORT_TITLE}}', () => escapeXml(title)).replaceAll('{{REPORT_CODE}}', () => escapeXml(code))
  const document = await zip.file('word/document.xml').async('string')
  if (!document.includes('{{REPORT_BODY}}') || !document.includes('{{REPORT_TITLE}}')) throw new Error('La plantilla del informe no es válida.')
  zip.file('word/document.xml', replace(document).replace('{{REPORT_BODY}}', () => body))
  const header = await zip.file('word/header1.xml').async('string')
  zip.file('word/header1.xml', replace(header))
  const relationships = await zip.file('word/_rels/document.xml.rels').async('string')
  zip.file('word/_rels/document.xml.rels', relationships.replace('</Relationships>', links.map(({ id, href }) => `<Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="${escapeXml(href)}" TargetMode="External"/>`).join('') + '</Relationships>'))
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' })
}

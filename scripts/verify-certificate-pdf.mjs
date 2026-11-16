import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { blankEvent, civilTime } from '../src/tools/uri/generador-certificados/lib/model.js'
import { organizerPerson } from '../src/tools/uri/generador-certificados/lib/roster.js'
import { generateCertificates, loadCertificateAssets } from '../src/tools/uri/generador-certificados/lib/certificates.js'

const destination = process.argv[2]
if (!destination) throw new Error('Usage: node scripts/verify-certificate-pdf.mjs <existing-output-directory>')
const root = dirname(dirname(fileURLToPath(import.meta.url)))
const event = {
  ...blankEvent(),
  title: 'Selección Estratégica 4.0: Inteligencia Artificial, Herramientas Digitales y Evaluación por Competencias para la Identificación y Selección del Mejor Talento en Multinacionales',
  institution: 'INT Food Services Corp. S.A. (Grupo KFC)',
  focus: 'inteligencia artificial, herramientas digitales y evaluación por competencias para la identificación y selección del talento en multinacionales',
  date: '2026-11-06', startTime: '15:03:30', endTime: '16:17:38', windowConfirmed: true,
  signers: [...blankEvent().signers.slice(0, 2), { name: 'Esteban Guarderas', title: 'Representante Legal Grupo KFC Ecuador' }],
}
const start = civilTime(event.date, event.startTime), end = civilTime(event.date, event.endTime)
const recipient = (name) => ({ ...organizerPerson(name), role: 'participant', registration: { name, id: name, emails: [], consentIssue: false }, sessions: [{ start, end }] })
const people = [
  organizerPerson(event.organizerName),
  { ...organizerPerson('Katherine Lizbeth Simbaña Portilla'), role: 'speaker' },
  recipient('Oscar Hernán De la Cruz Cahuatijo'),
  recipient('María de los Ángeles Alejandra Fernanda De la Cruz Pérez del Río'),
]
const assets = await loadCertificateAssets((file) => readFile(join(root, 'public/certificados', file)))
await writeFile(join(destination, 'certificados-verificacion.pdf'), await generateCertificates(event, people, { assets }))
await writeFile(join(destination, 'certificado-institucion-larga.pdf'), await generateCertificates({ ...event, institution: 'Gobierno Autónomo Descentralizado Municipal y sus Unidades de Cooperación Interinstitucional, Formación Continua, Innovación Educativa y Desarrollo Social de la Región Amazónica del Ecuador' }, [people[3]], { assets }))
console.log(`Generated ${people.length} certificates (3 roles and long name) in ${destination}`)

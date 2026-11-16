import { collection, deleteDoc, doc, getDocs, orderBy, query, serverTimestamp, setDoc } from 'firebase/firestore'
import { db, allowedUid } from '../../../../lib/firebase'

function eventCollection(uid) {
  if (!uid || uid !== allowedUid) throw new Error('Esta cuenta no está autorizada para guardar certificados.')
  return collection(db, 'users', uid, 'certificateEvents')
}

export async function listCertificateEvents(uid) {
  const result = await getDocs(query(eventCollection(uid), orderBy('updatedAt', 'desc')))
  return result.docs.map((entry) => ({ id: entry.id, ...entry.data() }))
}

export async function saveCertificateEvent(uid, id, payload) {
  const reference = id ? doc(eventCollection(uid), id) : doc(eventCollection(uid))
  // One atomic document: event + final recipients, no PDFs or original uploads.
  if (new TextEncoder().encode(JSON.stringify(payload)).length > 850000) throw new Error('El expediente supera el tamaño permitido. Reduce la redacción o divide el evento en grupos antes de guardarlo.')
  await setDoc(reference, { ...payload, updatedAt: serverTimestamp() })
  return reference.id
}

export async function deleteCertificateEvent(uid, id) {
  await deleteDoc(doc(eventCollection(uid), id))
}

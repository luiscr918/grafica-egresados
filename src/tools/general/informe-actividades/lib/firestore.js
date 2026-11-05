import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../../../../lib/firebase'

const reportsPath = (uid) => collection(db, 'users', uid, 'activityReports')

export async function listReports(uid) {
  const snapshot = await getDocs(query(reportsPath(uid), orderBy('updatedAt', 'desc')))
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
}

export async function createReport(uid, report) {
  const reference = await addDoc(reportsPath(uid), { ...report, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
  return reference.id
}

export async function saveReport(uid, report) {
  await setDoc(doc(db, 'users', uid, 'activityReports', report.id), { ...report, updatedAt: serverTimestamp() }, { merge: true })
}

export async function removeReport(uid, reportId) {
  await deleteDoc(doc(db, 'users', uid, 'activityReports', reportId))
}

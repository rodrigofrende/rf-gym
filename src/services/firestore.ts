import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  writeBatch,
  query,
  type QueryConstraint,
  type DocumentData,
  type WriteBatch,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

/**
 * Helpers genéricos de Firestore para no repetir la misma lógica en cada service.
 * Todos devuelven datos tipados con el `id` del doc incluido.
 */

type WithId = { id: string }

export async function getOne<T extends WithId>(path: string): Promise<T | null> {
  const snap = await getDoc(doc(db, path))
  if (!snap.exists()) return null
  return { id: snap.id, ...(snap.data() as Omit<T, 'id'>) } as T
}

export async function getMany<T extends WithId>(
  path: string,
  ...constraints: QueryConstraint[]
): Promise<T[]> {
  const ref = collection(db, path)
  const snap = await getDocs(constraints.length ? query(ref, ...constraints) : ref)
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<T, 'id'>) }) as T)
}

export async function setOne(path: string, data: DocumentData): Promise<void> {
  await setDoc(doc(db, path), data, { merge: true })
}

export async function updateOne(path: string, data: DocumentData): Promise<void> {
  await updateDoc(doc(db, path), data)
}

export async function addToCollection(path: string, data: DocumentData): Promise<string> {
  const ref = await addDoc(collection(db, path), data)
  return ref.id
}

export async function removeOne(path: string): Promise<void> {
  await deleteDoc(doc(db, path))
}

export function createBatch(): WriteBatch {
  return writeBatch(db)
}

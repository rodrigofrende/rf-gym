import { orderBy } from 'firebase/firestore'
import type { Note } from '@/types'
import { env } from '@/config/env'
import * as demo from '@/demo/store'
import { addToCollection, getMany, removeOne } from './firestore'
import { paths } from './paths'

/** Notas privadas del admin. El socio nunca llama a este service. */
export function listNotes(gymId: string, memberId: string) {
  if (env.demoMode) return demo.listNotes(gymId, memberId)
  return getMany<Note>(paths.notes(gymId, memberId), orderBy('date', 'desc'))
}

export function createNote(gymId: string, memberId: string, data: Omit<Note, 'id'>) {
  if (env.demoMode) return demo.createNote(gymId, memberId, data)
  return addToCollection(paths.notes(gymId, memberId), data)
}

export function removeNote(gymId: string, memberId: string, noteId: string) {
  if (env.demoMode) return demo.removeNote(gymId, memberId, noteId)
  return removeOne(paths.note(gymId, memberId, noteId))
}

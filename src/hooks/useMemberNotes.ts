import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Note } from '@/types'
import { createNote, listNotes, removeNote } from '@/services/notesService'
import { queryKeys } from './queryKeys'

/** Hooks de notas privadas — SOLO se usan en vistas de admin. */
export function useNotes(gymId: string, uid: string) {
  return useQuery({
    queryKey: queryKeys.notes(gymId, uid),
    queryFn: () => listNotes(gymId, uid),
    enabled: !!gymId && !!uid,
  })
}

export function useCreateNote(gymId: string, uid: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<Note, 'id'>) => createNote(gymId, uid, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.notes(gymId, uid) }),
  })
}

export function useRemoveNote(gymId: string, uid: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (noteId: string) => removeNote(gymId, uid, noteId),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.notes(gymId, uid) }),
  })
}

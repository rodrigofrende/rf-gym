import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Assignment, Routine } from '@/types'
import {
  assignRoutine,
  createRoutine,
  listMemberAssignments,
  listRoutines,
  removeAssignment,
  removeRoutine,
  updateRoutine,
} from '@/services/routinesService'
import { queryKeys } from './queryKeys'

export function useRoutines(gymId: string) {
  return useQuery({
    queryKey: queryKeys.routines(gymId),
    queryFn: () => listRoutines(gymId),
    enabled: !!gymId,
    staleTime: 30_000,
  })
}

export function useMemberAssignments(gymId: string, uid: string) {
  return useQuery({
    queryKey: queryKeys.memberAssignments(gymId, uid),
    queryFn: () => listMemberAssignments(gymId, uid),
    enabled: !!gymId && !!uid,
  })
}

export function useCreateRoutine(gymId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<Routine, 'id'>) => createRoutine(gymId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.routines(gymId) }),
  })
}

export function useUpdateRoutine(gymId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ routineId, data }: { routineId: string; data: Partial<Routine> }) =>
      updateRoutine(gymId, routineId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.routines(gymId) }),
  })
}

export function useRemoveRoutine(gymId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (routineId: string) => removeRoutine(gymId, routineId),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.routines(gymId) }),
  })
}

export function useAssignRoutine(gymId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<Assignment, 'id'>) => assignRoutine(gymId, data),
    onSuccess: (_r, data) => {
      qc.invalidateQueries({ queryKey: queryKeys.memberAssignments(gymId, data.memberUid) })
      qc.invalidateQueries({ queryKey: queryKeys.stats(gymId) })
    },
  })
}

export function useRemoveAssignment(gymId: string, memberUid: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => removeAssignment(gymId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.memberAssignments(gymId, memberUid) })
      qc.invalidateQueries({ queryKey: queryKeys.stats(gymId) })
    },
  })
}

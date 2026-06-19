import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ExerciseDefinition } from '@/types'
import {
  createExercise,
  listExercises,
  removeExercise,
  updateExercise,
} from '@/services/exercisesService'
import { queryKeys } from './queryKeys'

export function useExercises(gymId: string) {
  return useQuery({
    queryKey: queryKeys.exercises(gymId),
    queryFn: () => listExercises(gymId),
    enabled: !!gymId,
    staleTime: 30_000,
  })
}

export function useCreateExercise(gymId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<ExerciseDefinition, 'id'>) => createExercise(gymId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.exercises(gymId) }),
  })
}

export function useUpdateExercise(gymId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      exerciseId,
      data,
    }: {
      exerciseId: string
      data: Partial<ExerciseDefinition>
    }) => updateExercise(gymId, exerciseId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.exercises(gymId) }),
  })
}

export function useRemoveExercise(gymId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (exerciseId: string) => removeExercise(gymId, exerciseId),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.exercises(gymId) }),
  })
}

import { orderBy } from 'firebase/firestore'
import { env } from '@/config/env'
import * as demo from '@/demo/store'
import type { ExerciseDefinition } from '@/types'
import { addToCollection, getMany, getOne, removeOne, updateOne } from './firestore'
import { paths } from './paths'

export function listExercises(gymId: string) {
  if (env.demoMode) return demo.listExercises(gymId)
  return getMany<ExerciseDefinition>(paths.exercises(gymId), orderBy('name'))
}

export function getExercise(gymId: string, exerciseId: string) {
  if (env.demoMode) return demo.getExercise(gymId, exerciseId)
  return getOne<ExerciseDefinition>(paths.exercise(gymId, exerciseId))
}

export function createExercise(gymId: string, data: Omit<ExerciseDefinition, 'id'>) {
  if (env.demoMode) return demo.createExercise(gymId, data)
  return addToCollection(paths.exercises(gymId), data)
}

export function updateExercise(
  gymId: string,
  exerciseId: string,
  data: Partial<ExerciseDefinition>,
) {
  if (env.demoMode) return demo.updateExercise(gymId, exerciseId, data)
  return updateOne(paths.exercise(gymId, exerciseId), data)
}

export function removeExercise(gymId: string, exerciseId: string) {
  if (env.demoMode) return demo.removeExercise(gymId, exerciseId)
  return removeOne(paths.exercise(gymId, exerciseId))
}

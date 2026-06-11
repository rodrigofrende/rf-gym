import { orderBy, where } from 'firebase/firestore'
import type { Assignment, Routine } from '@/types'
import { env } from '@/config/env'
import * as demo from '@/demo/store'
import { addToCollection, getMany, getOne, removeOne, updateOne } from './firestore'
import { paths } from './paths'

export function listRoutines(gymId: string) {
  if (env.demoMode) return demo.listRoutines(gymId)
  return getMany<Routine>(paths.routines(gymId), orderBy('name'))
}

export function getRoutine(gymId: string, routineId: string) {
  if (env.demoMode) return demo.getRoutine(gymId, routineId)
  return getOne<Routine>(paths.routine(gymId, routineId))
}

export function createRoutine(gymId: string, data: Omit<Routine, 'id'>) {
  if (env.demoMode) return demo.createRoutine(gymId, data)
  return addToCollection(paths.routines(gymId), data)
}

export function updateRoutine(gymId: string, routineId: string, data: Partial<Routine>) {
  if (env.demoMode) return demo.updateRoutine(gymId, routineId, data)
  return updateOne(paths.routine(gymId, routineId), data)
}

export function removeRoutine(gymId: string, routineId: string) {
  if (env.demoMode) return demo.removeRoutine(gymId, routineId)
  return removeOne(paths.routine(gymId, routineId))
}

// --- Asignaciones rutina ↔ socio ---

export function listAssignments(gymId: string) {
  if (env.demoMode) return demo.listAssignments(gymId)
  return getMany<Assignment>(paths.assignments(gymId))
}

export function listMemberAssignments(gymId: string, memberUid: string) {
  if (env.demoMode) return demo.listMemberAssignments(gymId, memberUid)
  return getMany<Assignment>(
    paths.assignments(gymId),
    where('memberUid', '==', memberUid),
    where('active', '==', true),
  )
}

export function assignRoutine(gymId: string, data: Omit<Assignment, 'id'>) {
  if (env.demoMode) return demo.assignRoutine(gymId, data)
  return addToCollection(paths.assignments(gymId), data)
}

export function removeAssignment(gymId: string, id: string) {
  if (env.demoMode) return demo.removeAssignment(gymId, id)
  return removeOne(paths.assignment(gymId, id))
}

import { limit, orderBy, where } from 'firebase/firestore'
import type { WorkoutLog } from '@/types'
import { env } from '@/config/env'
import * as demo from '@/demo/store'
import { addToCollection, getMany, removeOne, updateOne } from './firestore'
import { paths } from './paths'

const LOGS_LIST_LIMIT = 300

export function listLogs(gymId: string, memberId: string) {
  if (env.demoMode) return demo.listLogs(gymId, memberId)
  return getMany<WorkoutLog>(
    paths.logs(gymId, memberId),
    orderBy('date', 'desc'),
    limit(LOGS_LIST_LIMIT),
  )
}

export function listExerciseLogs(gymId: string, memberId: string, exerciseName: string) {
  if (env.demoMode) return demo.listExerciseLogs(gymId, memberId, exerciseName)
  return getMany<WorkoutLog>(
    paths.logs(gymId, memberId),
    where('exerciseName', '==', exerciseName),
    orderBy('date', 'desc'),
    limit(LOGS_LIST_LIMIT),
  )
}

export function createLog(gymId: string, memberId: string, data: Omit<WorkoutLog, 'id'>) {
  if (env.demoMode) return demo.createLog(gymId, memberId, data)
  return addToCollection(paths.logs(gymId, memberId), data)
}

export function updateLog(
  gymId: string,
  memberId: string,
  logId: string,
  data: Partial<Omit<WorkoutLog, 'id'>>,
) {
  if (env.demoMode) return demo.updateLog(gymId, memberId, logId, data)
  return updateOne(paths.log(gymId, memberId, logId), data)
}

export function removeLog(gymId: string, memberId: string, logId: string) {
  if (env.demoMode) return demo.deleteLog(gymId, memberId, logId)
  return removeOne(paths.log(gymId, memberId, logId))
}

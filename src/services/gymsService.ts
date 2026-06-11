import { arrayRemove, arrayUnion } from 'firebase/firestore'
import type { Gym } from '@/types'
import { env } from '@/config/env'
import * as demo from '@/demo/store'
import { addToCollection, getMany, getOne, removeOne, updateOne } from './firestore'
import { paths } from './paths'

export function getGym(gymId: string) {
  if (env.demoMode) return demo.getGym(gymId)
  return getOne<Gym>(paths.gym(gymId))
}

export function listGyms() {
  if (env.demoMode) return demo.listGyms()
  return getMany<Gym>(paths.gyms())
}

export function createGym(data: Omit<Gym, 'id'>) {
  if (env.demoMode) return demo.createGym(data)
  return addToCollection(paths.gyms(), data)
}

export function removeGym(gymId: string) {
  if (env.demoMode) return demo.removeGym(gymId)
  return removeOne(paths.gym(gymId))
}

/** Actualiza el branding del gym (paleta y/o logo). */
export function updateGymBranding(gymId: string, data: Partial<Pick<Gym, 'theme' | 'logoURL'>>) {
  if (env.demoMode) return demo.updateGym(gymId, data)
  return updateOne(paths.gym(gymId), data)
}

export function addGymAdmin(gymId: string, uid: string) {
  if (env.demoMode) return demo.addGymAdmin(gymId, uid)
  return updateOne(paths.gym(gymId), { adminUids: arrayUnion(uid) })
}

export function removeGymAdmin(gymId: string, uid: string) {
  if (env.demoMode) return demo.removeGymAdmin(gymId, uid)
  return updateOne(paths.gym(gymId), { adminUids: arrayRemove(uid) })
}

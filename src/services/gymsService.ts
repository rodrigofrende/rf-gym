import { arrayRemove, arrayUnion, deleteField, serverTimestamp } from 'firebase/firestore'
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

export function updateGym(gymId: string, data: Partial<Omit<Gym, 'id'>>) {
  if (env.demoMode) return demo.updateGym(gymId, data)
  return updateOne(paths.gym(gymId), data)
}

export function removeGym(gymId: string) {
  if (env.demoMode) return demo.removeGym(gymId)
  return removeOne(paths.gym(gymId))
}

export interface GymBrandingUpdate extends Partial<Pick<Gym, 'theme' | 'logoChangeCount'>> {
  /** Data URL del logo; `null` borra el campo (no dejar `""`, que rompe las rules). */
  logoURL?: string | null
  /** true → estampa el inicio de una nueva ventana de 24hs de cambios de logo. */
  startLogoWindow?: boolean
}

/**
 * Actualiza el branding del gym (paleta y/o logo). Cuando cambia el logo, el
 * caller debe mandar `logoChangeCount` (y `startLogoWindow` si la ventana de
 * 24hs venció): firestore.rules valida el límite de 3 cambios por día.
 */
export function updateGymBranding(gymId: string, data: GymBrandingUpdate) {
  const { startLogoWindow, logoURL, ...rest } = data
  if (env.demoMode) {
    if (logoURL === null) demo.clearGymLogo(gymId)
    return demo.updateGym(gymId, {
      ...rest,
      ...(logoURL !== undefined && logoURL !== null ? { logoURL } : {}),
      ...(startLogoWindow ? { logoWindowStart: new Date() } : {}),
    })
  }
  return updateOne(paths.gym(gymId), {
    ...rest,
    ...(logoURL === null
      ? { logoURL: deleteField() }
      : logoURL !== undefined
        ? { logoURL }
        : {}),
    ...(startLogoWindow ? { logoWindowStart: serverTimestamp() } : {}),
  })
}

export function addGymAdmin(gymId: string, uid: string) {
  if (env.demoMode) return demo.addGymAdmin(gymId, uid)
  return updateOne(paths.gym(gymId), { adminUids: arrayUnion(uid) })
}

export function removeGymAdmin(gymId: string, uid: string) {
  if (env.demoMode) return demo.removeGymAdmin(gymId, uid)
  return updateOne(paths.gym(gymId), { adminUids: arrayRemove(uid) })
}

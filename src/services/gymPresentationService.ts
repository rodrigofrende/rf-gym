import type { GymPresentation } from '@/types'
import { env } from '@/config/env'
import * as demo from '@/demo/store'
import { getOne, setOne } from './firestore'
import { paths } from './paths'

export function getGymPresentation(gymId: string) {
  if (env.demoMode) return demo.getGymPresentation(gymId)
  return getOne<GymPresentation>(paths.publicProfile(gymId))
}

/**
 * Crea o actualiza la presentación pública del gym. Usa `setOne` (merge) porque
 * el doc puede no existir todavía. El caller debe incluir el snapshot de marca
 * (name/logoURL/theme) para que la página pública renderice branded sin leer el
 * doc protegido `gyms/{gymId}`.
 */
export function updateGymPresentation(
  gymId: string,
  data: Partial<Omit<GymPresentation, 'id'>>,
) {
  if (env.demoMode) return demo.updateGymPresentation(gymId, data)
  return setOne(paths.publicProfile(gymId), data)
}

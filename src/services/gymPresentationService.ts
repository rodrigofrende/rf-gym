import { deleteField, limit, serverTimestamp } from 'firebase/firestore'
import type { GymPresentation } from '@/types'
import { env } from '@/config/env'
import * as demo from '@/demo/store'
import { getMany, getOne, setOne } from './firestore'
import { paths } from './paths'

export function getGymPresentation(gymId: string) {
  if (env.demoMode) return demo.getGymPresentation(gymId)
  return getOne<GymPresentation>(paths.publicProfile(gymId))
}

/**
 * Perfiles públicos para la sección "Nuestros clientes" de la landing.
 * `publicProfiles` es world-readable, así que no requiere rules nuevas.
 * OJO: los docs traen imágenes inline (logo + sponsors) → se limita la cantidad;
 * si la plataforma escala a muchos gyms, migrar a un doc directorio liviano.
 */
export function listGymPresentations(max = 8) {
  if (env.demoMode) return demo.listGymPresentations()
  return getMany<GymPresentation>(paths.publicProfiles(), limit(max))
}

export interface GymPresentationUpdate extends Partial<Omit<GymPresentation, 'id' | 'logoURL'>> {
  /** Data URL del logo; `null` borra el campo (no dejar `""`, que rompe las rules). */
  logoURL?: string | null
  /** true → estampa el inicio de una nueva ventana de 24hs de cambios de sponsors. */
  startSponsorsWindow?: boolean
}

/**
 * Crea o actualiza la presentación pública del gym. Usa `setOne` (merge) porque
 * el doc puede no existir todavía. El caller debe incluir el snapshot de marca
 * (name/logoURL/theme) para que la página pública renderice branded sin leer el
 * doc protegido `gyms/{gymId}`. Cuando cambian los sponsors, el caller debe
 * mandar `sponsorsChangeCount` (y `startSponsorsWindow` si la ventana de 24hs
 * venció): firestore.rules valida el límite de cambios por día.
 */
export function updateGymPresentation(gymId: string, data: GymPresentationUpdate) {
  const { startSponsorsWindow, logoURL, ...rest } = data
  if (env.demoMode) {
    if (logoURL === null) demo.clearGymPresentationLogo(gymId)
    return demo.updateGymPresentation(gymId, {
      ...rest,
      ...(logoURL !== undefined && logoURL !== null ? { logoURL } : {}),
      ...(startSponsorsWindow ? { sponsorsWindowStart: new Date() } : {}),
    })
  }
  return setOne(paths.publicProfile(gymId), {
    ...rest,
    ...(logoURL === null
      ? { logoURL: deleteField() }
      : logoURL !== undefined
        ? { logoURL }
        : {}),
    ...(startSponsorsWindow ? { sponsorsWindowStart: serverTimestamp() } : {}),
  })
}

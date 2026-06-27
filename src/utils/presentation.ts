import type { GymLink, GymPresentation } from '@/types'
import { isSafeHttpUrl } from './url'

export interface ResolvedPresentation {
  videos: string[]
  links: GymLink[]
}

/**
 * Normaliza la presentación a `{ videos, links }` saneados, con compatibilidad
 * hacia atrás: si el doc todavía no tiene los arrays nuevos, deriva los valores
 * de los campos legacy (`videoURL`, `instagramURL`, `facebookURL`).
 *
 * Importante: se usa `=== undefined` (no `.length`) para distinguir "campo nunca
 * migrado" de "el admin lo dejó vacío a propósito" — así borrar todos los videos
 * no resucita el `videoURL` legacy.
 */
export function resolvePresentation(data?: Partial<GymPresentation> | null): ResolvedPresentation {
  if (!data) return { videos: [], links: [] }

  const videosSource =
    data.videos !== undefined ? data.videos : data.videoURL ? [data.videoURL] : []
  const videos = videosSource
    .map((v) => v?.trim() ?? '')
    .filter((v) => isSafeHttpUrl(v))

  const linksSource = data.links !== undefined ? data.links : legacyLinks(data)
  const links = linksSource
    .filter((l) => l && l.label?.trim() && isSafeHttpUrl(l.url))
    .map((l) => ({ label: l.label.trim(), url: l.url.trim() }))

  return { videos, links }
}

/** Construye links a partir de las redes legacy de docs no migrados. */
function legacyLinks(data: Partial<GymPresentation>): GymLink[] {
  const out: GymLink[] = []
  if (data.instagramURL) out.push({ label: 'Instagram', url: data.instagramURL })
  if (data.facebookURL) out.push({ label: 'Facebook', url: data.facebookURL })
  return out
}

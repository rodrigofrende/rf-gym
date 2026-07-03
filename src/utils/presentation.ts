import type { GymLink, GymPresentation, Sponsor } from '@/types'
import { isSafeHttpUrl, safeHttpUrl } from './url'
import { instagramHandle } from './contact'
import { parseVideoUrl } from './video'

export interface ResolvedPresentation {
  videos: string[]
  links: GymLink[]
  sponsors: Sponsor[]
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
  if (!data) return { videos: [], links: [], sponsors: [] }

  const videosSource =
    data.videos !== undefined ? data.videos : data.videoURL ? [data.videoURL] : []
  const videos = videosSource
    .map((v) => v?.trim() ?? '')
    .filter((v) => isSafeHttpUrl(v))

  const linksSource = data.links !== undefined ? data.links : legacyLinks(data)
  const links = linksSource
    .filter((l) => l && l.label?.trim() && isSafeHttpUrl(l.url))
    .map((l) => ({ label: l.label.trim(), url: l.url.trim() }))

  // No hay fuente legacy de sponsors, alcanza con `?? []`.
  const sponsors: Sponsor[] = (data.sponsors ?? [])
    .filter((s): s is Sponsor => !!s && !!s.name?.trim())
    .map((s) => {
      const handle = instagramHandle(s.instagram)
      const logo = safeHttpUrl(s.logoURL)
      const youtube =
        s.youtubeURL && isSafeHttpUrl(s.youtubeURL) && parseVideoUrl(s.youtubeURL)?.kind === 'youtube'
          ? s.youtubeURL.trim()
          : undefined
      return {
        name: s.name.trim(),
        tier: s.tier === 'featured' ? 'featured' : 'standard',
        ...(logo ? { logoURL: logo } : {}),
        ...(handle ? { instagram: handle } : {}),
        ...(s.whatsapp?.trim() ? { whatsapp: s.whatsapp.trim() } : {}),
        ...(youtube ? { youtubeURL: youtube } : {}),
      }
    })

  return { videos, links, sponsors }
}

/** Construye links a partir de las redes legacy de docs no migrados. */
function legacyLinks(data: Partial<GymPresentation>): GymLink[] {
  const out: GymLink[] = []
  if (data.instagramURL) out.push({ label: 'Instagram', url: data.instagramURL })
  if (data.facebookURL) out.push({ label: 'Facebook', url: data.facebookURL })
  return out
}

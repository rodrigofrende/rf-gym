import type { GymLink, GymPresentation, Sponsor } from '@/types'
import { isSafeHttpUrl, safeHttpUrl, safeImageSrc } from './url'
import { instagramUrl } from './contact'

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

  // Sponsors: shape nuevo (name/imageURL/phone/linkURL) con mapeo de los campos
  // legacy (logoURL/whatsapp/instagram/youtubeURL) para docs previos al rediseño.
  const sponsors: Sponsor[] = (data.sponsors ?? [])
    .filter((s): s is Sponsor => !!s && !!s.name?.trim())
    .map((s) => {
      const image = safeImageSrc(s.imageURL) ?? safeImageSrc(s.logoURL)
      const phone = (s.phone ?? s.whatsapp)?.trim()
      const link = safeHttpUrl(s.linkURL) ?? instagramUrl(s.instagram) ?? safeHttpUrl(s.youtubeURL)
      return {
        name: s.name.trim(),
        ...(image ? { imageURL: image } : {}),
        ...(phone ? { phone } : {}),
        ...(link ? { linkURL: link } : {}),
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

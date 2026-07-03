import { type ReactNode } from 'react'
import { AtSign, MessageCircle, PlayCircle } from 'lucide-react'
import type { Sponsor } from '@/types'
import { parseVideoUrl, youtubeThumbnailUrl } from '@/utils/video'
import { instagramUrl, whatsappLink } from '@/utils/contact'
import { safeHttpUrl } from '@/utils/url'
import { cn } from '@/utils/cn'

type Variant = 'dark' | 'light'

/**
 * Componentes presentacionales puros para mostrar patrocinadores. Parametrizados
 * por `variant` para servir tanto a la landing oscura (`PublicGymView`) como al
 * look claro de la app (`GymPresentation`, check-in, QR). Sanean sus URLs
 * defensivamente (además del saneo de `resolvePresentation`).
 */
const V: Record<Variant, {
  card: string
  name: string
  muted: string
  logoFallback: string
  pill: string
  pillPrimary: string
  videoBg: string
  label: string
}> = {
  dark: {
    card: 'border-white/10 bg-zinc-900',
    name: 'text-white',
    muted: 'text-zinc-400',
    logoFallback: 'bg-brand-500/15 text-brand-300',
    pill: 'border border-white/20 text-white hover:bg-white/10',
    pillPrimary: 'bg-brand-500 text-white hover:bg-brand-400',
    videoBg: 'bg-black ring-1 ring-white/10',
    label: 'text-zinc-500',
  },
  light: {
    card: 'border-zinc-200 bg-surface',
    name: 'text-zinc-800',
    muted: 'text-zinc-500',
    logoFallback: 'bg-brand-50 text-brand-600',
    pill: 'border border-zinc-200 text-zinc-700 hover:bg-zinc-50',
    pillPrimary: 'bg-brand-600 text-white hover:bg-brand-700',
    videoBg: 'bg-zinc-100 ring-1 ring-zinc-200',
    label: 'text-zinc-500',
  },
}

const WA_MESSAGE = 'Hola! Los vi como auspiciante del gimnasio y quería consultar.'

function SponsorLogo({ sponsor, variant, size }: { sponsor: Sponsor; variant: Variant; size: 'sm' | 'lg' }) {
  const logo = safeHttpUrl(sponsor.logoURL)
  const dim = size === 'lg' ? 'size-14' : 'size-11'
  if (logo) {
    return <img src={logo} alt={sponsor.name} className={cn(dim, 'shrink-0 rounded-xl object-cover')} />
  }
  return (
    <div className={cn(dim, 'flex shrink-0 items-center justify-center rounded-xl text-lg font-bold', V[variant].logoFallback)}>
      {sponsor.name.charAt(0).toUpperCase()}
    </div>
  )
}

function SponsorLinks({ sponsor, variant }: { sponsor: Sponsor; variant: Variant }) {
  const ig = instagramUrl(sponsor.instagram)
  const wa = whatsappLink(sponsor.whatsapp, WA_MESSAGE)
  if (!ig && !wa) return null
  return (
    <div className="flex flex-wrap gap-2">
      {wa && (
        <SponsorPill href={wa} variant={variant} primary icon={<MessageCircle className="size-4" />}>
          WhatsApp
        </SponsorPill>
      )}
      {ig && (
        <SponsorPill href={ig} variant={variant} icon={<AtSign className="size-4" />}>
          Instagram
        </SponsorPill>
      )}
    </div>
  )
}

function SponsorPill({
  href,
  variant,
  primary,
  icon,
  children,
}: {
  href: string
  variant: Variant
  primary?: boolean
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
        primary ? V[variant].pillPrimary : V[variant].pill,
      )}
    >
      {icon}
      {children}
    </a>
  )
}

/** Video de YouTube: iframe embebido (landing) o thumbnail-link (ingreso, sin autoplay). */
function SponsorVideo({ url, variant, mode }: { url: string; variant: Variant; mode: 'embed' | 'thumbnail' }) {
  const video = parseVideoUrl(url)
  if (!video || video.kind !== 'youtube') return null

  if (mode === 'embed') {
    return (
      <div className={cn('aspect-video w-full overflow-hidden rounded-2xl', V[variant].videoBg)}>
        <iframe
          src={video.embedUrl}
          title="Video del patrocinador"
          className="size-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    )
  }

  return (
    <a
      href={`https://www.youtube.com/watch?v=${video.videoId}`}
      target="_blank"
      rel="noopener noreferrer"
      className={cn('group relative block aspect-video w-full overflow-hidden rounded-2xl', V[variant].videoBg)}
    >
      <img
        src={youtubeThumbnailUrl(video.videoId)}
        alt="Ver video del patrocinador"
        className="size-full object-cover"
        loading="lazy"
      />
      <span className="absolute inset-0 flex items-center justify-center bg-black/30 transition-colors group-hover:bg-black/40">
        <PlayCircle className="size-12 text-white drop-shadow" />
      </span>
    </a>
  )
}

export function SponsorFeaturedCard({
  sponsor,
  variant,
  videoMode = 'embed',
}: {
  sponsor: Sponsor
  variant: Variant
  videoMode?: 'embed' | 'thumbnail'
}) {
  return (
    <div className={cn('space-y-4 rounded-2xl border p-5', V[variant].card)}>
      <div className="flex items-center gap-3">
        <SponsorLogo sponsor={sponsor} variant={variant} size="lg" />
        <p className={cn('min-w-0 flex-1 truncate text-lg font-bold', V[variant].name)}>{sponsor.name}</p>
      </div>
      {sponsor.youtubeURL && <SponsorVideo url={sponsor.youtubeURL} variant={variant} mode={videoMode} />}
      <SponsorLinks sponsor={sponsor} variant={variant} />
    </div>
  )
}

export function SponsorStandardCard({ sponsor, variant }: { sponsor: Sponsor; variant: Variant }) {
  return (
    <div className={cn('flex h-full flex-col gap-3 rounded-2xl border p-4', V[variant].card)}>
      <div className="flex items-center gap-3">
        <SponsorLogo sponsor={sponsor} variant={variant} size="sm" />
        <p className={cn('min-w-0 flex-1 truncate text-sm font-semibold', V[variant].name)}>{sponsor.name}</p>
      </div>
      <div className="mt-auto">
        <SponsorLinks sponsor={sponsor} variant={variant} />
      </div>
    </div>
  )
}

/** Grilla completa: destacados (grandes) + estándar (grilla). Para landing / Mi gimnasio. */
export function SponsorsShowcase({ sponsors, variant }: { sponsors: Sponsor[]; variant: Variant }) {
  if (!sponsors.length) return null
  const featured = sponsors.filter((s) => s.tier === 'featured')
  const standard = sponsors.filter((s) => s.tier !== 'featured')
  return (
    <div className="space-y-4">
      {featured.map((s, i) => (
        <SponsorFeaturedCard key={`f-${s.name}-${i}`} sponsor={s} variant={variant} videoMode="embed" />
      ))}
      {standard.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {standard.map((s, i) => (
            <SponsorStandardCard key={`s-${s.name}-${i}`} sponsor={s} variant={variant} />
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Bloque compacto y no intrusivo para las superficies de ingreso (check-in, QR):
 * solo patrocinadores destacados, con rótulo "Patrocinado" y video como thumbnail
 * (nunca iframe/autoplay, para no frenar la carga del QR). Renderiza el primero
 * (o hasta `max`); `null` si no hay destacados.
 */
export function SponsorSpot({
  sponsors,
  variant,
  max = 1,
}: {
  sponsors: Sponsor[]
  variant: Variant
  max?: number
}) {
  const featured = sponsors.filter((s) => s.tier === 'featured').slice(0, max)
  if (!featured.length) return null
  return (
    <div className="space-y-2">
      <p className={cn('text-center text-[11px] font-semibold uppercase tracking-[0.2em]', V[variant].label)}>
        Patrocinado
      </p>
      {featured.map((s, i) => (
        <SponsorFeaturedCard key={`spot-${s.name}-${i}`} sponsor={s} variant={variant} videoMode="thumbnail" />
      ))}
    </div>
  )
}

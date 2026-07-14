import { type ReactNode } from 'react'
import { ExternalLink, MessageCircle } from 'lucide-react'
import type { Sponsor } from '@/types'
import { whatsappLink } from '@/utils/contact'
import { safeHttpUrl, safeImageSrc } from '@/utils/url'
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
  label: string
}> = {
  dark: {
    card: 'border-white/10 bg-zinc-900',
    name: 'text-white',
    muted: 'text-zinc-400',
    logoFallback: 'bg-brand-500/15 text-brand-300',
    pill: 'border border-white/20 text-white hover:bg-white/10',
    pillPrimary: 'bg-brand-500 text-white hover:bg-brand-400',
    label: 'text-zinc-500',
  },
  light: {
    card: 'border-zinc-200 bg-surface',
    name: 'text-zinc-800',
    muted: 'text-zinc-500',
    logoFallback: 'bg-brand-50 text-brand-600',
    pill: 'border border-zinc-200 text-zinc-700 hover:bg-zinc-50',
    pillPrimary: 'bg-brand-600 text-white hover:bg-brand-700',
    label: 'text-zinc-500',
  },
}

const WA_MESSAGE = 'Hola! Los vi como auspiciante del gimnasio y quería consultar.'

/** Rótulo corto para el pill del link: el dominio sin `www.` (o "Ver más" si no parsea). */
function linkLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return 'Ver más'
  }
}

function SponsorImage({ sponsor, variant }: { sponsor: Sponsor; variant: Variant }) {
  const src = safeImageSrc(sponsor.imageURL)
  if (src) {
    return (
      <img
        src={src}
        alt={sponsor.name}
        referrerPolicy="no-referrer"
        className="size-14 shrink-0 rounded-xl object-cover"
      />
    )
  }
  return (
    <div className={cn('flex size-14 shrink-0 items-center justify-center rounded-xl text-lg font-bold', V[variant].logoFallback)}>
      {sponsor.name.charAt(0).toUpperCase()}
    </div>
  )
}

function SponsorLinks({ sponsor, variant }: { sponsor: Sponsor; variant: Variant }) {
  const wa = whatsappLink(sponsor.phone, WA_MESSAGE)
  const link = safeHttpUrl(sponsor.linkURL)
  if (!wa && !link) return null
  return (
    <div className="flex flex-wrap gap-2">
      {wa && (
        <SponsorPill href={wa} variant={variant} primary icon={<MessageCircle className="size-4" />}>
          WhatsApp
        </SponsorPill>
      )}
      {link && (
        <SponsorPill href={link} variant={variant} icon={<ExternalLink className="size-4" />}>
          {linkLabel(link)}
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

export function SponsorCard({ sponsor, variant }: { sponsor: Sponsor; variant: Variant }) {
  return (
    <div className={cn('flex h-full flex-col gap-3 rounded-2xl border p-4', V[variant].card)}>
      <div className="flex items-center gap-3">
        <SponsorImage sponsor={sponsor} variant={variant} />
        <p className={cn('min-w-0 flex-1 truncate text-base font-bold', V[variant].name)}>{sponsor.name}</p>
      </div>
      <div className="mt-auto">
        <SponsorLinks sponsor={sponsor} variant={variant} />
      </div>
    </div>
  )
}

/** Grilla completa de patrocinadores (2 columnas en pantallas medianas+). */
export function SponsorsShowcase({ sponsors, variant }: { sponsors: Sponsor[]; variant: Variant }) {
  if (!sponsors.length) return null
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {sponsors.map((s, i) => (
        <SponsorCard key={`${s.name}-${i}`} sponsor={s} variant={variant} />
      ))}
    </div>
  )
}

/**
 * Espacio reservado para cuando el gym todavía no tiene patrocinadores: invita
 * a las marcas a sumarse. El CTA abre WhatsApp con el número del gimnasio (el
 * campo de contacto de "Mi gimnasio"); si no está cargado, muestra solo el texto.
 */
export function SponsorPlaceholder({ whatsapp, variant }: { whatsapp?: string; variant: Variant }) {
  const wa = whatsappLink(whatsapp, 'Hola! Quiero publicitar mi marca en el gimnasio.')
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 rounded-2xl border border-dashed p-6 text-center',
        variant === 'dark' ? 'border-white/15' : 'border-zinc-300',
      )}
    >
      <p className={cn('text-lg font-bold', V[variant].name)}>Tu marca acá</p>
      <p className={cn('max-w-xs text-sm', V[variant].muted)}>
        Sumá tu marca como auspiciante del gimnasio.
      </p>
      {wa && (
        <SponsorPill href={wa} variant={variant} primary icon={<MessageCircle className="size-4" />}>
          Quiero auspiciar
        </SponsorPill>
      )}
    </div>
  )
}

/**
 * Bloque compacto y no intrusivo para las superficies de ingreso (check-in, QR):
 * muestra los primeros patrocinadores (el orden lo maneja el admin arrastrando)
 * con rótulo "Patrocinado". Renderiza hasta `max`; `null` si no hay ninguno.
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
  const shown = sponsors.slice(0, max)
  if (!shown.length) return null
  return (
    <div className="space-y-2">
      <p className={cn('text-center text-[11px] font-semibold uppercase tracking-[0.2em]', V[variant].label)}>
        Patrocinado
      </p>
      {shown.map((s, i) => (
        <SponsorCard key={`spot-${s.name}-${i}`} sponsor={s} variant={variant} />
      ))}
    </div>
  )
}

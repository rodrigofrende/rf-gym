import { createElement, type ReactNode } from 'react'
import { ArrowRight, Clock, Dumbbell, Mail, MapPin, MessageCircle, PlayCircle } from 'lucide-react'
import type { GymLink, GymPresentation as GymPresentationData, PublicTariff } from '@/types'
import { parseVideoUrl } from '@/utils/video'
import { mailtoLink, whatsappLink } from '@/utils/contact'
import { resolvePresentation } from '@/utils/presentation'
import { linkIcon } from '@/utils/links'
import { safeHttpUrl } from '@/utils/url'
import { tariffIconMeta } from '@/utils/tariffIcons'
import { frequencyLabel } from '@/utils/tariffs'
import { formatCurrency } from '@/utils/format'
import { APP_NAME } from '@/config/app'
import { cn } from '@/utils/cn'

/**
 * Landing pública "Athletic Bold": fondo oscuro, tipografía display gigante y el
 * color de marca del gym como acento. Es presentacional pura — la usan la página
 * pública (`/g/:gymId`) y la vista previa del admin, para que el admin vea lo que
 * ven los prospectos.
 *
 * Nota de theming: `buildThemeVars` remapea `--color-zinc-700/800/900` al color
 * de TEXTO del gym, así que acá NO usamos esos tonos (quedarían oscuros sobre
 * fondo oscuro). Usamos `white`, `zinc-300/400/500`, `zinc-900/950` (no remapeados)
 * y `brand-*` (que sí sigue el acento del gym, justo lo que queremos que explote).
 */
export function PublicGymView({
  data,
  gymName,
}: {
  data: Partial<GymPresentationData>
  gymName: string
}) {
  const { videos, links } = resolvePresentation(data)
  const tariffs = (data.tariffs ?? []).filter((t) => t && t.name && typeof t.price === 'number')
  const logo = safeHttpUrl(data.logoURL)
  const wa = whatsappLink(data.whatsapp, `Hola, me interesa información sobre ${gymName}`)
  const mail = mailtoLink(data.email, `Consulta sobre ${gymName}`)
  const hasContact = wa || mail || data.address || data.openingHours

  return (
    <div className="min-h-full bg-zinc-950 text-white">
      <header className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 left-1/2 size-[42rem] -translate-x-1/2 rounded-full bg-brand-500/25 blur-[120px]"
        />
        <div className="relative mx-auto max-w-3xl px-6 pb-14 pt-16 sm:pb-20 sm:pt-24">
          <div className="flex items-center gap-3">
            {logo ? (
              <img
                src={logo}
                alt={gymName}
                className="size-11 rounded-xl object-cover ring-1 ring-white/15"
              />
            ) : (
              <div className="flex size-11 items-center justify-center rounded-xl bg-brand-500 text-white">
                <Dumbbell className="size-6" />
              </div>
            )}
            <span className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-400">
              by {APP_NAME}
            </span>
          </div>

          <h1 className="mt-8 break-words font-display text-6xl uppercase leading-[0.85] tracking-tight sm:text-8xl">
            {gymName}
          </h1>
          <div className="mt-5 h-1.5 w-24 rounded-full bg-brand-500" />

          {data.description && (
            <p className="mt-6 max-w-xl whitespace-pre-line text-base leading-relaxed text-zinc-300 sm:text-lg">
              {data.description}
            </p>
          )}

          {(wa || mail) && (
            <div className="mt-8 flex flex-wrap gap-3">
              {wa && (
                <CtaButton href={wa} primary icon={<MessageCircle className="size-4" />}>
                  Escribinos
                </CtaButton>
              )}
              {mail && (
                <CtaButton href={mail} icon={<Mail className="size-4" />}>
                  Email
                </CtaButton>
              )}
            </div>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-16 px-6 pb-20">
        {videos.length > 0 && (
          <Section label="En acción">
            {/* Container query: 2 columnas solo cuando el contenedor es ancho (web),
                así la preview angosta del admin queda en 1 columna. */}
            <div className="@container">
              <div
                className={cn('grid gap-5', videos.length > 1 && '@2xl:grid-cols-2 @2xl:items-start')}
              >
                {videos.map((url, i) => (
                  <PublicVideo key={`${url}-${i}`} url={url} />
                ))}
              </div>
            </div>
          </Section>
        )}

        {tariffs.length > 0 && (
          <Section label="Planes">
            <div className="grid gap-4 sm:grid-cols-2">
              {tariffs.map((tariff) => (
                <PublicTariffCard key={tariff.id} tariff={tariff} />
              ))}
            </div>
          </Section>
        )}

        {links.length > 0 && (
          <Section label="Links">
            <div className="space-y-3">
              {links.map((link, i) => (
                <PublicLinkRow key={`${link.url}-${i}`} link={link} />
              ))}
            </div>
          </Section>
        )}

        {hasContact && (
          <Section label="Sumate">
            <div className="space-y-5">
              {(wa || mail) && (
                <div className="flex flex-wrap gap-3">
                  {wa && (
                    <CtaButton href={wa} primary icon={<MessageCircle className="size-4" />}>
                      WhatsApp
                    </CtaButton>
                  )}
                  {mail && (
                    <CtaButton href={mail} icon={<Mail className="size-4" />}>
                      Email
                    </CtaButton>
                  )}
                </div>
              )}
              {(data.address || data.openingHours) && (
                <div className="space-y-2 text-sm text-zinc-400">
                  {data.address && (
                    <p className="flex items-center gap-2">
                      <MapPin className="size-4 shrink-0 text-brand-400" />
                      {data.address}
                    </p>
                  )}
                  {data.openingHours && (
                    <p className="flex items-center gap-2">
                      <Clock className="size-4 shrink-0 text-brand-400" />
                      {data.openingHours}
                    </p>
                  )}
                </div>
              )}
            </div>
          </Section>
        )}
      </div>

      <footer className="border-t border-white/10 py-8 text-center">
        <p className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-zinc-500">
          <Dumbbell className="size-3.5" />
          Potenciado por <span className="font-semibold text-zinc-300">{APP_NAME}</span>
        </p>
      </footer>
    </div>
  )
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="h-px w-8 bg-brand-500" />
        <h2 className="font-display text-2xl uppercase tracking-wide sm:text-3xl">{label}</h2>
      </div>
      {children}
    </section>
  )
}

function CtaButton({
  href,
  primary,
  icon,
  children,
}: {
  href: string
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
        'inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold uppercase tracking-wide transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950',
        primary
          ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/30'
          : 'border border-white/20 text-white hover:bg-white/10',
      )}
    >
      {icon}
      {children}
      {primary && <ArrowRight className="size-4" />}
    </a>
  )
}

function PublicVideo({ url }: { url: string }) {
  const video = parseVideoUrl(url)
  if (!video) return null

  if (video.kind === 'youtube') {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-2xl bg-black ring-1 ring-white/10">
        <iframe
          src={video.embedUrl}
          title="Video del gimnasio"
          className="size-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    )
  }

  if (video.kind === 'instagram' && video.embedUrl) {
    return (
      <div className="space-y-3">
        <div className="mx-auto w-full max-w-[400px] overflow-hidden rounded-2xl bg-black ring-1 ring-white/10">
          <iframe
            src={video.embedUrl}
            title="Video del gimnasio en Instagram"
            className="h-[560px] w-full"
            loading="lazy"
            scrolling="no"
            allowFullScreen
          />
        </div>
        <a
          href={video.permalink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-400 hover:text-brand-300"
        >
          <PlayCircle className="size-4" />
          Ver en Instagram
        </a>
      </div>
    )
  }

  const href = video.kind === 'instagram' ? video.permalink : video.url
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-zinc-900 p-4 transition-colors hover:bg-zinc-800"
    >
      <PlayCircle className="size-6 shrink-0 text-brand-400" />
      <span className="font-semibold">Ver video</span>
    </a>
  )
}

function PublicTariffCard({ tariff }: { tariff: PublicTariff }) {
  const Icon = tariffIconMeta(tariff.icon).icon
  return (
    <div className="flex h-full flex-col gap-2 rounded-2xl border border-white/10 bg-zinc-900 p-5">
      <div className="flex items-center gap-2">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-500/15 text-brand-400">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold text-white">{tariff.name}</p>
          {tariff.weeklyFrequency !== undefined && (
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              {frequencyLabel(tariff.weeklyFrequency)}
            </p>
          )}
        </div>
      </div>
      {tariff.description && <p className="text-sm text-zinc-400">{tariff.description}</p>}
      <p className="mt-auto pt-2 font-display text-3xl">
        {formatCurrency(tariff.price)}
        <span className="font-sans text-sm text-zinc-500"> /mes</span>
      </p>
    </div>
  )
}

function PublicLinkRow({ link }: { link: GymLink }) {
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-zinc-900 px-5 py-4 transition-colors hover:border-brand-500/50 hover:bg-zinc-800"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-500/15 text-brand-400">
        {createElement(linkIcon(link.url), { className: 'size-4' })}
      </span>
      <span className="min-w-0 flex-1 truncate font-semibold text-white">{link.label}</span>
      <ArrowRight className="size-4 shrink-0 text-zinc-500 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-400" />
    </a>
  )
}

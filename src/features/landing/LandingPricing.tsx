import { Check, MessageCircle, Sparkles } from 'lucide-react'
import type { SubscriptionPlan } from '@/types'
import { PLATFORM_WHATSAPP } from '@/config/app'
import { usePlans } from '@/hooks/usePlans'
import { whatsappLink } from '@/utils/contact'
import { formatCurrency } from '@/utils/format'
import { cn } from '@/utils/cn'
import { planCtaLabel, resolveLandingPlans, waPlanMessage } from './landingContent'
import { CtaButton, LandingSection } from './landingUi'

/** Sección de planes: precios vivos desde `plans` con fallback estático. */
export function LandingPricing() {
  const { data, isLoading, isError } = usePlans()
  const plans = resolveLandingPlans(data, isError)
  // Fallback visual: si ningún plan viene marcado, destacar el del medio.
  const highlightedId = plans.find((p) => p.highlighted)?.id ?? plans[1]?.id
  const waGeneral = whatsappLink(PLATFORM_WHATSAPP, 'Hola! No sé qué plan de RF FIT va con mi gimnasio, ¿lo vemos juntos?')

  return (
    <LandingSection
      id="planes"
      label="Planes que crecen con tu gimnasio"
      sub="Sin costos ocultos ni letra chica. Cambiás de plan cuando tu gimnasio lo pide."
    >
      {isLoading ? (
        <div className="grid gap-4 @2xl:grid-cols-2 @5xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-96 animate-pulse rounded-2xl border border-white/10 bg-zinc-900" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 @2xl:grid-cols-2 @5xl:grid-cols-3">
          {plans.map((plan) => (
            <PricingCard key={plan.id} plan={plan} featured={plan.id === highlightedId} />
          ))}
        </div>
      )}

      <div className="space-y-1 text-sm text-zinc-500">
        <p>Precios en pesos argentinos, por mes, por gimnasio. Tus socios no pagan nada por usar la app.</p>
        {waGeneral && (
          <p>
            ¿No sabés cuál va con tu gimnasio?{' '}
            <a
              href={waGeneral}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-brand-400 hover:text-brand-300"
            >
              Escribinos y lo vemos juntos.
            </a>
          </p>
        )}
      </div>
    </LandingSection>
  )
}

function PricingCard({ plan, featured }: { plan: SubscriptionPlan; featured: boolean }) {
  const wa = whatsappLink(PLATFORM_WHATSAPP, waPlanMessage(plan))
  return (
    <div
      className={cn(
        'relative flex h-full flex-col gap-4 rounded-2xl border p-6',
        featured
          ? 'border-brand-500 bg-zinc-900 shadow-lg shadow-brand-500/20'
          : plan.customPricing
            ? // Tratamiento premium para el plan a medida: degradé sutil de marca.
              'border-white/20 bg-gradient-to-b from-zinc-900 to-brand-500/15'
            : 'border-white/10 bg-zinc-900',
      )}
    >
      {featured && (
        <span className="absolute -top-3 left-6 rounded-full bg-brand-500 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
          Recomendado
        </span>
      )}
      <p className="flex items-center gap-2 font-display text-xl uppercase tracking-wide">
        {plan.customPricing && <Sparkles className="size-5 shrink-0 text-brand-400" />}
        {plan.name}
      </p>
      {plan.customPricing ? (
        <div>
          <p className="font-display text-4xl uppercase">A medida</p>
          <p className="mt-1 text-xs text-zinc-500">lo charlamos según tu gimnasio</p>
        </div>
      ) : (
        <p className="font-display text-4xl">
          {formatCurrency(plan.price)}
          <span className="font-sans text-sm text-zinc-500"> /mes</span>
        </p>
      )}
      <ul className="flex-1 space-y-2 border-t border-white/10 pt-4">
        {(plan.features ?? []).map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-zinc-300">
            <Check className="mt-0.5 size-4 shrink-0 text-brand-400" />
            {f}
          </li>
        ))}
      </ul>
      {wa && (
        <CtaButton href={wa} primary={featured} icon={<MessageCircle className="size-4" />}>
          {planCtaLabel(plan)}
        </CtaButton>
      )}
    </div>
  )
}

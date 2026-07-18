import { CalendarClock, Sparkles } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'

/** Placeholder de la sección Clases: solo el acceso, la feature llega pronto. */
export function ClassesComingSoonPage() {
  return (
    <AppLayout title="Clases">
      <div className="mx-auto max-w-lg">
        <div className="flex flex-col items-center rounded-[var(--radius-card)] border border-dashed border-zinc-200 bg-surface px-6 py-14 text-center">
          <div className="relative">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
              <CalendarClock className="size-8" aria-hidden />
            </div>
            <Sparkles
              className="absolute -right-2 -top-2 size-5 text-brand-400"
              aria-hidden
            />
          </div>
          <h2 className="mt-5 text-lg font-bold text-zinc-900">¡Muy pronto!</h2>
          <p className="mt-2 max-w-sm text-sm text-zinc-500">
            Estamos trabajando en la sección de clases para que puedas ver los
            horarios y organizarte mejor. Volvé a visitarla en unos días.
          </p>
        </div>
      </div>
    </AppLayout>
  )
}

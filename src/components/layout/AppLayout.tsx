import { useState, type ReactNode } from 'react'
import { Menu, MessageSquarePlus, Sparkles } from 'lucide-react'
import { useTenant } from '@/providers/TenantProvider'
import { cn } from '@/utils/cn'
import { ContactMenu } from '@/components/ui'
import { APP_NAME, PLATFORM_EMAIL } from '@/config/app'
import { WhatsNewModal } from '@/features/whats-new/WhatsNewModal'
import { useWhatsNew } from '@/features/whats-new/useWhatsNew'
import { Sidebar } from './Sidebar'

export function AppLayout({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string
  /** Texto/contexto bajo el título (ej. "Últimos 6 meses"). */
  subtitle?: ReactNode
  /** Acciones de la página, alineadas a la derecha del header (ej. botón "Nuevo"). */
  actions?: ReactNode
  children: ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { role, activeMembership, isSuperAdmin } = useTenant()
  const whatsNew = useWhatsNew()

  // Contacto con RF FIT: solo para admins de gym (el super-admin es RF, no se
  // escribe a sí mismo). Vive en la barra superior —accesible desde cualquier
  // pantalla— en vez de amontonarse en el sidebar. Menú: copiar / Gmail / mailto.
  const supportSubject =
    role === 'admin' && !isSuperAdmin && PLATFORM_EMAIL
      ? `Sugerencia o reporte — ${activeMembership?.gymName ?? APP_NAME}`
      : null
  const support = supportSubject ? (
    <ContactMenu
      email={PLATFORM_EMAIL}
      subject={supportSubject}
      align="end"
      extraItems={[
        { icon: <Sparkles className="size-4" />, label: 'Novedades de la app', onClick: whatsNew.show },
      ]}
    >
      {({ toggle }) => (
        <button
          type="button"
          onClick={toggle}
          title="Sugerí mejoras, reportá un problema o mirá las novedades"
          aria-label="Sugerencias, soporte y novedades"
          className="inline-flex shrink-0 items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
        >
          <span className="relative shrink-0">
            <MessageSquarePlus className="size-5" aria-hidden />
            {whatsNew.hasUnseen && (
              <span
                aria-hidden
                className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-brand-500 ring-2 ring-surface"
              />
            )}
          </span>
          <span className="hidden sm:inline">Soporte</span>
        </button>
      )}
    </ContactMenu>
  ) : null

  const hasHeaderContent = Boolean(subtitle || actions || support)

  return (
    <div className="flex h-full">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barra superior solo en mobile: abre el menú y da contexto.
            En desktop el título vive en el header de la página (abajo). */}
        <header className="flex items-center gap-3 border-b border-zinc-200 bg-surface px-4 py-3 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100"
            aria-label="Abrir menú"
          >
            <Menu className="size-5" />
          </button>
          <h1 className="truncate text-base font-semibold text-zinc-900">{title}</h1>
          {support && <div className="ml-auto shrink-0">{support}</div>}
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="mx-auto max-w-6xl">
            {/* Header de página unificado: h1 en desktop + subtítulo + acciones.
                En mobile el h1 vive en la barra superior (de ahí `hidden lg:block`).
                El botón de soporte se muestra solo en desktop (en mobile vive arriba). */}
            <div
              className={cn(
                'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between lg:mb-5',
                hasHeaderContent && 'mb-5',
              )}
            >
              <div className="min-w-0">
                <h1 className="hidden text-xl font-bold text-zinc-900 lg:block">{title}</h1>
                {subtitle && <p className="text-sm text-zinc-500 lg:mt-1">{subtitle}</p>}
              </div>
              {(actions || support) && (
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {actions}
                  {support && <div className="hidden lg:block">{support}</div>}
                </div>
              )}
            </div>

            {children}
          </div>
        </main>
      </div>

      <WhatsNewModal open={whatsNew.open} onClose={whatsNew.close} />
    </div>
  )
}

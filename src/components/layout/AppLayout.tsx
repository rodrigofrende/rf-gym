import { useState, type ReactNode } from 'react'
import { Menu } from 'lucide-react'
import { cn } from '@/utils/cn'
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
  const hasHeaderContent = Boolean(subtitle || actions)

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
          <h1 className="text-base font-semibold text-zinc-900">{title}</h1>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="mx-auto max-w-6xl">
            {/* Header de página unificado: h1 en desktop + subtítulo + acciones.
                En mobile el h1 vive en la barra superior (de ahí `hidden lg:block`). */}
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
              {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
            </div>

            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

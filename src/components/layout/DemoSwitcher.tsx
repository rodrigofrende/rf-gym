import { Crown, ShieldCheck, User } from 'lucide-react'
import { env } from '@/config/env'
import { useAuth, type DemoIdentity } from '@/providers/AuthProvider'
import { cn } from '@/utils/cn'

/**
 * Control flotante solo visible en modo demo: cambia la identidad activa
 * (super-admin ↔ admin ↔ socio) para mostrar las tres vistas con la misma data.
 */
export function DemoSwitcher() {
  const { user, setDemoIdentity } = useAuth()

  if (!env.demoMode || !user || !setDemoIdentity) return null

  const current: DemoIdentity =
    user.uid === 'demo-super' ? 'superadmin' : user.uid === 'demo-admin' ? 'admin' : 'socio'

  const options: { key: DemoIdentity; label: string; icon: typeof User }[] = [
    { key: 'superadmin', label: 'Super', icon: Crown },
    { key: 'admin', label: 'Admin', icon: ShieldCheck },
    { key: 'socio', label: 'Socio', icon: User },
  ]

  return (
    <div className="fixed bottom-4 left-1/2 z-[70] -translate-x-1/2">
      <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/95 px-2 py-1.5 shadow-lg backdrop-blur">
        <span className="px-2 text-xs font-medium text-slate-400">Demo · en memoria</span>
        <div className="flex items-center gap-1">
          {options.map((o) => (
            <button
              key={o.key}
              onClick={() => setDemoIdentity(o.key)}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                current === o.key
                  ? 'bg-brand-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100',
              )}
            >
              <o.icon className="size-4" />
              {o.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

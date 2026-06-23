import { NavLink, useLocation } from 'react-router-dom'
import { Dumbbell, LogOut, X } from 'lucide-react'
import { useAuth } from '@/providers/AuthProvider'
import { useTenant } from '@/providers/TenantProvider'
import { usePrivacy } from '@/providers/PrivacyProvider'
import { ROLE_LABEL } from '@/utils/roles'
import { cn } from '@/utils/cn'
import { emailLocalPart } from '@/utils/loginEmail'
import { Avatar, Text, Toggle } from '@/components/ui'
import { APP_NAME, APP_VERSION } from '@/config/app'
import { TenantSwitcher } from './TenantSwitcher'
import { navForRole, PLATFORM_NAV, SUPER_NAV_ITEM } from './navItems'

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, logout } = useAuth()
  const { role, activeMembership, memberships, isSuperAdmin } = useTenant()
  const { blurred, toggle } = usePrivacy()
  const { pathname } = useLocation()
  // Plataforma RF FIT (vistas del super-admin): marca general, sin logo de gym.
  const isPlatform = pathname.startsWith('/super')

  const items = isPlatform
    ? PLATFORM_NAV
    : [...(isSuperAdmin ? [SUPER_NAV_ITEM] : []), ...(role ? navForRole(role) : [])]
  const brandName = isPlatform ? APP_NAME : (activeMembership?.gymName ?? APP_NAME)
  const logoURL = isPlatform ? undefined : activeMembership?.gymLogoURL
  // El switcher solo tiene sentido si hay más de un gym (evita duplicar el nombre).
  const showSwitcher = !isPlatform && memberships.length > 1
  // Modo discreto: por ahora solo para el admin del gym.
  const showDiscreto = role === 'admin' && !isPlatform
  const userEmail = user?.email ?? ''
  const userLabel = user?.displayName || emailLocalPart(userEmail) || 'Usuario'
  const roleLabel = isSuperAdmin ? 'Super administrador' : role ? ROLE_LABEL[role] : ''

  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-zinc-900/40 lg:hidden" onClick={onClose} />}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-zinc-200 bg-surface transition-transform lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Marca: logo grande + nombre del gym */}
        <div className="flex items-center justify-between gap-2 px-4 py-5">
          <div className="flex min-w-0 items-center gap-3">
            {logoURL ? (
              <img src={logoURL} alt={brandName} className="size-11 shrink-0 rounded-xl object-cover" />
            ) : (
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white">
                <Dumbbell className="size-6" />
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-lg font-bold leading-tight text-zinc-900">{brandName}</p>
              <p className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                {!isPlatform && <span>by {APP_NAME}</span>}
                <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">
                  v{APP_VERSION}
                </span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="shrink-0 text-zinc-400 lg:hidden" aria-label="Cerrar menú">
            <X className="size-5" />
          </button>
        </div>

        {showSwitcher && (
          <div className="px-3 pb-1">
            <TenantSwitcher />
          </div>
        )}

        <nav className="mt-2 flex-1 space-y-1 px-3">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-[var(--radius-control)] px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900',
                )
              }
            >
              <item.icon className="size-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Usuario + acciones */}
        <div className="border-t border-zinc-100 p-3">
          <div className="space-y-3">
            <div className="flex items-center gap-3 px-1">
              <Avatar
                name={user?.displayName || user?.email || '?'}
                src={user?.photoURL ?? undefined}
                size="sm"
              />
              <div className="min-w-0 flex-1" title={userEmail || userLabel}>
                <Text variant="listItem" as="p" className="truncate">
                  {userLabel}
                </Text>
                <Text variant="caption" className="truncate">
                  {roleLabel}
                </Text>
              </div>
            </div>

            <div className="space-y-0.5">
              {showDiscreto && (
                <div
                  className="rounded-[var(--radius-control)] px-3 py-2.5"
                  title="Blurea montos y datos sensibles (para compartir pantalla)"
                >
                  <Toggle
                    checked={blurred}
                    onChange={() => toggle()}
                    label="Modo discreto"
                  />
                </div>
              )}
              <button
                type="button"
                onClick={() => logout()}
                className="flex w-full items-center gap-3 rounded-[var(--radius-control)] px-3 py-2.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
              >
                <LogOut className="size-5 shrink-0" aria-hidden />
                Cerrar sesión
              </button>
            </div>

          </div>
        </div>
      </aside>
    </>
  )
}

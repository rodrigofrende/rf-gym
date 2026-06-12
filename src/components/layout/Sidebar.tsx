import { NavLink, useLocation } from 'react-router-dom'
import { Dumbbell, LogOut, X } from 'lucide-react'
import { useAuth } from '@/providers/AuthProvider'
import { useTenant } from '@/providers/TenantProvider'
import { ROLE_LABEL } from '@/utils/roles'
import { cn } from '@/utils/cn'
import { Avatar } from '@/components/ui'
import { APP_NAME } from '@/config/app'
import { TenantSwitcher } from './TenantSwitcher'
import { navForRole, PLATFORM_NAV, SUPER_NAV_ITEM } from './navItems'

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, logout } = useAuth()
  const { role, activeMembership, isSuperAdmin } = useTenant()
  const { pathname } = useLocation()
  // Plataforma RF Gym (vistas del super-admin): marca general, sin logo de gym.
  const isPlatform = pathname.startsWith('/super')

  const items = isPlatform
    ? PLATFORM_NAV
    : [...(isSuperAdmin ? [SUPER_NAV_ITEM] : []), ...(role ? navForRole(role) : [])]
  const gymName = isPlatform ? APP_NAME : (activeMembership?.gymName ?? APP_NAME)
  const logoURL = isPlatform ? undefined : activeMembership?.gymLogoURL

  return (
    <>
      {/* Overlay mobile */}
      {open && (
        <div className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-surface transition-transform lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex min-w-0 items-center gap-2">
            {logoURL ? (
              <img
                src={logoURL}
                alt={gymName}
                className="size-9 rounded-xl object-cover"
              />
            ) : (
              <div className="flex size-9 items-center justify-center rounded-xl bg-brand-600 text-white">
                <Dumbbell className="size-5" />
              </div>
            )}
            <span className="truncate text-lg font-bold text-slate-900">{gymName}</span>
          </div>
          <button onClick={onClose} className="text-slate-400 lg:hidden">
            <X className="size-5" />
          </button>
        </div>

        {!isPlatform && (
          <div className="px-3">
            <TenantSwitcher />
          </div>
        )}

        <nav className="mt-4 flex-1 space-y-1 px-3">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                )
              }
            >
              <item.icon className="size-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-100 p-3">
          <div className="flex items-center gap-3 px-2 py-2">
            <Avatar name={user?.displayName || user?.email || '?'} src={user?.photoURL ?? undefined} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-800">
                {user?.displayName || user?.email}
              </p>
              <p className="text-xs text-slate-500">
                {isSuperAdmin ? 'Super administrador' : role ? ROLE_LABEL[role] : ''}
              </p>
            </div>
          </div>
          <button
            onClick={() => logout()}
            className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            <LogOut className="size-5" />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  )
}

import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import type { Role } from '@/types'
import { useAuth } from '@/providers/AuthProvider'
import { useTenant } from '@/providers/TenantProvider'
import { FullPageSpinner } from '@/components/ui'
import { UnauthorizedPage } from '@/features/auth/UnauthorizedPage'
import { ROUTES } from './routePaths'

/**
 * Guard de auth + rol. Verifica en orden:
 *   1. auth inicializada → 2. usuario logueado → 3. gym activo → 4. rol permitido.
 */
export function PrivateRoute({
  children,
  allowedRoles,
}: {
  children: ReactNode
  allowedRoles: Role[]
}) {
  const { user, isInitialized } = useAuth()
  const { isLoading, activeGymId, role } = useTenant()

  if (!isInitialized || isLoading) return <FullPageSpinner />
  if (!user) return <Navigate to={ROUTES.LOGIN} replace />
  if (!activeGymId || !role) return <Navigate to={ROUTES.SELECT_GYM} replace />
  if (!allowedRoles.includes(role)) return <UnauthorizedPage />
  return <>{children}</>
}

/**
 * Guard del panel super-admin: requiere auth + capacidad global de super-admin.
 * NO requiere gym activo (el panel es global, cross-tenant).
 */
export function SuperAdminRoute({ children }: { children: ReactNode }) {
  const { user, isInitialized } = useAuth()
  const { isLoading, isSuperAdmin } = useTenant()

  if (!isInitialized || isLoading) return <FullPageSpinner />
  if (!user) return <Navigate to={ROUTES.LOGIN} replace />
  if (!isSuperAdmin) return <UnauthorizedPage />
  return <>{children}</>
}

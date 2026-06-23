import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useOptionalTenant } from '@/providers/TenantProvider'
import { applyTenantTheme } from '@/utils/theme'

/**
 * Aplica el branding del tenant activo a las variables CSS de `:root`.
 * En el área de plataforma (`/super/*`, RF Gym) y fuera de un tenant rige la
 * marca general default; el branding del gym solo aparece al entrar a un gym.
 * Vive fuera de TenantProvider para mantener ese provider puro (sin efectos).
 */
export function TenantThemeEffect() {
  const tenant = useOptionalTenant()
  const { pathname } = useLocation()
  const isPlatform = pathname.startsWith('/super')
  const theme = isPlatform ? null : (tenant?.activeMembership?.gymTheme ?? null)

  useEffect(() => {
    applyTenantTheme(theme)
    return () => applyTenantTheme(null)
  }, [theme])

  return null
}

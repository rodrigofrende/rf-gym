import { useEffect } from 'react'
import { useTenant } from './TenantProvider'
import { applyTenantTheme } from '@/utils/theme'

/**
 * Aplica el branding del tenant activo a las variables CSS de `:root`.
 * Sin tenant (login, select-gym) o sin theme → rige la marca general default.
 * Vive fuera de TenantProvider para mantener ese provider puro (sin efectos).
 */
export function TenantThemeEffect() {
  const { activeMembership } = useTenant()
  const theme = activeMembership?.gymTheme ?? null

  useEffect(() => {
    applyTenantTheme(theme)
    return () => applyTenantTheme(null)
  }, [theme])

  return null
}

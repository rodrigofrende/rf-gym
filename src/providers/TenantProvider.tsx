import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import type { Membership, Role } from '@/types'
import { isSuperAdminEmail } from '@/config/superAdmins'
import { useAuth } from './AuthProvider'
import { useMemberships } from '@/hooks/useMemberships'

interface TenantContextValue {
  memberships: Membership[]
  isLoading: boolean
  activeGymId: string | null
  activeMembership: Membership | null
  role: Role | null
  isSuperAdmin: boolean
  selectGym: (gymId: string) => void
  clearGym: () => void
}

const TenantContext = createContext<TenantContextValue | null>(null)
const STORAGE_KEY = 'gym:activeGymId'

export function TenantProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { data: memberships = [], isLoading } = useMemberships(user)
  const [picked, setPicked] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY))
  const isSuperAdmin = isSuperAdminEmail(user?.email)

  const value = useMemo<TenantContextValue>(() => {
    // El gym activo se DERIVA: la elección persistida si sigue siendo válida,
    // o auto-selección si hay una sola membresía. Sin efectos ni estado duplicado.
    const pickedValid = picked && memberships.some((m) => m.gymId === picked)
    const activeGymId = pickedValid ? picked : memberships.length === 1 ? memberships[0].gymId : null
    const activeMembership = memberships.find((m) => m.gymId === activeGymId) ?? null

    return {
      memberships,
      isLoading,
      activeGymId,
      activeMembership,
      role: activeMembership?.role ?? null,
      isSuperAdmin,
      selectGym: (gymId) => {
        setPicked(gymId)
        localStorage.setItem(STORAGE_KEY, gymId)
      },
      clearGym: () => {
        setPicked(null)
        localStorage.removeItem(STORAGE_KEY)
      },
    }
  }, [memberships, isLoading, picked, isSuperAdmin])

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTenant() {
  const ctx = useContext(TenantContext)
  if (!ctx) throw new Error('useTenant debe usarse dentro de TenantProvider')
  return ctx
}

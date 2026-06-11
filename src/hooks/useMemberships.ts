import { useQuery } from '@tanstack/react-query'
import type { User } from 'firebase/auth'
import { claimPendingMemberships, listMembershipsForUser } from '@/services/membershipsService'
import { queryKeys } from './queryKeys'

/**
 * Reclama invitaciones pendientes y luego lista las membresías del usuario.
 * El claim corre primero para que una invitación recién creada por el admin
 * aparezca en el primer login del socio.
 */
export function useMemberships(user: User | null | undefined) {
  return useQuery({
    queryKey: queryKeys.memberships(user?.uid ?? ''),
    queryFn: async () => {
      await claimPendingMemberships(user as User)
      return listMembershipsForUser((user as User).uid, (user as User).email)
    },
    enabled: !!user?.uid,
    staleTime: 60_000,
  })
}

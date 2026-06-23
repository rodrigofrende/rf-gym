import { useQuery } from '@tanstack/react-query'
import type { User } from 'firebase/auth'
import { listMembershipsForUser } from '@/services/membershipsService'
import { queryKeys } from './queryKeys'

/**
 * Lista las membresías ya sincronizadas del usuario.
 * Las mutaciones de claim se hacen explícitamente en login / crear contraseña.
 */
export function useMemberships(user: User | null | undefined) {
  return useQuery({
    queryKey: queryKeys.memberships(user?.uid ?? ''),
    queryFn: async () => {
      return listMembershipsForUser((user as User).uid, (user as User).email)
    },
    enabled: !!user?.uid,
    staleTime: 0,
    refetchOnMount: 'always',
  })
}

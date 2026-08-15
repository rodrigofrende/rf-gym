import { useQueries } from '@tanstack/react-query'
import type { Gym } from '@/types'
import { listMembers } from '@/services/membersService'
import { queryKeys } from './queryKeys'

/**
 * Cuenta de admins reales por gym: members con `role === 'admin'` (la fuente de
 * verdad, igual que SuperGymsPage). El array denormalizado `gym.adminUids` NO
 * sirve para esto: `syncAdminUid` lo omite mientras el admin invitado no
 * reclamó su cuenta (uid vacío), así que queda desactualizado.
 * Usa la misma query key que useMembers → comparte cache, sin lecturas extra.
 */
export function useGymAdminCounts(gyms: Gym[]) {
  const results = useQueries({
    queries: gyms.map((g) => ({
      queryKey: queryKeys.members(g.id),
      queryFn: () => listMembers(g.id),
      staleTime: 30_000,
    })),
  })

  const byGym = new Map<string, number>()
  gyms.forEach((g, i) => {
    const members = results[i]?.data
    if (members) byGym.set(g.id, members.filter((m) => m.role === 'admin').length)
  })
  const total = [...byGym.values()].reduce((sum, n) => sum + n, 0)
  const isLoading = results.some((r) => r.isLoading)

  return { byGym, total, isLoading }
}

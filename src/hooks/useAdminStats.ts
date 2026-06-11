import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getStats, recomputeStats } from '@/services/statsService'
import { queryKeys } from './queryKeys'

/** Lee el doc agregado de stats con cache largo (query "larga", no se pide seguido). */
export function useAdminStats(gymId: string) {
  return useQuery({
    queryKey: queryKeys.stats(gymId),
    queryFn: () => getStats(gymId),
    enabled: !!gymId,
    staleTime: 5 * 60_000,
  })
}

/** Recalcula el doc on-demand y refresca el cache. */
export function useRecomputeStats(gymId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => recomputeStats(gymId),
    onSuccess: (stats) => qc.setQueryData(queryKeys.stats(gymId), { id: 'summary', ...stats }),
  })
}

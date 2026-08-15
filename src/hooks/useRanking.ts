import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { listMonthlyLeaderboard, recomputeMonthlyLeaderboard } from '@/services/rankingService'
import { queryKeys } from './queryKeys'

/** Ranking mensual de asistencia (monthKey 'YYYY-MM'). */
export function useMonthlyLeaderboard(gymId: string, monthKey: string) {
  return useQuery({
    queryKey: queryKeys.monthlyLeaderboard(gymId, monthKey),
    queryFn: () => listMonthlyLeaderboard(gymId, monthKey),
    enabled: !!gymId,
    staleTime: 60_000,
  })
}

/** Recompute admin: re-agrega el mes desde `attendance` (backfill/reparación). */
export function useRecomputeLeaderboard(gymId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (monthKey: string) => recomputeMonthlyLeaderboard(gymId, monthKey),
    onSuccess: (_, monthKey) =>
      qc.invalidateQueries({ queryKey: queryKeys.monthlyLeaderboard(gymId, monthKey) }),
  })
}

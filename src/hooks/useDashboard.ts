import { useQuery } from '@tanstack/react-query'
import { getDashboard, getPlatformStats } from '@/services/dashboardService'
import { queryKeys } from './queryKeys'

export function useGymDashboard(gymId: string) {
  return useQuery({
    queryKey: queryKeys.dashboard(gymId),
    queryFn: () => getDashboard(gymId),
    enabled: !!gymId,
    staleTime: 60_000,
  })
}

export function usePlatformStats() {
  return useQuery({
    queryKey: queryKeys.platformStats(),
    queryFn: () => getPlatformStats(),
    staleTime: 60_000,
  })
}

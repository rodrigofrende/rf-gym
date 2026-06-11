import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Gym } from '@/types'
import { getGym, updateGymBranding } from '@/services/gymsService'
import { queryKeys } from './queryKeys'

export function useGym(gymId: string) {
  return useQuery({
    queryKey: queryKeys.gym(gymId),
    queryFn: () => getGym(gymId),
    enabled: !!gymId,
    staleTime: 60_000,
  })
}

/**
 * Guarda el branding del gym. Invalida el gym y las membresías (de donde el
 * theme se lee y aplica), para que el cambio se refleje al instante.
 */
export function useUpdateGymBranding(gymId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Pick<Gym, 'theme' | 'logoURL'>>) =>
      updateGymBranding(gymId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.gym(gymId) })
      qc.invalidateQueries({ queryKey: ['memberships'] })
    },
  })
}

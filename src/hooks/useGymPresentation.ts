import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getGymPresentation,
  listGymPresentations,
  updateGymPresentation,
  type GymPresentationUpdate,
} from '@/services/gymPresentationService'
import { queryKeys } from './queryKeys'

export function useGymPresentation(gymId: string) {
  return useQuery({
    queryKey: queryKeys.gymPresentation(gymId),
    queryFn: () => getGymPresentation(gymId),
    enabled: !!gymId,
    staleTime: 60_000,
  })
}

/** Perfiles públicos de los gyms de la plataforma (sección clientes de la landing). */
export function useGymPresentations() {
  return useQuery({
    queryKey: queryKeys.gymPresentations(),
    queryFn: () => listGymPresentations(),
    staleTime: 5 * 60_000,
  })
}

export function useUpdateGymPresentation(gymId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: GymPresentationUpdate) => updateGymPresentation(gymId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.gymPresentation(gymId) }),
  })
}

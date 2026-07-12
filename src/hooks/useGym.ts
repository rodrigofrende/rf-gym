import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Gym, GymPresentation } from '@/types'
import { getGym, updateGymBranding, type GymBrandingUpdate } from '@/services/gymsService'
import { updateGymPresentation } from '@/services/gymPresentationService'
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
 * theme se lee y aplica), para que el cambio se refleje al instante. Además
 * refresca el snapshot de marca del perfil público (`publicProfiles/{gymId}`)
 * para que la página pública/del socio no quede con la marca vieja.
 */
export function useUpdateGymBranding(gymId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: GymBrandingUpdate) => updateGymBranding(gymId, data),
    onSuccess: async (_res, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.gym(gymId) })
      qc.invalidateQueries({ queryKey: ['memberships'] })
      const gym = qc.getQueryData<Gym | null>(queryKeys.gym(gymId))
      // Espejo explícito del snapshot de marca: los campos de rate-limit del logo
      // no viajan a publicProfiles (la whitelist de las rules los rechazaría).
      const mirror: Partial<Omit<GymPresentation, 'id'>> = { name: gym?.name }
      if (variables.theme !== undefined) mirror.theme = variables.theme
      if (variables.logoURL !== undefined) mirror.logoURL = variables.logoURL
      await updateGymPresentation(gymId, mirror)
      qc.invalidateQueries({ queryKey: queryKeys.gymPresentation(gymId) })
    },
  })
}

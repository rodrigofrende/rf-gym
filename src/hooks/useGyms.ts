import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Gym } from '@/types'
import {
  addGymAdmin,
  createGym,
  listGyms,
  removeGym,
  removeGymAdmin,
  updateGym,
} from '@/services/gymsService'
import { queryKeys } from './queryKeys'

export function useGyms() {
  return useQuery({
    queryKey: queryKeys.gyms(),
    queryFn: () => listGyms(),
    staleTime: 30_000,
  })
}

/** Mutations del super-admin: crear/eliminar gym y agregar/quitar admins. */
export function useGymAdminActions() {
  const qc = useQueryClient()
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: queryKeys.gyms() })
    qc.invalidateQueries({ queryKey: ['memberships'] })
  }

  const create = useMutation({
    mutationFn: (data: Omit<Gym, 'id'>) => createGym(data),
    onSuccess: invalidate,
  })
  const remove = useMutation({
    mutationFn: (gymId: string) => removeGym(gymId),
    onSuccess: invalidate,
  })
  const update = useMutation({
    mutationFn: ({ gymId, data }: { gymId: string; data: Partial<Omit<Gym, 'id'>> }) =>
      updateGym(gymId, data),
    onSuccess: (_r, { gymId }) => {
      invalidate()
      qc.invalidateQueries({ queryKey: queryKeys.gym(gymId) })
    },
  })
  const addAdmin = useMutation({
    mutationFn: ({ gymId, uid }: { gymId: string; uid: string }) => addGymAdmin(gymId, uid),
    onSuccess: invalidate,
  })
  const removeAdmin = useMutation({
    mutationFn: ({ gymId, uid }: { gymId: string; uid: string }) => removeGymAdmin(gymId, uid),
    onSuccess: invalidate,
  })

  return { create, update, remove, addAdmin, removeAdmin }
}

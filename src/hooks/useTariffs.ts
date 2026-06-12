import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Tariff } from '@/types'
import { createTariff, listTariffs, removeTariff, updateTariff } from '@/services/tariffsService'
import { queryKeys } from './queryKeys'

export function useTariffs(gymId: string) {
  return useQuery({
    queryKey: queryKeys.tariffs(gymId),
    queryFn: () => listTariffs(gymId),
    enabled: !!gymId,
    staleTime: 60_000,
  })
}

export function useCreateTariff(gymId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<Tariff, 'id'>) => createTariff(gymId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.tariffs(gymId) }),
  })
}

export function useUpdateTariff(gymId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ tariffId, data }: { tariffId: string; data: Partial<Tariff> }) =>
      updateTariff(gymId, tariffId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.tariffs(gymId) }),
  })
}

export function useRemoveTariff(gymId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (tariffId: string) => removeTariff(gymId, tariffId),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.tariffs(gymId) }),
  })
}

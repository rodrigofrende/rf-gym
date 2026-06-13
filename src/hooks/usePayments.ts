import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { GymSubscription } from '@/types'
import {
  listGymPayments,
  listMemberPayments,
  registerGymPayment,
  registerMemberPayment,
  removeGymPayment,
  removeMemberPayment,
  type NewPayment,
} from '@/services/paymentsService'
import { queryKeys } from './queryKeys'

// ---- Socios ----
export function useMemberPayments(gymId: string, memberId: string) {
  return useQuery({
    queryKey: queryKeys.payments(gymId, memberId),
    queryFn: () => listMemberPayments(gymId, memberId),
    enabled: !!gymId && !!memberId,
  })
}

export function useRegisterMemberPayment(gymId: string, memberId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ payment, currentDueDate }: { payment: NewPayment; currentDueDate?: Date }) =>
      registerMemberPayment(gymId, memberId, payment, currentDueDate),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.payments(gymId, memberId) })
      qc.invalidateQueries({ queryKey: queryKeys.member(gymId, memberId) })
      qc.invalidateQueries({ queryKey: queryKeys.members(gymId) })
      qc.invalidateQueries({ queryKey: queryKeys.stats(gymId) })
      qc.invalidateQueries({ queryKey: queryKeys.dashboard(gymId) })
    },
  })
}

export function useRemoveMemberPayment(gymId: string, memberId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (paymentId: string) => removeMemberPayment(gymId, memberId, paymentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.payments(gymId, memberId) })
    },
  })
}

// ---- Gimnasios (suscripción) ----
export function useGymPayments(gymId: string) {
  return useQuery({
    queryKey: queryKeys.gymPayments(gymId),
    queryFn: () => listGymPayments(gymId),
    enabled: !!gymId,
  })
}

export function useRegisterGymPayment(gymId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ payment, subscription }: { payment: NewPayment; subscription: GymSubscription }) =>
      registerGymPayment(gymId, payment, subscription),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.gymPayments(gymId) })
      qc.invalidateQueries({ queryKey: queryKeys.gyms() })
      qc.invalidateQueries({ queryKey: queryKeys.gym(gymId) })
      qc.invalidateQueries({ queryKey: ['memberships'] })
    },
  })
}

export function useRemoveGymPayment(gymId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (paymentId: string) => removeGymPayment(gymId, paymentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.gymPayments(gymId) })
    },
  })
}

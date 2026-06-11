import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Member } from '@/types'
import {
  createMember,
  getMember,
  listMembers,
  removeMember,
  updateMember,
  updateMemberProfile,
} from '@/services/membersService'
import { queryKeys } from './queryKeys'

export function useMembers(gymId: string) {
  return useQuery({
    queryKey: queryKeys.members(gymId),
    queryFn: () => listMembers(gymId),
    enabled: !!gymId,
    staleTime: 30_000,
  })
}

export function useMember(gymId: string, memberId: string) {
  return useQuery({
    queryKey: queryKeys.member(gymId, memberId),
    queryFn: () => getMember(gymId, memberId),
    enabled: !!gymId && !!memberId,
  })
}

export function useCreateMember(gymId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<Member, 'id' | 'uid'>) => createMember(gymId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.members(gymId) })
      qc.invalidateQueries({ queryKey: queryKeys.stats(gymId) })
    },
  })
}

export function useUpdateMember(gymId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ memberId, data }: { memberId: string; data: Partial<Member> }) =>
      updateMember(gymId, memberId, data),
    onSuccess: (_r, { memberId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.members(gymId) })
      qc.invalidateQueries({ queryKey: queryKeys.member(gymId, memberId) })
      qc.invalidateQueries({ queryKey: queryKeys.stats(gymId) })
    },
  })
}

export function useUpdateMemberProfile(gymId: string, memberId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Pick<Member, 'fullName' | 'phone' | 'birthDate' | 'photoURL'>) =>
      updateMemberProfile(gymId, memberId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.member(gymId, memberId) })
    },
  })
}

export function useRemoveMember(gymId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (memberId: string) => removeMember(gymId, memberId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.members(gymId) })
      qc.invalidateQueries({ queryKey: queryKeys.stats(gymId) })
    },
  })
}

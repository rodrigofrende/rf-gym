import { orderBy } from 'firebase/firestore'
import type { Member } from '@/types'
import { env } from '@/config/env'
import * as demo from '@/demo/store'
import { addToCollection, getMany, getOne, removeOne, updateOne } from './firestore'
import { paths } from './paths'

export function listMembers(gymId: string) {
  if (env.demoMode) return demo.listMembers(gymId)
  return getMany<Member>(paths.members(gymId), orderBy('fullName'))
}

export function getMember(gymId: string, memberId: string) {
  if (env.demoMode) return demo.getMember(gymId, memberId)
  return getOne<Member>(paths.member(gymId, memberId))
}

/** Alta de un socio (admin). Crea la invitación: uid vacío hasta que la reclame. */
export function createMember(gymId: string, data: Omit<Member, 'id' | 'uid'>) {
  if (env.demoMode) return demo.createMember(gymId, data)
  return addToCollection(paths.members(gymId), { ...data, uid: '' })
}

/** Edición completa de datos por el admin. */
export function updateMember(gymId: string, memberId: string, data: Partial<Member>) {
  if (env.demoMode) return demo.updateMember(gymId, memberId, data)
  return updateOne(paths.member(gymId, memberId), data)
}

/** Edición acotada de datos personales (usada por el propio socio). */
export function updateMemberProfile(
  gymId: string,
  memberId: string,
  data: Pick<Member, 'fullName' | 'phone' | 'birthDate' | 'photoURL'>,
) {
  if (env.demoMode) return demo.updateMemberProfile(gymId, memberId, data)
  return updateOne(paths.member(gymId, memberId), data)
}

export function removeMember(gymId: string, memberId: string) {
  if (env.demoMode) return demo.removeMember(gymId, memberId)
  return removeOne(paths.member(gymId, memberId))
}

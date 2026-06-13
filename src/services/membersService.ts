import { orderBy } from 'firebase/firestore'
import type { Member, Role } from '@/types'
import { env } from '@/config/env'
import * as demo from '@/demo/store'
import { addGymAdmin, removeGymAdmin } from './gymsService'
import {
  removeGymMembershipIndex,
  syncGymMembershipIndex,
} from './membershipIndexService'
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

async function syncAdminUid(gymId: string, uid: string, role: Role, prevRole?: Role) {
  if (!uid) return
  if (role === 'admin' && prevRole !== 'admin') await addGymAdmin(gymId, uid)
  if (role !== 'admin' && prevRole === 'admin') await removeGymAdmin(gymId, uid)
}

/** Alta de un socio (admin). Crea la invitación: uid vacío hasta que la reclame. */
export async function createMember(gymId: string, data: Omit<Member, 'id' | 'uid'>) {
  if (env.demoMode) return demo.createMember(gymId, data)
  return addToCollection(paths.members(gymId), { ...data, uid: '' })
}

/** Edición completa de datos por el admin. */
export async function updateMember(gymId: string, memberId: string, data: Partial<Member>) {
  if (env.demoMode) return demo.updateMember(gymId, memberId, data)
  const prev = await getMember(gymId, memberId)
  await updateOne(paths.member(gymId, memberId), data)
  const nextRole = data.role ?? prev?.role
  const uid = data.uid ?? prev?.uid ?? ''
  if (uid && nextRole) {
    await syncGymMembershipIndex(uid, gymId, { memberId, role: nextRole })
    await syncAdminUid(gymId, uid, nextRole, prev?.role)
  }
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

export async function removeMember(gymId: string, memberId: string) {
  if (env.demoMode) return demo.removeMember(gymId, memberId)
  const prev = await getMember(gymId, memberId)
  if (prev?.uid) {
    await removeGymMembershipIndex(prev.uid, gymId)
    if (prev.role === 'admin') await removeGymAdmin(gymId, prev.uid)
  }
  return removeOne(paths.member(gymId, memberId))
}

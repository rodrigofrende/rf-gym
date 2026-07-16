import { deleteDoc, doc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { env } from '@/config/env'
import type { Gym, Member, MemberAuthStatus, MemberLoginIndex } from '@/types'
import { normalizeEmailKey } from '@/utils/loginEmail'
import * as demo from '@/demo/store'
import { getOne, setOne, updateOne } from './firestore'
import { getGym } from './gymsService'
import { paths } from './paths'

export function defaultAuthStatus(member: Pick<Member, 'uid' | 'authStatus'>): MemberAuthStatus {
  return member.authStatus ?? (member.uid ? 'active' : 'pending_password')
}

export function getMemberLogin(email: string): Promise<MemberLoginIndex | null> {
  if (env.demoMode) return demo.getMemberLogin(email)
  return getOne<MemberLoginIndex>(paths.memberLoginIndex(normalizeEmailKey(email)))
}

export async function syncMemberLoginIndex(
  gymId: string,
  memberId: string,
  member: Omit<Member, 'id'> | Member,
  gym?: Pick<Gym, 'name'> | null,
) {
  if (env.demoMode) return demo.syncMemberLoginIndex(gymId, memberId, member)
  const gymData = gym ?? (await getGym(gymId))
  const email = member.loginEmail || member.email
  await setOne(paths.memberLoginIndex(normalizeEmailKey(email)), {
    email,
    gymId,
    gymName: gymData?.name ?? 'Gimnasio',
    memberId,
    authStatus: defaultAuthStatus(member),
  } satisfies Omit<MemberLoginIndex, 'id'>)
}

export async function removeMemberLoginIndex(email: string) {
  if (env.demoMode) return demo.removeMemberLoginIndex(email)
  await deleteDoc(doc(db, paths.memberLoginIndex(normalizeEmailKey(email))))
}

export async function updateMemberAuthStatus(
  gymId: string,
  memberId: string,
  authStatus: MemberAuthStatus,
  extra: Partial<Pick<Member, 'passwordUpdatedAt' | 'passwordResetRequestedAt'>> = {},
  // Datos ya leídos por el caller (ej. el claim del login): evita el getOne del
  // member y el getGym del índice — 2 round-trips menos en el primer acceso.
  preloaded: { member?: Member; gymName?: string } = {},
) {
  if (env.demoMode) return demo.updateMemberAuthStatus(gymId, memberId, authStatus, extra)
  const member = preloaded.member ?? (await getOne<Member>(paths.member(gymId, memberId)))
  if (!member) throw new Error('member-not-found')
  await updateOne(paths.member(gymId, memberId), { authStatus, ...extra })
  await syncMemberLoginIndex(
    gymId,
    memberId,
    { ...member, authStatus, ...extra },
    preloaded.gymName ? { name: preloaded.gymName } : undefined,
  )
}

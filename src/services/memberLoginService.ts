import { deleteDoc, doc, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { env } from '@/config/env'
import type { Gym, Member, MemberAuthStatus, MemberLoginIndex } from '@/types'
import { normalizeEmailKey, loginEmailKeys } from '@/utils/loginEmail'
import * as demo from '@/demo/store'
import { getOne, updateOne } from './firestore'
import { getGym } from './gymsService'
import { paths } from './paths'

export function getMemberLogin(email: string): Promise<MemberLoginIndex | null> {
  if (env.demoMode) return demo.getMemberLogin(email)
  return getOne<MemberLoginIndex>(paths.memberLoginIndex(normalizeEmailKey(email)))
}

export const LOGIN_INDEX_MISSING_MESSAGE =
  'Este email no está dado de alta. Pedile a tu gimnasio que te agregue, o usá el email de acceso que te dieron.'

export async function syncMemberLoginIndex(
  gymId: string,
  memberId: string,
  member: Omit<Member, 'id'> | Member,
  gym?: Pick<Gym, 'name'> | null,
) {
  if (env.demoMode) return demo.syncMemberLoginIndex(gymId, memberId, member)
  const gymData = gym ?? (await getGym(gymId))
  const emails = loginEmailKeys(member)
  // OVERWRITE (sin merge): el índice de login es world-readable y las rules lo
  // validan con hasOnly([4 claves]). Un merge conservaría claves legacy de docs
  // viejos y rompería esa validación → "permiso denegado". Sobrescribir garantiza
  // que el doc quede exactamente con las 4 claves permitidas. NO se guarda
  // authStatus (no filtrar qué socios están sin reclamar).
  //
  // `email` del payload DEBE coincidir con la clave del doc (rules: emailKey ==
  // email.lower()). Por eso indexamos la versión ya normalizada, y si el socio
  // tiene email de contacto distinto al de acceso, publicamos ambas claves.
  await Promise.all(
    emails.map((email) =>
      setDoc(doc(db, paths.memberLoginIndex(email)), {
        email,
        gymId,
        gymName: gymData?.name ?? 'Gimnasio',
        memberId,
      } satisfies Omit<MemberLoginIndex, 'id'>),
    ),
  )
}

export async function removeMemberLoginIndex(email: string) {
  if (env.demoMode) return demo.removeMemberLoginIndex(email)
  await deleteDoc(doc(db, paths.memberLoginIndex(normalizeEmailKey(email))))
}

export async function removeMemberLoginIndexes(member: { email?: string; loginEmail?: string }) {
  await Promise.all(loginEmailKeys(member).map(removeMemberLoginIndex))
}

/** Re-publica el índice de login de todos los socios del gym (backfill). */
export async function ensureGymLoginIndexes(gymId: string, members: Member[]) {
  if (env.demoMode || members.length === 0) return
  const gym = await getGym(gymId)
  const chunkSize = 10
  for (let i = 0; i < members.length; i += chunkSize) {
    const chunk = members.slice(i, i + chunkSize)
    await Promise.all(chunk.map((member) => syncMemberLoginIndex(gymId, member.id, member, gym)))
  }
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

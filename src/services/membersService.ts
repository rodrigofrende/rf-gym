import { orderBy } from 'firebase/firestore'
import type { Member, Role } from '@/types'
import { env } from '@/config/env'
import * as demo from '@/demo/store'
import { addGymAdmin, getGym, removeGymAdmin } from './gymsService'
import {
  removeGymMembershipIndex,
  syncGymMembershipIndex,
} from './membershipIndexService'
import { listPlans } from './plansService'
import { addToCollection, getMany, getOne, removeOne, updateOne } from './firestore'
import { removeMemberLoginIndex, syncMemberLoginIndex } from './memberLoginService'
import { paths } from './paths'
import { canCreateAdmin } from '@/utils/plans'
import { normalizeEmailKey } from '@/utils/loginEmail'

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

async function assertCanSaveAdmin(gymId: string, nextRole: Role, currentMemberId?: string) {
  if (nextRole !== 'admin') return
  const [members, gym, plans] = await Promise.all([listMembers(gymId), getGym(gymId), listPlans()])
  const plan = plans.find((p) => p.id === gym?.subscription?.planId)
  const currentAdmins = members.filter((m) => m.role === 'admin' && m.id !== currentMemberId).length
  const gate = canCreateAdmin(plan, currentAdmins)
  if (!gate.allowed) throw new Error(gate.reason)
}

/**
 * Evita dos socios con el mismo email de acceso en el mismo gym: el login se
 * indexa por email (`memberLoginIndex/{emailKey}`), así que un duplicado
 * pisaría el índice y rompería el primer login / claim.
 */
async function assertUniqueLoginEmail(gymId: string, email: string, currentMemberId?: string) {
  const target = normalizeEmailKey(email)
  if (!target) return
  const members = await listMembers(gymId)
  const clash = members.some(
    (m) => m.id !== currentMemberId && normalizeEmailKey(m.loginEmail || m.email) === target,
  )
  if (clash) throw new Error('Ya existe un socio con ese email de acceso en este gimnasio')
}

/** Alta de un socio (admin). Crea la invitación: uid vacío hasta que la reclame. */
export async function createMember(gymId: string, data: Omit<Member, 'id' | 'uid'>) {
  if (env.demoMode) return demo.createMember(gymId, data)
  await assertCanSaveAdmin(gymId, data.role)
  await assertUniqueLoginEmail(gymId, data.loginEmail || data.email)
  const payload = {
    ...data,
    uid: '',
    loginEmail: data.loginEmail || data.email,
    authStatus: data.authStatus ?? 'pending_password',
  } satisfies Omit<Member, 'id'>
  const memberId = await addToCollection(paths.members(gymId), payload)
  await syncMemberLoginIndex(gymId, memberId, payload)
  return memberId
}

/** Edición completa de datos por el admin. */
export async function updateMember(gymId: string, memberId: string, data: Partial<Member>) {
  if (env.demoMode) return demo.updateMember(gymId, memberId, data)
  const prev = await getMember(gymId, memberId)
  // Solo validar el cupo de admins cuando REALMENTE se promueve a admin. Un
  // update que no toca el rol (ej. resetear la contraseña de un admin existente)
  // no debe re-chequear el cupo: si el gym quedó sobre el límite tras bajar de
  // plan, igual se lo debe poder editar sin quedar trabado.
  if (data.role === 'admin' && prev?.role !== 'admin') {
    await assertCanSaveAdmin(gymId, 'admin', memberId)
  }
  const nextEmail = data.loginEmail ?? data.email
  if (prev && nextEmail && normalizeEmailKey(nextEmail) !== normalizeEmailKey(prev.loginEmail || prev.email)) {
    await assertUniqueLoginEmail(gymId, nextEmail, memberId)
  }
  await updateOne(paths.member(gymId, memberId), data)
  if (prev && (data.email || data.loginEmail) && (data.email ?? data.loginEmail) !== (prev.loginEmail || prev.email)) {
    await removeMemberLoginIndex(prev.loginEmail || prev.email)
  }
  if (prev) await syncMemberLoginIndex(gymId, memberId, { ...prev, ...data })
  const nextRole = data.role ?? prev?.role
  const uid = data.uid ?? prev?.uid ?? ''
  if (uid && nextRole) {
    await syncGymMembershipIndex(uid, gymId, { memberId, role: nextRole })
    await syncAdminUid(gymId, uid, nextRole, prev?.role)
  }
}

/**
 * Re-emite el acceso de un socio con un email NUEVO y lo deja en "primer acceso"
 * (pending_password, sin uid), conservando todos sus datos. Es el blanqueo sin
 * backend: como Firebase no deja resetear la contraseña de una cuenta existente
 * client-only, se emite un login nuevo (que no tiene cuenta) y el socio crea su
 * contraseña en el primer ingreso, sin saber la anterior. La cuenta vieja queda
 * huérfana e inutilizada.
 */
export async function reissueMemberAccess(gymId: string, memberId: string, newLoginEmail: string) {
  const email = newLoginEmail.trim()
  if (env.demoMode) {
    return demo.updateMember(gymId, memberId, {
      loginEmail: email,
      email,
      authStatus: 'pending_password',
      uid: '',
    })
  }
  const prev = await getMember(gymId, memberId)
  if (!prev) throw new Error('No encontramos al socio')
  if (normalizeEmailKey(email) === normalizeEmailKey(prev.loginEmail || prev.email)) {
    throw new Error('El acceso nuevo tiene que ser distinto del actual: Firebase no permite reusar la cuenta anterior.')
  }
  await assertUniqueLoginEmail(gymId, email, memberId)

  // Limpiar la identidad vieja: índice de membresía y, si era admin, adminUids.
  // La cuenta de Firebase vieja queda huérfana (nadie la usa).
  if (prev.uid) {
    await removeGymMembershipIndex(prev.uid, gymId)
    if (prev.role === 'admin') await removeGymAdmin(gymId, prev.uid)
  }
  // Reset del member: email nuevo + primer acceso (uid vacío hasta reclamar).
  await updateOne(paths.member(gymId, memberId), {
    loginEmail: email,
    email,
    authStatus: 'pending_password',
    uid: '',
  })
  // Reapuntar el índice de login: sacar el viejo, crear el nuevo (pending).
  await removeMemberLoginIndex(prev.loginEmail || prev.email)
  await syncMemberLoginIndex(gymId, memberId, {
    ...prev,
    loginEmail: email,
    email,
    authStatus: 'pending_password',
    uid: '',
  })
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
  if (prev) await removeMemberLoginIndex(prev.loginEmail || prev.email)
  return removeOne(paths.member(gymId, memberId))
}

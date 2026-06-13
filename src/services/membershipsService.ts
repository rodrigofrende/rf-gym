import {
  collectionGroup,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  updateDoc,
} from 'firebase/firestore'
import type { User } from 'firebase/auth'
import { db } from '@/lib/firebase'
import type { Gym, Member, Membership, Role } from '@/types'
import { env } from '@/config/env'
import { isSuperAdminEmail } from '@/config/superAdmins'
import { addGymAdmin } from './gymsService'
import { syncGymMembershipIndex } from './membershipIndexService'
import { listGyms } from './gymsService'
import * as demo from '@/demo/store'

/**
 * Reclama las invitaciones pendientes del usuario: busca membresías creadas por
 * un admin con su email y todavía sin `uid`, y las enlaza a su cuenta. Se corre
 * al loguearse, antes de listar las membresías.
 */
export async function claimPendingMemberships(user: User): Promise<void> {
  if (env.demoMode) return
  if (!user.email) return
  const q = query(
    collectionGroup(db, 'members'),
    where('email', '==', user.email),
    where('uid', '==', ''),
  )
  const snap = await getDocs(q)
  await Promise.all(
    snap.docs.map(async (d) => {
      const gymId = d.ref.parent.parent?.id
      if (!gymId) return
      const member = d.data() as Member
      await updateDoc(d.ref, { uid: user.uid })
      await syncGymMembershipIndex(user.uid, gymId, {
        memberId: d.id,
        role: member.role,
      })
      if (member.role === 'admin') await addGymAdmin(gymId, user.uid)
    }),
  )
}

/** Trae todas las membresías ya reclamadas del usuario, en todos los gyms. */
export async function listMembershipsForUser(
  uid: string,
  email?: string | null,
): Promise<Membership[]> {
  if (env.demoMode) return demo.listMembershipsForUser(uid, email)

  if (isSuperAdminEmail(email)) {
    const gyms = await listGyms()
    return gyms.map(
      (g) =>
        ({
          gymId: g.id,
          memberId: uid,
          gymName: g.name,
          gymLogoURL: g.logoURL,
          gymTheme: g.theme,
          role: 'admin' as Role,
        }) satisfies Membership,
    )
  }

  const q = query(collectionGroup(db, 'members'), where('uid', '==', uid))
  const snap = await getDocs(q)

  const memberships = await Promise.all(
    snap.docs.map(async (d) => {
      const gymId = d.ref.parent.parent?.id
      if (!gymId) return null
      const member = d.data() as Member
      await syncGymMembershipIndex(uid, gymId, { memberId: d.id, role: member.role })
      const gymSnap = await getDoc(doc(db, 'gyms', gymId))
      const gym = gymSnap.data() as Omit<Gym, 'id'> | undefined
      return {
        gymId,
        memberId: d.id,
        gymName: gym?.name ?? 'Gimnasio',
        gymLogoURL: gym?.logoURL,
        gymTheme: gym?.theme,
        role: member.role as Role,
      } satisfies Membership
    }),
  )

  return memberships.filter((m) => m !== null) as Membership[]
}

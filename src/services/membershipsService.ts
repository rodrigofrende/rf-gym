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
import { syncGymMembershipIndex, type GymMembershipIndex } from './membershipIndexService'
import { listGyms } from './gymsService'
import { getMany } from './firestore'
import { paths } from './paths'
import * as demo from '@/demo/store'

export interface ClaimedMembership {
  gymId: string
  memberId: string
  role: Role
}

/**
 * Reclama las invitaciones pendientes del usuario: busca membresías creadas por
 * un admin con su email y todavía sin `uid`, y las enlaza a su cuenta. Se corre
 * al loguearse, antes de listar las membresías.
 */
export async function claimPendingMemberships(user: User): Promise<ClaimedMembership[]> {
  if (env.demoMode) return []
  if (!user.email) return []
  const q = query(
    collectionGroup(db, 'members'),
    where('email', '==', user.email),
    where('uid', '==', ''),
  )
  const snap = await getDocs(q)
  const claimed = await Promise.all(
    snap.docs.map(async (d) => {
      const gymId = d.ref.parent.parent?.id
      if (!gymId) return null
      const member = d.data() as Member
      await updateDoc(d.ref, { uid: user.uid })
      await syncGymMembershipIndex(user.uid, gymId, {
        memberId: d.id,
        role: member.role,
      })
      return { gymId, memberId: d.id, role: member.role } satisfies ClaimedMembership
    }),
  )
  return claimed.filter((m) => m !== null) as ClaimedMembership[]
}

export async function claimMembership(user: User, gymId: string, memberId: string): Promise<ClaimedMembership | null> {
  if (env.demoMode) return null
  if (!user.email) return null

  const memberRef = doc(db, 'gyms', gymId, 'members', memberId)
  const snap = await getDoc(memberRef)
  if (!snap.exists()) throw new Error('member-not-found')

  const member = snap.data() as Member
  if (member.uid && member.uid !== user.uid) throw new Error('member-already-claimed')
  if (!member.uid) await updateDoc(memberRef, { uid: user.uid })

  await syncGymMembershipIndex(user.uid, gymId, {
    memberId,
    role: member.role,
  })
  return { gymId, memberId, role: member.role }
}

/** Trae todas las membresías ya reclamadas del usuario, en todos los gyms. */
export async function listMembershipsForUser(
  uid: string,
  isSuperAdmin: boolean,
): Promise<Membership[]> {
  if (env.demoMode) return demo.listMembershipsForUser(uid, isSuperAdmin)

  if (isSuperAdmin) {
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

  const indexedMemberships = await getMany<GymMembershipIndex & { id: string }>(paths.userGymMemberships(uid))
  if (indexedMemberships.length) {
    const memberships = await Promise.all(
      indexedMemberships.map(async (index) => {
        const gymId = index.id
        const [memberSnap, gymSnap] = await Promise.all([
          getDoc(doc(db, paths.member(gymId, index.memberId))),
          getDoc(doc(db, paths.gym(gymId))),
        ])
        const member = memberSnap.data() as Member | undefined
        const gym = gymSnap.data() as Omit<Gym, 'id'> | undefined
        return {
          gymId,
          memberId: index.memberId,
          gymName: gym?.name ?? 'Gimnasio',
          gymLogoURL: gym?.logoURL,
          gymTheme: gym?.theme,
          role: (member?.role ?? index.role) as Role,
        } satisfies Membership
      }),
    )
    return memberships
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

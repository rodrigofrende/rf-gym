import { deleteDoc, doc, setDoc } from 'firebase/firestore'
import type { Role } from '@/types'
import { env } from '@/config/env'
import { db } from '@/lib/firebase'
import { paths } from './paths'

export interface GymMembershipIndex {
  memberId: string
  role: Role
}

/** Índice en users/{uid}/gymMemberships/{gymId} para rules de pertenencia al tenant. */
export async function syncGymMembershipIndex(
  uid: string,
  gymId: string,
  data: GymMembershipIndex,
): Promise<void> {
  if (env.demoMode || !uid) return
  await setDoc(doc(db, paths.userGymMembership(uid, gymId)), data)
}

export async function removeGymMembershipIndex(uid: string, gymId: string): Promise<void> {
  if (env.demoMode || !uid) return
  await deleteDoc(doc(db, paths.userGymMembership(uid, gymId)))
}

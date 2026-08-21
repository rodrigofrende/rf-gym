import {
  Timestamp,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  collection,
  type Unsubscribe,
} from 'firebase/firestore'
import { env } from '@/config/env'
import { db } from '@/lib/firebase'
import type { Attendance, MuscleGroup } from '@/types'
import { localDayKey, monthDayKeys } from '@/utils/dates'
import { sanitizeMuscleGroups } from '@/utils/muscles'
import { getPaymentStatus } from '@/utils/payments'
import * as demo from '@/demo/store'
import { getMany } from './firestore'
import { getMember } from './membersService'
import { paths } from './paths'
import { bumpMonthlyAttendance, bumpMonthlyMuscles } from './rankingService'

export type CheckInResult = Attendance & { alreadyCheckedInToday: boolean }

export function attendanceId(dayKey: string, memberId: string): string {
  return `${dayKey}_${memberId}`.replace(/[^a-zA-Z0-9_-]/g, '-')
}

export async function checkInMember(gymId: string, memberId: string): Promise<CheckInResult> {
  if (env.demoMode) return demo.checkInMember(gymId, memberId)

  const member = await getMember(gymId, memberId)
  if (!member) throw new Error('member-not-found')
  if (!member.uid) throw new Error('member-not-claimed')

  const now = Timestamp.now()
  const dayKey = localDayKey(now.toDate())
  const id = attendanceId(dayKey, memberId)
  const ref = doc(db, paths.attendanceRecord(gymId, id))

  const existing = await getDoc(ref)
  if (existing.exists()) {
    return { id: existing.id, ...(existing.data() as Omit<Attendance, 'id'>), alreadyCheckedInToday: true }
  }

  const paymentState = getPaymentStatus(member.paymentDate, member.lastPaymentDate).state
  const created: Omit<Attendance, 'id'> = {
    memberId,
    memberUid: member.uid,
    memberName: member.fullName,
    email: member.email,
    dayKey,
    lastSeenAt: now,
    paymentState,
    memberStatus: member.status,
    checkedInAt: now,
    scanCount: 1,
  }

  await setDoc(ref, created)
  try {
    await bumpMonthlyAttendance(gymId, member, dayKey)
  } catch (rankErr) {
    // Best-effort: el check-in del socio nunca debe fallar por el ranking.
    // Un undercount se repara con "Actualizar" (recompute) del admin.
    console.warn('ranking-bump-failed', rankErr)
  }

  return { id, ...created, alreadyCheckedInToday: false }
}

/**
 * Guarda los músculos del día (opcional). Si es la primera vez que elige ese día,
 * también suma al ranking mensual de músculos (sin tocar el contador de días).
 */
export async function setAttendanceMuscles(
  gymId: string,
  memberId: string,
  dayKey: string,
  muscles: MuscleGroup[],
): Promise<Attendance> {
  const unique = sanitizeMuscleGroups(muscles)
  if (env.demoMode) return demo.setAttendanceMuscles(gymId, memberId, dayKey, unique)

  const member = await getMember(gymId, memberId)
  if (!member) throw new Error('member-not-found')
  if (!member.uid) throw new Error('member-not-claimed')

  const id = attendanceId(dayKey, memberId)
  const ref = doc(db, paths.attendanceRecord(gymId, id))
  const existing = await getDoc(ref)
  if (!existing.exists()) throw new Error('attendance-not-found')

  const prev = { id: existing.id, ...(existing.data() as Omit<Attendance, 'id'>) }
  if (prev.memberUid !== member.uid) throw new Error('attendance-not-owned')

  const hadMuscles = (prev.muscleGroups?.length ?? 0) > 0
  await updateDoc(ref, { muscleGroups: unique })

  if (!hadMuscles && unique.length > 0) {
    try {
      await bumpMonthlyMuscles(gymId, member, dayKey, unique)
    } catch (rankErr) {
      console.warn('muscle-bump-failed', rankErr)
    }
  }

  return { ...prev, muscleGroups: unique }
}

export function listTodayAttendance(gymId: string, dayKey = localDayKey(new Date())) {
  if (env.demoMode) return demo.listTodayAttendance(gymId, dayKey)
  return getMany<Attendance>(
    paths.attendance(gymId),
    where('dayKey', '==', dayKey),
    orderBy('checkedInAt', 'desc'),
  )
}

export async function getMemberAttendance(
  gymId: string,
  memberId: string,
  dayKey = localDayKey(new Date()),
): Promise<Attendance | null> {
  if (env.demoMode) return demo.getMemberAttendance(gymId, memberId, dayKey)
  const snap = await getDoc(doc(db, paths.attendanceRecord(gymId, attendanceId(dayKey, memberId))))
  if (!snap.exists()) return null
  return { id: snap.id, ...(snap.data() as Omit<Attendance, 'id'>) }
}

/**
 * Asistencias de un socio en un mes. Las reglas no permiten al socio LISTAR
 * `attendance` (solo admin), pero sí `get` por id determinístico validando
 * `memberUid == auth.uid`. Por eso resolvemos día a día (≤ un doc por día del mes,
 * hasta hoy) y filtramos los que existen. Cacheado por React Query por mes.
 */
export async function listMemberAttendanceForMonth(
  gymId: string,
  memberId: string,
  year: number,
  monthIndex: number,
): Promise<Attendance[]> {
  const today = localDayKey(new Date())
  const keys = monthDayKeys(year, monthIndex).filter((k) => k <= today)
  const results = await Promise.all(keys.map((k) => getMemberAttendance(gymId, memberId, k)))
  return results.filter((a): a is Attendance => a !== null)
}

export function subscribeTodayAttendance(
  gymId: string,
  dayKey: string,
  onNext: (attendance: Attendance[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const q = query(
    collection(db, paths.attendance(gymId)),
    where('dayKey', '==', dayKey),
    orderBy('checkedInAt', 'desc'),
  )
  return onSnapshot(
    q,
    (snap) => onNext(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Attendance, 'id'>) }))),
    onError,
  )
}

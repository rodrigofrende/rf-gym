import {
  Timestamp,
  doc,
  getDoc,
  increment,
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
import type { Attendance } from '@/types'
import { localDayKey } from '@/utils/dates'
import { getPaymentStatus } from '@/utils/payments'
import * as demo from '@/demo/store'
import { getMany } from './firestore'
import { getMember } from './membersService'
import { paths } from './paths'

export function attendanceId(dayKey: string, memberId: string): string {
  return `${dayKey}_${memberId}`.replace(/[^a-zA-Z0-9_-]/g, '-')
}

export async function checkInMember(gymId: string, memberId: string): Promise<Attendance> {
  if (env.demoMode) return demo.checkInMember(gymId, memberId)

  const member = await getMember(gymId, memberId)
  if (!member) throw new Error('member-not-found')
  if (!member.uid) throw new Error('member-not-claimed')

  const now = Timestamp.now()
  const dayKey = localDayKey(now.toDate())
  const id = attendanceId(dayKey, memberId)
  const ref = doc(db, paths.attendanceRecord(gymId, id))
  const paymentState = getPaymentStatus(member.paymentDate, member.lastPaymentDate).state

  const base = {
    memberId,
    memberUid: member.uid,
    memberName: member.fullName,
    email: member.email,
    dayKey,
    lastSeenAt: now,
    paymentState,
    memberStatus: member.status,
  }

  try {
    await updateDoc(ref, { ...base, scanCount: increment(1) })
  } catch (err) {
    if (!isNotFoundError(err)) throw err
    await setDoc(ref, { ...base, checkedInAt: now, scanCount: 1 })
  }

  const saved = await getDoc(ref)
  return { id: saved.id, ...(saved.data() as Omit<Attendance, 'id'>) }
}

function isNotFoundError(err: unknown) {
  return err && typeof err === 'object' && 'code' in err && err.code === 'not-found'
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

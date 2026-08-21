import { doc, increment, setDoc, updateDoc, where } from 'firebase/firestore'
import type { Attendance, Member, MonthlyAttendance, MuscleGroup } from '@/types'
import { env } from '@/config/env'
import { db } from '@/lib/firebase'
import { displayNameShort } from '@/utils/format'
import { muscleCountsFromAttendanceDays, sanitizeMuscleGroups } from '@/utils/muscles'
import * as demo from '@/demo/store'
import { createBatch, getMany } from './firestore'
import { paths } from './paths'

/** Mismo saneo que attendanceId() para ids determinísticos. */
export function monthlyAttendanceId(monthKey: string, memberId: string): string {
  return `${monthKey}_${memberId}`.replace(/[^a-zA-Z0-9_-]/g, '-')
}

export function listMonthlyLeaderboard(gymId: string, monthKey: string) {
  if (env.demoMode) return demo.listMonthlyLeaderboard(gymId, monthKey)
  // Filtro de un solo campo + orden en el cliente → sin índice compuesto.
  return getMany<MonthlyAttendance>(
    paths.attendanceMonthly(gymId),
    where('monthKey', '==', monthKey),
  )
}

/**
 * Suma 1 al contador mensual del socio. Lo llama checkInMember SOLO en la rama
 * de primer check-in del día, así cada día cuenta una única vez. setDoc(merge)
 * + increment cubre create y update. Las rules validan (para el propio socio):
 * days == 1 en create, days == anterior + 1 en update, `lastDay` creciente y que
 * EXISTA la asistencia real de ese día → no se puede inflar el ranking.
 */
export async function bumpMonthlyAttendance(
  gymId: string,
  member: Member,
  dayKey: string,
): Promise<void> {
  const monthKey = dayKey.slice(0, 7) // 'YYYY-MM-DD' → 'YYYY-MM'
  const ref = doc(db, paths.attendanceMonthlyRecord(gymId, monthlyAttendanceId(monthKey, member.id)))
  await setDoc(
    ref,
    {
      monthKey,
      memberId: member.id,
      memberUid: member.uid,
      displayName: displayNameShort(member.fullName),
      days: increment(1),
      lastDay: dayKey,
    },
    { merge: true },
  )
}

/**
 * Primera vez que el socio elige músculos el mismo día (después del check-in).
 * No toca `days` ni `lastDay` — solo +1 por músculo nuevo.
 */
export async function bumpMonthlyMuscles(
  gymId: string,
  member: Member,
  dayKey: string,
  muscles: MuscleGroup[],
): Promise<void> {
  const unique = sanitizeMuscleGroups(muscles)
  if (unique.length === 0) return
  const monthKey = dayKey.slice(0, 7)
  const ref = doc(db, paths.attendanceMonthlyRecord(gymId, monthlyAttendanceId(monthKey, member.id)))
  const payload: Record<string, unknown> = {}
  for (const muscle of unique) {
    payload[`muscleCounts.${muscle}`] = increment(1)
  }
  await updateDoc(ref, payload)
}

/**
 * Backfill/reparación (solo admin): re-agrega los días distintos por socio desde
 * `attendance` (el admin SÍ puede listar con rango de dayKey) y reescribe los
 * contadores del mes, borrando huérfanos. Siembra el mes vigente post-deploy y
 * corrige undercounts del write best-effort del check-in.
 */
export async function recomputeMonthlyLeaderboard(gymId: string, monthKey: string): Promise<void> {
  if (env.demoMode) return demo.recomputeMonthlyLeaderboard(gymId, monthKey)

  const [records, existing] = await Promise.all([
    getMany<Attendance>(
      paths.attendance(gymId),
      where('dayKey', '>=', `${monthKey}-01`),
      where('dayKey', '<=', `${monthKey}-31`),
    ),
    listMonthlyLeaderboard(gymId, monthKey),
  ])

  const agg = new Map<
    string,
    {
      days: Set<string>
      memberUid: string
      memberName: string
      musclesByDay: Map<string, MuscleGroup[]>
    }
  >()
  for (const a of records) {
    const entry =
      agg.get(a.memberId) ??
      {
        days: new Set<string>(),
        memberUid: a.memberUid,
        memberName: a.memberName,
        musclesByDay: new Map<string, MuscleGroup[]>(),
      }
    entry.days.add(a.dayKey)
    entry.memberUid = a.memberUid
    entry.memberName = a.memberName
    if (a.muscleGroups?.length) {
      entry.musclesByDay.set(a.dayKey, sanitizeMuscleGroups(a.muscleGroups))
    }
    agg.set(a.memberId, entry)
  }

  // Un batch alcanza para gyms reales (límite 500 ops ≈ 500 socios activos/mes).
  const batch = createBatch()
  for (const [memberId, entry] of agg) {
    // lastDay = día más reciente con asistencia (deja el contador listo para que
    // los próximos bumps del socio comparen "hacia adelante" contra este valor).
    const lastDay = [...entry.days].sort().slice(-1)[0]
    const muscleCounts = muscleCountsFromAttendanceDays(entry.musclesByDay.values())
    const payload: Record<string, unknown> = {
      monthKey,
      memberId,
      memberUid: entry.memberUid,
      displayName: displayNameShort(entry.memberName),
      days: entry.days.size,
      lastDay,
    }
    if (Object.keys(muscleCounts).length > 0) {
      payload.muscleCounts = muscleCounts
    }
    batch.set(doc(db, paths.attendanceMonthlyRecord(gymId, monthlyAttendanceId(monthKey, memberId))), payload)
  }
  for (const row of existing) {
    if (!agg.has(row.memberId)) {
      batch.delete(doc(db, paths.attendanceMonthlyRecord(gymId, row.id)))
    }
  }
  await batch.commit()
}

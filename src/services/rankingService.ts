import { doc, increment, setDoc, where } from 'firebase/firestore'
import type { Attendance, Member, MonthlyAttendance } from '@/types'
import { env } from '@/config/env'
import { db } from '@/lib/firebase'
import { isoMonthKey } from '@/utils/dates'
import { displayNameShort } from '@/utils/format'
import * as demo from '@/demo/store'
import { createBatch, getMany } from './firestore'
import { listMembers } from './membersService'
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
 * + increment cubre create y update: las rules validan days == 1 en create y
 * days == anterior + 1 en update del propio socio.
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
    },
    { merge: true },
  )
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

  const agg = new Map<string, { days: Set<string>; memberUid: string; memberName: string }>()
  for (const a of records) {
    const entry = agg.get(a.memberId) ?? { days: new Set(), memberUid: a.memberUid, memberName: a.memberName }
    entry.days.add(a.dayKey)
    entry.memberUid = a.memberUid
    entry.memberName = a.memberName
    agg.set(a.memberId, entry)
  }

  // Un batch alcanza para gyms reales (límite 500 ops ≈ 500 socios activos/mes).
  const batch = createBatch()
  for (const [memberId, entry] of agg) {
    batch.set(doc(db, paths.attendanceMonthlyRecord(gymId, monthlyAttendanceId(monthKey, memberId))), {
      monthKey,
      memberId,
      memberUid: entry.memberUid,
      displayName: displayNameShort(entry.memberName),
      days: entry.days.size,
    })
  }
  for (const row of existing) {
    if (!agg.has(row.memberId)) {
      batch.delete(doc(db, paths.attendanceMonthlyRecord(gymId, row.id)))
    }
  }
  await batch.commit()
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMP — SOLO PRUEBAS, ELIMINAR DESPUÉS DE PROBAR EL RANKING EN TEST 2.
// Siembra contadores fake (mes actual + anterior) con los socios reales del
// gym. Las rules ya permiten al admin escribir cualquier valor, sin cambios.
// NO crea asistencias diarias: "Actualizar" (recompute) de cada mes borra
// estos datos fake y vuelve a la realidad.
// ─────────────────────────────────────────────────────────────────────────────
export async function seedTestLeaderboard(gymId: string): Promise<void> {
  if (env.demoMode) return // el demo ya trae su propio seed
  const members = (await listMembers(gymId)).filter((m) => m.role === 'user')
  if (members.length === 0) throw new Error('El gimnasio no tiene socios para sembrar.')

  const now = new Date()
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const targets = [
    { monthKey: isoMonthKey(now.getFullYear(), now.getMonth()), maxDays: now.getDate() },
    { monthKey: isoMonthKey(prev.getFullYear(), prev.getMonth()), maxDays: 26 },
  ]
  // Días objetivo variados (con empates a propósito), pensados para un mes
  // completo (~26 días útiles); se cicla si hay más socios.
  const pattern = [24, 20, 17, 17, 14, 11, 8, 8, 5, 3]

  const batch = createBatch()
  for (const { monthKey, maxDays } of targets) {
    members.forEach((m, i) => {
      // Se ESCALA al tramo transcurrido del mes (clampear aplastaría todos los
      // valores altos en el mismo número → empates masivos irreales).
      const days = Math.max(1, Math.round((pattern[i % pattern.length] * maxDays) / 26))
      batch.set(doc(db, paths.attendanceMonthlyRecord(gymId, monthlyAttendanceId(monthKey, m.id))), {
        monthKey,
        memberId: m.id,
        memberUid: m.uid,
        displayName: displayNameShort(m.fullName),
        days,
      })
    })
  }
  await batch.commit()
}

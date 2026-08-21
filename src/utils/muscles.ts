import type { MonthlyAttendance, MuscleGroup } from '@/types'
import { MUSCLE_GROUP_OPTIONS } from '@/utils/exercises'

const MUSCLE_SET = new Set<string>(MUSCLE_GROUP_OPTIONS)

/** Filtra y deduplica a valores del enum (máx. 9). */
export function sanitizeMuscleGroups(values: readonly string[]): MuscleGroup[] {
  const out: MuscleGroup[] = []
  const seen = new Set<string>()
  for (const value of values) {
    if (!MUSCLE_SET.has(value) || seen.has(value)) continue
    seen.add(value)
    out.push(value as MuscleGroup)
    if (out.length >= MUSCLE_GROUP_OPTIONS.length) break
  }
  return out
}

/** Músculo con más días; empate → orden del enum. */
export function topMuscle(
  counts: Partial<Record<MuscleGroup, number>> | undefined,
): MuscleGroup | null {
  if (!counts) return null
  let best: MuscleGroup | null = null
  let bestCount = 0
  for (const muscle of MUSCLE_GROUP_OPTIONS) {
    const n = counts[muscle] ?? 0
    if (n > bestCount) {
      best = muscle
      bestCount = n
    }
  }
  return bestCount > 0 ? best : null
}

export type GymMuscleStat = { muscle: MuscleGroup; count: number }

/** Suma anónima del gym a partir de los docs mensuales (0 lecturas extra). */
export function aggregateGymMuscleCounts(rows: MonthlyAttendance[]): GymMuscleStat[] {
  const totals: Partial<Record<MuscleGroup, number>> = {}
  for (const row of rows) {
    const counts = row.muscleCounts
    if (!counts) continue
    for (const muscle of MUSCLE_GROUP_OPTIONS) {
      const n = counts[muscle] ?? 0
      if (n > 0) totals[muscle] = (totals[muscle] ?? 0) + n
    }
  }
  return MUSCLE_GROUP_OPTIONS.map((muscle) => ({ muscle, count: totals[muscle] ?? 0 }))
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count || a.muscle.localeCompare(b.muscle))
}

/** Agrega conteos por músculo desde asistencias del mes (recompute admin). */
export function muscleCountsFromAttendanceDays(
  dayMuscles: Iterable<readonly MuscleGroup[] | undefined>,
): Partial<Record<MuscleGroup, number>> {
  const totals: Partial<Record<MuscleGroup, number>> = {}
  for (const groups of dayMuscles) {
    if (!groups?.length) continue
    const unique = sanitizeMuscleGroups(groups)
    for (const muscle of unique) {
      totals[muscle] = (totals[muscle] ?? 0) + 1
    }
  }
  return totals
}

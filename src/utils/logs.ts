import type { LogSet, Routine, StoredLoadType, WorkoutLog } from '@/types'
import { loadTypeMeta, type SetShape } from './loadTypes'
import { toDate } from './format'

/** Resumen de una sesión registrada (un WorkoutLog) para mostrar y comparar. */
export interface SessionSummary {
  log: WorkoutLog
  date: Date | null
  metric: number // valor "titular" comparable (según el tipo de carga)
  metricLabel: string // ej. "45 kg", "20 reps", "60 s"
  volume: number // trabajo total de la sesión (orientativo)
}

/** Progresión de un ejercicio a lo largo del tiempo. */
export interface ExerciseProgress {
  exerciseName: string
  loadType?: StoredLoadType
  unit: string // 'kg' | 'reps' | 's'
  sessions: SessionSummary[] // ordenadas de la más vieja a la más nueva
  best: number // mejor metric histórico
  first: SessionSummary
  last: SessionSummary
  delta: number // last.metric - first.metric
}

/**
 * Métrica titular de una sesión según la forma de carga: el peso máximo para
 * cargas con peso, las reps máximas para peso corporal y los segundos para
 * isométricos. El volumen es el trabajo total (orientativo).
 */
function sessionMetric(sets: LogSet[], shape: SetShape) {
  const vals = (key: keyof LogSet) => sets.map((s) => s[key] ?? 0)
  switch (shape) {
    case 'reps_only': {
      const value = Math.max(0, ...vals('reps'))
      return {
        value,
        label: `${value} reps`,
        unit: 'reps',
        volume: vals('reps').reduce((a, b) => a + b, 0),
      }
    }
    case 'time_load': {
      const value = Math.max(0, ...vals('seconds'))
      return {
        value,
        label: `${value} s`,
        unit: 's',
        volume: vals('seconds').reduce((a, b) => a + b, 0),
      }
    }
    case 'weight_reps':
    default: {
      const value = Math.max(0, ...vals('weight'))
      const volume = sets.reduce((a, s) => a + (s.weight ?? 0) * (s.reps ?? 0), 0)
      return { value, label: `${value} kg`, unit: 'kg', volume }
    }
  }
}

/** Mapa nombre de ejercicio → tipo de carga, a partir de las rutinas del gym. */
export function loadTypesByExercise(routines: Routine[]): Map<string, StoredLoadType | undefined> {
  return new Map(routines.flatMap((r) => r.exercises.map((e) => [e.name, e.loadType] as const)))
}

/** Agrupa los logs por ejercicio y calcula la progresión de cada uno. */
export function exerciseProgressList(
  logs: WorkoutLog[],
  loadTypeByExercise: Map<string, StoredLoadType | undefined>,
): ExerciseProgress[] {
  const groups = new Map<string, WorkoutLog[]>()
  for (const log of logs) {
    const arr = groups.get(log.exerciseName)
    if (arr) arr.push(log)
    else groups.set(log.exerciseName, [log])
  }

  const result: ExerciseProgress[] = []
  for (const [exerciseName, group] of groups) {
    const loadType = loadTypeByExercise.get(exerciseName)
    const shape = loadTypeMeta(loadType).shape
    const sorted = [...group].sort(
      (a, b) => (toDate(a.date)?.getTime() ?? 0) - (toDate(b.date)?.getTime() ?? 0),
    )
    const sessions: SessionSummary[] = sorted.map((log) => {
      const m = sessionMetric(log.sets, shape)
      return {
        log,
        date: toDate(log.date),
        metric: m.value,
        metricLabel: m.label,
        volume: m.volume,
      }
    })
    const first = sessions[0]
    const last = sessions[sessions.length - 1]
    result.push({
      exerciseName,
      loadType,
      unit: sessionMetric([], shape).unit,
      sessions,
      best: Math.max(0, ...sessions.map((s) => s.metric)),
      first,
      last,
      delta: last.metric - first.metric,
    })
  }

  // Ejercicios con actividad más reciente primero.
  result.sort((a, b) => (b.last.date?.getTime() ?? 0) - (a.last.date?.getTime() ?? 0))
  return result
}

/** Texto del cambio entre el primer y el último registro (ej. "+5 kg", "0 reps"). */
export function formatDelta(delta: number, unit: string): string {
  const sign = delta > 0 ? '+' : ''
  return `${sign}${delta} ${unit}`
}

import { Dumbbell, PersonStanding, Timer, type LucideIcon } from 'lucide-react'
import type { Exercise, LoadType, LogSet, StoredLoadType } from '@/types'

export type SetShape = 'weight_reps' | 'time_load' | 'reps_only'

export interface SetField {
  key: 'weight' | 'reps' | 'seconds'
  label: string
  unit?: string
  optional?: boolean
}

export const SHAPE_FIELDS: Record<SetShape, SetField[]> = {
  weight_reps: [
    { key: 'weight', label: 'Peso', unit: 'kg' },
    { key: 'reps', label: 'Reps' },
  ],
  time_load: [{ key: 'seconds', label: 'Tiempo', unit: 'seg' }],
  reps_only: [{ key: 'reps', label: 'Reps' }],
}

export interface LoadTypeMeta {
  label: string
  shortLabel: string
  icon: LucideIcon
  tooltip: string
  shape: SetShape
}

export const LOAD_TYPES: Record<LoadType, LoadTypeMeta> = {
  weight: {
    label: 'Kg + reps',
    shortLabel: 'Kg',
    icon: Dumbbell,
    tooltip: 'Usá el peso total. Si hay barra, incluí el peso de la barra.',
    shape: 'weight_reps',
  },
  time: {
    label: 'Tiempo / tensión',
    shortLabel: 'Tiempo',
    icon: Timer,
    tooltip: 'Planchas, isométricos y ejercicios medidos en segundos.',
    shape: 'time_load',
  },
  bodyweight: {
    label: 'Peso corporal',
    shortLabel: 'Corporal',
    icon: PersonStanding,
    tooltip: 'Solo repeticiones, sin carga adicional.',
    shape: 'reps_only',
  },
}

export const LOAD_TYPE_OPTIONS = (Object.keys(LOAD_TYPES) as LoadType[]).map((value) => ({
  value,
  label: LOAD_TYPES[value].label,
}))

export function normalizeLoadType(loadType?: StoredLoadType): LoadType {
  switch (loadType) {
    case 'time':
    case 'isometric':
      return 'time'
    case 'bodyweight':
      return 'bodyweight'
    case 'cable':
    case 'barbell':
    case 'unilateral':
    case 'weight':
      return 'weight'
    default:
      return 'weight'
  }
}

export function loadTypeMeta(loadType?: StoredLoadType): LoadTypeMeta {
  return LOAD_TYPES[normalizeLoadType(loadType)]
}

export function formatExerciseVolume(exercise: Exercise): string {
  const meta = loadTypeMeta(exercise.loadType)
  if (meta.shape === 'time_load') {
    return `${exercise.sets} series`
  }
  return `${exercise.sets}×${exercise.reps}`
}

/** 45 → "45s", 60 → "1m", 90 → "1m 30s". null si no hay descanso definido. */
export function formatRest(seconds?: number): string | null {
  if (!seconds || seconds <= 0) return null
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m === 0) return `${s}s`
  if (s === 0) return `${m}m`
  return `${m}m ${s}s`
}

export function formatLogSet(set: LogSet, loadType?: StoredLoadType): string {
  const shape = loadTypeMeta(loadType).shape
  const { weight, reps, seconds } = set
  switch (shape) {
    case 'reps_only':
      return `${reps ?? 0} reps`
    case 'time_load':
      return `${seconds ?? 0}s`
    case 'weight_reps':
    default: {
      const _exhaustive: never | 'weight_reps' = shape
      void _exhaustive
      return `${weight ?? 0}kg×${reps ?? 0}`
    }
  }
}

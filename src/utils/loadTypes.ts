import { Cable, Dumbbell, PersonStanding, Timer, type LucideIcon } from 'lucide-react'
import type { LoadType, LogSet } from '@/types'

export type SetShape = 'weight_reps' | 'perside_reps' | 'reps_load' | 'time_load'

export interface SetField {
  key: 'weight' | 'reps' | 'seconds'
  label: string
  unit?: string
  optional?: boolean
}

/** Campos (inputs) que muestra cada forma de carga, en orden. */
export const SHAPE_FIELDS: Record<SetShape, SetField[]> = {
  weight_reps: [
    { key: 'weight', label: 'Peso', unit: 'kg' },
    { key: 'reps', label: 'Reps' },
  ],
  perside_reps: [
    { key: 'weight', label: 'Peso x lado', unit: 'kg' },
    { key: 'reps', label: 'Reps' },
  ],
  reps_load: [
    { key: 'reps', label: 'Reps' },
    { key: 'weight', label: 'Lastre', unit: 'kg', optional: true },
  ],
  time_load: [
    { key: 'seconds', label: 'Tiempo', unit: 'seg' },
    { key: 'weight', label: 'Peso', unit: 'kg', optional: true },
  ],
}

export interface LoadTypeMeta {
  label: string
  icon: LucideIcon
  tooltip: string
  shape: SetShape
}

export const LOAD_TYPES: Record<LoadType, LoadTypeMeta> = {
  weight: {
    label: 'Peso + reps',
    icon: Dumbbell,
    tooltip: 'Carga total (barra, mancuerna o máquina) más repeticiones.',
    shape: 'weight_reps',
  },
  cable: {
    label: 'Polea',
    icon: Cable,
    tooltip: 'Carga de la placa/polea más repeticiones.',
    shape: 'weight_reps',
  },
  barbell: {
    label: 'Barra (peso por lado)',
    icon: Dumbbell,
    tooltip: 'Indicá el peso por lado del disco (sin contar la barra).',
    shape: 'perside_reps',
  },
  unilateral: {
    label: 'Unilateral (por lado)',
    icon: Dumbbell,
    tooltip: 'Carga por lado/mano; las repeticiones son por lado.',
    shape: 'perside_reps',
  },
  bodyweight: {
    label: 'Peso corporal',
    icon: PersonStanding,
    tooltip: 'Solo repeticiones. Si usás lastre, sumalo en kg.',
    shape: 'reps_load',
  },
  isometric: {
    label: 'Isométrico / tensión',
    icon: Timer,
    tooltip: 'Tiempo de tensión en segundos; el peso es opcional.',
    shape: 'time_load',
  },
}

/** Lista para selects (admin elige el tipo de carga). */
export const LOAD_TYPE_OPTIONS = (Object.keys(LOAD_TYPES) as LoadType[]).map((value) => ({
  value,
  label: LOAD_TYPES[value].label,
}))

export function loadTypeMeta(loadType?: LoadType): LoadTypeMeta {
  return LOAD_TYPES[loadType ?? 'weight']
}

/** Texto compacto de una serie registrada, según el tipo de carga. */
export function formatLogSet(set: LogSet, loadType?: LoadType): string {
  const shape = loadTypeMeta(loadType).shape
  const { weight, reps, seconds } = set
  switch (shape) {
    case 'perside_reps':
      return `${weight ?? 0}kg/lado×${reps ?? 0}`
    case 'reps_load':
      return weight ? `${reps ?? 0} reps +${weight}kg` : `${reps ?? 0} reps`
    case 'time_load':
      return weight ? `${seconds ?? 0}s · ${weight}kg` : `${seconds ?? 0}s`
    case 'weight_reps':
    default:
      return `${weight ?? 0}kg×${reps ?? 0}`
  }
}

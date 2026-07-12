import {
  BatteryCharging,
  BicepsFlexed,
  Dumbbell,
  Flower2,
  Footprints,
  HandFist,
  HeartPulse,
  Move,
  Target,
  Wind,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import type { IconSelectOption } from '@/components/ui/IconSelect'
import type { RoutineIconKey } from '@/types'

export interface RoutineIconMeta {
  label: string
  icon: LucideIcon
  keywords?: string[]
}

export const ROUTINE_ICONS: Record<RoutineIconKey, RoutineIconMeta> = {
  strength: { label: 'Fuerza', icon: Dumbbell, keywords: ['pesas', 'musculación', 'gym'] },
  lower: { label: 'Tren inferior', icon: Footprints, keywords: ['pierna', 'squat', 'prensa'] },
  upper: {
    label: 'Tren superior',
    icon: BicepsFlexed,
    keywords: ['pecho', 'espalda', 'hombro', 'brazo', 'bíceps'],
  },
  cardio: { label: 'Cardio', icon: HeartPulse, keywords: ['correr', 'bici', 'aeróbico'] },
  mobility: { label: 'Movilidad', icon: Move, keywords: ['stretch', 'flexibilidad', 'movimiento'] },
  core: { label: 'Core', icon: Target, keywords: ['abdomen', 'plancha'] },
  functional: {
    label: 'Funcional',
    icon: Zap,
    keywords: ['crossfit', 'hiit', 'wod', 'energía', 'explosivo'],
  },
  boxing: { label: 'Boxeo', icon: HandFist, keywords: ['combate', 'martial', 'kick', 'puño', 'guante'] },
  yoga: { label: 'Yoga', icon: Flower2, keywords: ['pilates', 'mindfulness', 'stretch'] },
  running: {
    label: 'Running',
    icon: Wind,
    keywords: ['carrera', 'trote', 'cinta', 'velocidad', 'sprint'],
  },
  recovery: {
    label: 'Recuperación',
    icon: BatteryCharging,
    keywords: ['descanso', 'rehab', 'foam', 'energía', 'recargar'],
  },
}

export const ROUTINE_ICON_OPTIONS: IconSelectOption<RoutineIconKey>[] = (
  Object.keys(ROUTINE_ICONS) as RoutineIconKey[]
).map((value) => ({ value, ...ROUTINE_ICONS[value] }))

export function routineIconMeta(icon?: RoutineIconKey): RoutineIconMeta {
  return ROUTINE_ICONS[icon ?? 'strength']
}

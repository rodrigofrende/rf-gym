import {
  Activity,
  Dumbbell,
  Flame,
  Flower2,
  Footprints,
  HeartHandshake,
  HeartPulse,
  Route,
  Sparkles,
  Swords,
  Target,
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
  upper: { label: 'Tren superior', icon: Activity, keywords: ['pecho', 'espalda', 'hombro'] },
  cardio: { label: 'Cardio', icon: HeartPulse, keywords: ['correr', 'bici', 'aeróbico'] },
  mobility: { label: 'Movilidad', icon: Sparkles, keywords: ['stretch', 'flexibilidad'] },
  core: { label: 'Core', icon: Target, keywords: ['abdomen', 'plancha'] },
  functional: { label: 'Funcional', icon: Flame, keywords: ['crossfit', 'hiit', 'wod'] },
  boxing: { label: 'Boxeo', icon: Swords, keywords: ['combate', 'martial', 'kick'] },
  yoga: { label: 'Yoga', icon: Flower2, keywords: ['pilates', 'mindfulness', 'stretch'] },
  running: { label: 'Running', icon: Route, keywords: ['carrera', 'trote', 'cinta'] },
  recovery: { label: 'Recuperación', icon: HeartHandshake, keywords: ['descanso', 'rehab', 'foam'] },
}

export const ROUTINE_ICON_OPTIONS: IconSelectOption<RoutineIconKey>[] = (
  Object.keys(ROUTINE_ICONS) as RoutineIconKey[]
).map((value) => ({ value, ...ROUTINE_ICONS[value] }))

export function routineIconMeta(icon?: RoutineIconKey): RoutineIconMeta {
  return ROUTINE_ICONS[icon ?? 'strength']
}

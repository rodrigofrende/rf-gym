import {
  Activity,
  Dumbbell,
  Footprints,
  HeartPulse,
  Sparkles,
  Target,
  type LucideIcon,
} from 'lucide-react'
import type { RoutineIconKey } from '@/types'

export interface RoutineIconMeta {
  label: string
  icon: LucideIcon
}

export const ROUTINE_ICONS: Record<RoutineIconKey, RoutineIconMeta> = {
  strength: { label: 'Fuerza', icon: Dumbbell },
  lower: { label: 'Tren inferior', icon: Footprints },
  upper: { label: 'Tren superior', icon: Activity },
  cardio: { label: 'Cardio', icon: HeartPulse },
  mobility: { label: 'Movilidad', icon: Sparkles },
  core: { label: 'Core', icon: Target },
}

export const ROUTINE_ICON_OPTIONS = (Object.keys(ROUTINE_ICONS) as RoutineIconKey[]).map(
  (value) => ({ value, ...ROUTINE_ICONS[value] }),
)

export function routineIconMeta(icon?: RoutineIconKey): RoutineIconMeta {
  return ROUTINE_ICONS[icon ?? 'strength']
}

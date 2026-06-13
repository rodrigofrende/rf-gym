import {
  Activity,
  Calendar,
  Crown,
  Dumbbell,
  HeartPulse,
  Sparkles,
  Star,
  Tags,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import type { IconSelectOption } from '@/components/ui/IconSelect'
import type { TariffIconKey } from '@/types'

export interface TariffIconMeta {
  label: string
  icon: LucideIcon
  keywords?: string[]
}

export const TARIFF_ICONS: Record<TariffIconKey, TariffIconMeta> = {
  membership: { label: 'Membresía', icon: Tags, keywords: ['plan', 'tarifa', 'cuota'] },
  dumbbell: { label: 'Musculación', icon: Dumbbell, keywords: ['gym', 'pesas', 'sala'] },
  activity: { label: 'Actividad', icon: Activity, keywords: ['entrenamiento', 'clase'] },
  heart: { label: 'Cardio', icon: HeartPulse, keywords: ['salud', 'aeróbico'] },
  users: { label: 'Grupal', icon: Users, keywords: ['clases', 'grupo', 'socios'] },
  calendar: { label: 'Frecuencia', icon: Calendar, keywords: ['semanal', 'días', 'horario'] },
  star: { label: 'Destacado', icon: Star, keywords: ['premium', 'popular'] },
  crown: { label: 'Premium', icon: Crown, keywords: ['vip', 'plus', 'pro'] },
  zap: { label: 'Intensivo', icon: Zap, keywords: ['express', 'rápido', 'hiit'] },
  sparkles: { label: 'Especial', icon: Sparkles, keywords: ['promo', 'nuevo', 'combo'] },
}

export const TARIFF_ICON_OPTIONS: IconSelectOption<TariffIconKey>[] = (
  Object.keys(TARIFF_ICONS) as TariffIconKey[]
).map((value) => ({ value, ...TARIFF_ICONS[value] }))

export function tariffIconMeta(icon?: TariffIconKey): TariffIconMeta {
  return TARIFF_ICONS[icon ?? 'membership']
}

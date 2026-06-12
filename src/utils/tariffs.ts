import type { Tariff } from '@/types'
import { formatCurrency } from './format'

/** "3x/sem" o "Libre" (frecuencia 0). */
export function frequencyLabel(weeklyFrequency: number): string {
  return weeklyFrequency > 0 ? `${weeklyFrequency}x/sem` : 'Libre'
}

/** "Musculación · 3x/sem · $45.000" — para dropdowns y listados. */
export function tariffLabel(t: Tariff): string {
  return `${t.name} · ${frequencyLabel(t.weeklyFrequency)} · ${formatCurrency(t.price)}`
}

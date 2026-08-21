import type { Tariff } from '@/types'
import { formatCurrency } from './format'

/** "3x/sem" o "Libre" (frecuencia 0). Compacto, para dropdowns y badges. */
export function frequencyLabel(weeklyFrequency: number): string {
  return weeklyFrequency > 0 ? `${weeklyFrequency}x/sem` : 'Libre'
}

/** "3 veces por semana" / "1 vez por semana" / "Libre". Para leer de un vistazo. */
export function frequencyLongLabel(weeklyFrequency: number): string {
  if (weeklyFrequency <= 0) return 'Libre'
  if (weeklyFrequency === 1) return '1 vez por semana'
  return `${weeklyFrequency} veces por semana`
}

/** "Musculación · 3x/sem · $45.000" — para dropdowns y listados. */
export function tariffLabel(t: Tariff): string {
  return `${t.name} · ${frequencyLabel(t.weeklyFrequency)} · ${formatCurrency(t.price)}`
}

export type TariffGroup = {
  name: string
  icon?: Tariff['icon']
  items: Tariff[]
}

/** Libre (0) va al final: es el plan más amplio, no "cero veces". */
function frequencySortKey(weeklyFrequency: number): number {
  return weeklyFrequency <= 0 ? 8 : weeklyFrequency
}

function groupKey(name: string): string {
  return name.trim().toLowerCase()
}

/**
 * Agrupa tarifas por nombre de servicio. Un gym piensa "Musculación" y después
 * elige 2x / 3x / libre: eso es una familia, no tres productos sueltos.
 */
export function groupTariffsByName(tariffs: Tariff[]): TariffGroup[] {
  const itemsByKey = new Map<string, Tariff[]>()
  const displayNameByKey = new Map<string, string>()

  for (const tariff of tariffs) {
    const key = groupKey(tariff.name)
    const existing = itemsByKey.get(key)
    if (existing) {
      existing.push(tariff)
    } else {
      itemsByKey.set(key, [tariff])
      displayNameByKey.set(key, tariff.name.trim() || tariff.name)
    }
  }

  const groups: TariffGroup[] = []
  for (const [key, items] of itemsByKey) {
    items.sort(
      (a, b) =>
        frequencySortKey(a.weeklyFrequency) - frequencySortKey(b.weeklyFrequency) ||
        a.price - b.price,
    )
    groups.push({
      name: displayNameByKey.get(key) ?? items[0]?.name ?? '',
      icon: items.find((item) => item.icon)?.icon,
      items,
    })
  }

  groups.sort((a, b) => a.name.localeCompare(b.name, 'es'))
  return groups
}

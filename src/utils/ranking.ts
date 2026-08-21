export type Rankable = {
  days: number
  displayName: string
}

export type Ranked<T extends Rankable> = T & { rank: number }

export type RankGroup<T extends Rankable> = {
  rank: number
  days: number
  items: Ranked<T>[]
}

/** Ranking de competencia: 1, 2, 2, 4. Empatados comparten puesto. */
export function rankByDays<T extends Rankable>(rows: T[]): Ranked<T>[] {
  const sorted = [...rows].sort(
    (a, b) => b.days - a.days || a.displayName.localeCompare(b.displayName, 'es'),
  )
  const out: Ranked<T>[] = []
  for (let i = 0; i < sorted.length; i++) {
    const row = sorted[i]
    const prev = out[i - 1]
    const rank = prev && prev.days === row.days ? prev.rank : i + 1
    out.push({ ...row, rank })
  }
  return out
}

/** Agrupa filas consecutivas del mismo puesto (misma cantidad de días). */
export function groupByRank<T extends Rankable>(rows: Ranked<T>[]): RankGroup<T>[] {
  const groups: RankGroup<T>[] = []
  for (const row of rows) {
    const last = groups[groups.length - 1]
    if (last && last.rank === row.rank) {
      last.items.push(row)
    } else {
      groups.push({ rank: row.rank, days: row.days, items: [row] })
    }
  }
  return groups
}

/**
 * El podio olímpico solo se entiende si hay al menos dos puestos ocupados
 * y cada pedestal entra en 1–2 avatares. Un empate de 6 en el 1° no es un
 * podio: es una lista.
 */
export function podiumIsReadable<T extends Rankable>(
  first: Ranked<T>[],
  second: Ranked<T>[],
  third: Ranked<T>[],
): boolean {
  const occupied = [first, second, third].filter((group) => group.length > 0)
  if (occupied.length < 2) return false
  return occupied.every((group) => group.length <= 2)
}

export function daysLabel(days: number): string {
  return days === 1 ? '1 día' : `${days} días`
}

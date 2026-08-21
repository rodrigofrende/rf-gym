import { describe, expect, it } from 'vitest'
import { groupByRank, podiumIsReadable, rankByDays } from '@/utils/ranking'

function row(displayName: string, days: number) {
  return { displayName, days }
}

describe('rankByDays', () => {
  it('comparte puesto cuando hay empate y salta el siguiente', () => {
    const ranked = rankByDays([
      row('B', 2),
      row('A', 2),
      row('C', 1),
    ])
    expect(ranked.map((r) => ({ name: r.displayName, rank: r.rank }))).toEqual([
      { name: 'A', rank: 1 },
      { name: 'B', rank: 1 },
      { name: 'C', rank: 3 },
    ])
  })
})

describe('groupByRank', () => {
  it('junta a los empatados en un solo grupo', () => {
    const groups = groupByRank(rankByDays([row('A', 2), row('B', 2), row('C', 1)]))
    expect(groups).toHaveLength(2)
    expect(groups[0]?.items).toHaveLength(2)
    expect(groups[0]?.rank).toBe(1)
    expect(groups[1]?.rank).toBe(3)
  })
})

describe('podiumIsReadable', () => {
  it('no muestra podio si todos empatan en el primer puesto', () => {
    const first = rankByDays([row('A', 2), row('B', 2), row('C', 2), row('D', 2)])
    expect(podiumIsReadable(first, [], [])).toBe(false)
  })

  it('muestra podio con 1°, 2° y 3° claros', () => {
    const ranked = rankByDays([row('A', 5), row('B', 4), row('C', 3)])
    expect(podiumIsReadable([ranked[0]!], [ranked[1]!], [ranked[2]!])).toBe(true)
  })
})

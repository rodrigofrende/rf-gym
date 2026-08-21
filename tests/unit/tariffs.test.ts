import { describe, expect, it } from 'vitest'
import type { Tariff } from '@/types'
import { frequencyLongLabel, groupTariffsByName } from '@/utils/tariffs'

function tariff(partial: Partial<Tariff> & Pick<Tariff, 'id' | 'name'>): Tariff {
  return {
    weeklyFrequency: 3,
    price: 30000,
    active: true,
    ...partial,
  }
}

describe('frequencyLongLabel', () => {
  it('habla como el dueño del gym, no como un badge', () => {
    expect(frequencyLongLabel(0)).toBe('Libre')
    expect(frequencyLongLabel(1)).toBe('1 vez por semana')
    expect(frequencyLongLabel(3)).toBe('3 veces por semana')
  })
})

describe('groupTariffsByName', () => {
  it('junta variantes del mismo servicio y deja el libre al final', () => {
    const groups = groupTariffsByName([
      tariff({ id: 'libre', name: 'Musculación', weeklyFrequency: 0, price: 40000 }),
      tariff({ id: 'func', name: 'Funcional', weeklyFrequency: 2, price: 22000 }),
      tariff({ id: 'tres', name: 'Musculación', weeklyFrequency: 3, price: 30000 }),
      tariff({ id: 'dos', name: 'musculación', weeklyFrequency: 2, price: 25000 }),
    ])

    expect(groups.map((g) => g.name)).toEqual(['Funcional', 'Musculación'])
    expect(groups[1]?.items.map((t) => t.id)).toEqual(['dos', 'tres', 'libre'])
  })

  it('devuelve vacío si no hay tarifas', () => {
    expect(groupTariffsByName([])).toEqual([])
  })
})

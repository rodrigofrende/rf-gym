import { describe, expect, it } from 'vitest'
import type { MonthlyAttendance } from '@/types'
import {
  aggregateGymMuscleCounts,
  muscleCountsFromAttendanceDays,
  sanitizeMuscleGroups,
  topMuscle,
} from '@/utils/muscles'

describe('sanitizeMuscleGroups', () => {
  it('deduplica y descarta valores inválidos', () => {
    expect(sanitizeMuscleGroups(['back', 'back', 'nope', 'arms'])).toEqual(['back', 'arms'])
  })
})

describe('topMuscle', () => {
  it('elige el de mayor conteo y empata por orden del enum', () => {
    expect(topMuscle({ arms: 3, back: 5 })).toBe('back')
    expect(topMuscle({ arms: 5, back: 5 })).toBe('back')
    expect(topMuscle({})).toBe(null)
    expect(topMuscle(undefined)).toBe(null)
  })
})

describe('aggregateGymMuscleCounts', () => {
  it('suma anónima del gym', () => {
    const rows = [
      { muscleCounts: { back: 2, arms: 1 } },
      { muscleCounts: { back: 1, chest: 4 } },
      {},
    ] as MonthlyAttendance[]
    expect(aggregateGymMuscleCounts(rows)).toEqual([
      { muscle: 'chest', count: 4 },
      { muscle: 'back', count: 3 },
      { muscle: 'arms', count: 1 },
    ])
  })
})

describe('muscleCountsFromAttendanceDays', () => {
  it('cuenta un día por músculo aunque el día liste varios', () => {
    expect(
      muscleCountsFromAttendanceDays([['back', 'arms'], ['back'], undefined, ['arms', 'arms']]),
    ).toEqual({ back: 2, arms: 2 })
  })
})

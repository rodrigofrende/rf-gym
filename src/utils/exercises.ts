import {
  Activity,
  Dumbbell,
  HeartPulse,
  Move,
  PersonStanding,
  Shield,
  Sparkles,
  Target,
  Timer,
  type LucideIcon,
} from 'lucide-react'
import { createElement } from 'react'
import type { ExerciseCategory, ExerciseDefinition, MuscleGroup } from '@/types'

export const MUSCLE_GROUP_OPTIONS = [
  'chest',
  'back',
  'legs',
  'glutes',
  'shoulders',
  'arms',
  'core',
  'fullBody',
  'cardio',
] as const satisfies readonly MuscleGroup[]

export const EXERCISE_CATEGORY_OPTIONS = [
  'strength',
  'hypertrophy',
  'cardio',
  'mobility',
  'functional',
  'core',
] as const satisfies readonly ExerciseCategory[]

export function muscleGroupLabel(value: MuscleGroup): string {
  switch (value) {
    case 'chest':
      return 'Pecho'
    case 'back':
      return 'Espalda'
    case 'legs':
      return 'Piernas'
    case 'glutes':
      return 'Glúteos'
    case 'shoulders':
      return 'Hombros'
    case 'arms':
      return 'Brazos'
    case 'core':
      return 'Core'
    case 'fullBody':
      return 'Full body'
    case 'cardio':
      return 'Cardio'
    default: {
      const exhaustive: never = value
      return exhaustive
    }
  }
}

export function categoryLabel(value: ExerciseCategory): string {
  switch (value) {
    case 'strength':
      return 'Fuerza'
    case 'hypertrophy':
      return 'Hipertrofia'
    case 'cardio':
      return 'Cardio'
    case 'mobility':
      return 'Movilidad'
    case 'functional':
      return 'Funcional'
    case 'core':
      return 'Core'
    default: {
      const exhaustive: never = value
      return exhaustive
    }
  }
}

export function categoryIcon(value: ExerciseCategory): LucideIcon {
  switch (value) {
    case 'strength':
      return Dumbbell
    case 'hypertrophy':
      return Target
    case 'cardio':
      return HeartPulse
    case 'mobility':
      return Move
    case 'functional':
      return Activity
    case 'core':
      return Shield
    default: {
      const exhaustive: never = value
      return exhaustive
    }
  }
}

export function ExerciseCategoryIcon({
  category,
  className,
}: {
  category: ExerciseCategory
  className?: string
}) {
  switch (category) {
    case 'strength':
      return createElement(Dumbbell, { className })
    case 'hypertrophy':
      return createElement(Target, { className })
    case 'cardio':
      return createElement(HeartPulse, { className })
    case 'mobility':
      return createElement(Move, { className })
    case 'functional':
      return createElement(Activity, { className })
    case 'core':
      return createElement(Shield, { className })
    default: {
      const exhaustive: never = category
      return exhaustive
    }
  }
}

export function muscleGroupIcon(value: MuscleGroup): LucideIcon {
  switch (value) {
    case 'chest':
      return Shield
    case 'back':
      return PersonStanding
    case 'legs':
      return Activity
    case 'glutes':
      return Sparkles
    case 'shoulders':
      return Target
    case 'arms':
      return Dumbbell
    case 'core':
      return Shield
    case 'fullBody':
      return PersonStanding
    case 'cardio':
      return Timer
    default: {
      const exhaustive: never = value
      return exhaustive
    }
  }
}

export function filterExercises(
  exercises: ExerciseDefinition[],
  filters: {
    search?: string
    category?: ExerciseCategory | 'all'
    muscleGroup?: MuscleGroup | 'all'
  },
) {
  const search = filters.search?.trim().toLowerCase() ?? ''
  return exercises.filter((exercise) => {
    const matchesSearch =
      !search ||
      exercise.name.toLowerCase().includes(search) ||
      exercise.description?.toLowerCase().includes(search)
    const matchesCategory =
      !filters.category || filters.category === 'all' || exercise.category === filters.category
    const matchesMuscle =
      !filters.muscleGroup ||
      filters.muscleGroup === 'all' ||
      exercise.muscleGroups.includes(filters.muscleGroup)

    return matchesSearch && matchesCategory && matchesMuscle
  })
}

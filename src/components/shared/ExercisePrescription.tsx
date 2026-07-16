import { BicepsFlexed, Dumbbell, Gauge, Hourglass, Repeat } from 'lucide-react'
import type { Exercise } from '@/types'
import { Badge } from '@/components/ui'
import { cn } from '@/utils/cn'
import { formatRest, loadTypeMeta } from '@/utils/loadTypes'

interface ExercisePrescriptionProps {
  exercise: Pick<Exercise, 'sets' | 'reps' | 'intensity' | 'weight' | 'loadType' | 'restSec'>
  className?: string
}

/**
 * Prescripción de un ejercicio como chips de color, legible de un vistazo.
 * Compartido entre la vista del alumno y las vistas de admin (rutinas/builder)
 * para mantener el mismo look & feel. Los campos ausentes omiten su chip.
 */
export function ExercisePrescription({ exercise, className }: ExercisePrescriptionProps) {
  const meta = loadTypeMeta(exercise.loadType)
  const LoadIcon = meta.icon
  const rest = formatRest(exercise.restSec)

  return (
    <span className={cn('flex flex-wrap items-center gap-1.5', className)}>
      <Badge tone="brand">
        <Repeat className="mr-1 size-3.5" aria-hidden />
        {exercise.sets} {exercise.sets === 1 ? 'serie' : 'series'}
      </Badge>
      {meta.shape !== 'time_load' && !!exercise.reps && (
        <Badge tone="brand">
          <BicepsFlexed className="mr-1 size-3.5" aria-hidden />
          {exercise.reps} {exercise.reps === 1 ? 'rep' : 'reps'}
        </Badge>
      )}
      {meta.shape !== 'weight_reps' && (
        <Badge tone="neutral">
          <LoadIcon className="mr-1 size-3.5" aria-hidden />
          {meta.shortLabel}
        </Badge>
      )}
      {exercise.weight && (
        <Badge tone="sky">
          <Dumbbell className="mr-1 size-3.5" aria-hidden />
          {exercise.weight}
        </Badge>
      )}
      {rest && (
        <Badge tone="amber">
          <Hourglass className="mr-1 size-3.5" aria-hidden />
          {rest} descanso
        </Badge>
      )}
      {exercise.intensity && (
        <Badge tone="violet">
          <Gauge className="mr-1 size-3.5" aria-hidden />
          {exercise.intensity}
        </Badge>
      )}
    </span>
  )
}

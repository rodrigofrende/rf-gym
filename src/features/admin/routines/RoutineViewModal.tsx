import type { Exercise, Routine } from '@/types'
import { Badge, Button, Modal } from '@/components/ui'
import { formatExerciseVolume, loadTypeMeta } from '@/utils/loadTypes'
import { routineIconMeta } from '@/utils/routineIcons'

function ExerciseDetail({ exercise, index }: { exercise: Exercise; index: number }) {
  const meta = loadTypeMeta(exercise.loadType)
  const LoadIcon = meta.icon

  return (
    <li className="rounded-xl border border-zinc-100 bg-zinc-50/60 p-4">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white text-brand-600 shadow-sm ring-1 ring-zinc-100">
          <LoadIcon className="size-4" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-zinc-400">Ejercicio {index + 1}</span>
            <h4 className="font-semibold text-zinc-900">{exercise.name}</h4>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge tone="brand">{formatExerciseVolume(exercise)}</Badge>
            <Badge tone="neutral">{meta.label}</Badge>
            {exercise.restSec ? <Badge tone="neutral">{exercise.restSec}s descanso</Badge> : null}
            {exercise.intensity ? <Badge tone="neutral">{exercise.intensity}</Badge> : null}
            {exercise.weight ? <Badge tone="neutral">{exercise.weight}</Badge> : null}
          </div>
          {exercise.notes ? (
            <p className="mt-2 text-sm text-zinc-500">{exercise.notes}</p>
          ) : null}
        </div>
      </div>
    </li>
  )
}

export function RoutineViewModal({
  open,
  onClose,
  routine,
  onEdit,
}: {
  open: boolean
  onClose: () => void
  routine: Routine | null
  onEdit?: (routine: Routine) => void
}) {
  if (!routine) return null

  const { icon: RoutineIcon } = routineIconMeta(routine.icon)

  return (
    <Modal open={open} onClose={onClose} title={routine.name} size="lg">
      <div className="space-y-5">
        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <RoutineIcon className="size-6" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            {routine.description ? (
              <p className="text-sm text-zinc-600">{routine.description}</p>
            ) : (
              <p className="text-sm text-zinc-400">Sin descripción</p>
            )}
            <p className="mt-2 text-xs text-zinc-400">
              {routine.exercises.length}{' '}
              {routine.exercises.length === 1 ? 'ejercicio' : 'ejercicios'}
            </p>
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold text-zinc-700">Ejercicios</h3>
          <ol className="space-y-2">
            {routine.exercises.map((exercise, index) => (
              <ExerciseDetail key={`${exercise.name}-${index}`} exercise={exercise} index={index} />
            ))}
          </ol>
        </div>

        <div className="flex justify-end gap-2 border-t border-zinc-100 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
          {onEdit ? (
            <Button type="button" onClick={() => onEdit(routine)}>
              Editar rutina
            </Button>
          ) : null}
        </div>
      </div>
    </Modal>
  )
}

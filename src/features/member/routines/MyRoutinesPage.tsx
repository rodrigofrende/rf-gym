import { useMemo, useState } from 'react'
import { Timestamp } from 'firebase/firestore'
import { ClipboardList, History, Dumbbell } from 'lucide-react'
import type { Exercise, LogSet, Routine, WorkoutLog } from '@/types'
import { useTenant } from '@/providers/TenantProvider'
import { useToast } from '@/providers/ToastProvider'
import { useCreateLog, useLogs } from '@/hooks/useLogs'
import { useMemberAssignments, useRoutines } from '@/hooks/useRoutines'
import { AppLayout } from '@/components/layout/AppLayout'
import { Badge, Button, Card, CardBody, CardHeader, EmptyState, FullPageSpinner } from '@/components/ui'
import { formatDate } from '@/utils/format'
import { LogExerciseModal } from './LogExerciseModal'

export function MyRoutinesPage() {
  const { activeGymId, activeMembership } = useTenant()
  const gymId = activeGymId as string
  const memberId = activeMembership?.memberId as string
  const { notify } = useToast()

  const { data: assignments = [], isLoading: loadingA } = useMemberAssignments(gymId, memberId)
  const { data: routines = [], isLoading: loadingR } = useRoutines(gymId)
  const { data: logs = [] } = useLogs(gymId, memberId)
  const createLog = useCreateLog(gymId, memberId)

  const [active, setActive] = useState<{ routine: Routine; exercise: Exercise } | null>(null)

  const myRoutines = useMemo(() => {
    const ids = new Set(assignments.map((a) => a.routineId))
    return routines.filter((r) => ids.has(r.id))
  }, [assignments, routines])

  // Último registro por nombre de ejercicio (los logs vienen ordenados por fecha desc).
  const lastByExercise = useMemo(() => {
    const map = new Map<string, WorkoutLog>()
    for (const log of logs) if (!map.has(log.exerciseName)) map.set(log.exerciseName, log)
    return map
  }, [logs])

  const saveLog = async (sets: LogSet[]) => {
    if (!active || sets.length === 0) {
      setActive(null)
      return
    }
    try {
      await createLog.mutateAsync({
        routineId: active.routine.id,
        exerciseName: active.exercise.name,
        date: Timestamp.now(),
        sets,
      })
      notify('Carga registrada', 'success')
      setActive(null)
    } catch {
      notify('No se pudo registrar la carga', 'error')
    }
  }

  if (loadingA || loadingR) {
    return (
      <AppLayout title="Mis rutinas">
        <FullPageSpinner />
      </AppLayout>
    )
  }

  return (
    <AppLayout title="Mis rutinas">
      {myRoutines.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Todavía no tenés rutinas"
          description="Cuando tu entrenador te asigne una rutina, va a aparecer acá."
        />
      ) : (
        <div className="space-y-5">
          {myRoutines.map((routine) => (
            <Card key={routine.id}>
              <CardHeader
                title={routine.name}
                subtitle={routine.description}
                action={<Badge tone="brand">{routine.exercises.length} ejercicios</Badge>}
              />
              <CardBody className="space-y-2">
                {routine.exercises.map((ex, i) => {
                  const last = lastByExercise.get(ex.name)
                  return (
                    <div
                      key={`${ex.name}-${i}`}
                      className="flex flex-col gap-2 rounded-lg border border-slate-100 p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-start gap-3">
                        <Dumbbell className="mt-0.5 size-5 text-brand-500" />
                        <div>
                          <p className="font-medium text-slate-900">{ex.name}</p>
                          <p className="text-sm text-slate-500">
                            {ex.sets} series × {ex.reps} reps
                            {ex.intensity ? ` · ${ex.intensity}` : ''}
                            {ex.restSec ? ` · ${ex.restSec}s descanso` : ''}
                          </p>
                          {last && (
                            <p className="mt-1 flex flex-wrap items-center gap-1 text-xs text-slate-400">
                              <History className="size-3.5" /> Último ({formatDate(last.date)}):
                              {last.sets.map((s, idx) => (
                                <span key={idx} className="font-medium text-slate-600">
                                  {s.weight}kg×{s.reps}
                                  {idx < last.sets.length - 1 ? ',' : ''}
                                </span>
                              ))}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setActive({ routine, exercise: ex })}
                      >
                        Registrar carga
                      </Button>
                    </div>
                  )
                })}
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {active && (
        <LogExerciseModal
          key={`${active.routine.id}-${active.exercise.name}`}
          open
          onClose={() => setActive(null)}
          exercise={active.exercise}
          defaultSets={active.exercise.sets}
          onSave={saveLog}
          saving={createLog.isPending}
        />
      )}
    </AppLayout>
  )
}

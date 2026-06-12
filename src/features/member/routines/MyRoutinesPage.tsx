import { useMemo, useState } from 'react'
import { Timestamp } from 'firebase/firestore'
import { ChevronDown, ClipboardList, History, Dumbbell } from 'lucide-react'
import type { Exercise, LogSet, Routine, WorkoutLog } from '@/types'
import { useTenant } from '@/providers/TenantProvider'
import { useToast } from '@/providers/ToastProvider'
import { useCreateLog, useLogs } from '@/hooks/useLogs'
import { useMemberAssignments, useRoutines } from '@/hooks/useRoutines'
import { AppLayout } from '@/components/layout/AppLayout'
import { Badge, Button, Card, EmptyState, FullPageSpinner } from '@/components/ui'
import { cn } from '@/utils/cn'
import { formatDate } from '@/utils/format'
import { formatLogSet, loadTypeMeta } from '@/utils/loadTypes'
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
  // Rutinas colapsables: arrancan cerradas para ocupar poco (clave en mobile).
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set())
  const toggle = (id: string) =>
    setOpenIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

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
        <div className="space-y-3">
          {myRoutines.map((routine) => {
            const isOpen = openIds.has(routine.id)
            return (
              <Card key={routine.id} className="overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggle(routine.id)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left sm:px-5"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <Dumbbell className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-900">{routine.name}</p>
                    {routine.description && (
                      <p className="truncate text-xs text-slate-500">{routine.description}</p>
                    )}
                  </div>
                  <Badge tone="brand">{routine.exercises.length} ej.</Badge>
                  <ChevronDown
                    className={cn(
                      'size-5 shrink-0 text-slate-400 transition-transform',
                      isOpen && 'rotate-180',
                    )}
                  />
                </button>

                {isOpen && (
                  <div className="space-y-2 border-t border-slate-100 px-4 pb-4 pt-3 sm:px-5">
                    {routine.exercises.map((ex, i) => {
                      const last = lastByExercise.get(ex.name)
                      return (
                        <div
                          key={`${ex.name}-${i}`}
                          className="flex flex-col gap-2 rounded-lg border border-slate-100 p-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="flex items-start gap-3">
                            <Dumbbell className="mt-0.5 size-5 shrink-0 text-brand-500" />
                            <div className="min-w-0">
                              <p className="font-medium text-slate-900">{ex.name}</p>
                              <p className="text-sm text-slate-500">
                                {ex.sets} series × {ex.reps} reps
                                {ex.loadType && ex.loadType !== 'weight'
                                  ? ` · ${loadTypeMeta(ex.loadType).label}`
                                  : ''}
                                {ex.intensity ? ` · ${ex.intensity}` : ''}
                                {ex.weight ? ` · ${ex.weight}` : ''}
                                {ex.restSec ? ` · ${ex.restSec}s descanso` : ''}
                              </p>
                              {last && (
                                <p className="mt-1 flex flex-wrap items-center gap-1 text-xs text-slate-400">
                                  <History className="size-3.5" /> Último ({formatDate(last.date)}):
                                  {last.sets.map((s, idx) => (
                                    <span key={idx} className="font-medium text-slate-600">
                                      {formatLogSet(s, ex.loadType)}
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
                            fullWidth
                            className="sm:w-auto"
                            onClick={() => setActive({ routine, exercise: ex })}
                          >
                            Registrar carga
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </Card>
            )
          })}
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

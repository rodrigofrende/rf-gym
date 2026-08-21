import { useMemo, useState } from 'react'
import { Timestamp } from 'firebase/firestore'
import { ChevronDown, ClipboardList, History, Lock, Pencil, Plus } from 'lucide-react'
import type { Exercise, ExerciseDefinition, LogSet, MuscleGroup, Routine, WorkoutLog } from '@/types'
import { useTenant } from '@/providers/TenantProvider'
import { useToast } from '@/providers/ToastProvider'
import { useLogs, useUpsertDailyLog } from '@/hooks/useLogs'
import { useMemberAttendance } from '@/hooks/useAttendance'
import { useToastAction } from '@/hooks/useToastAction'
import { useMemberAssignments, useRoutines } from '@/hooks/useRoutines'
import { useExercises } from '@/hooks/useExercises'
import { useGym } from '@/hooks/useGym'
import { usePlans } from '@/hooks/usePlans'
import { AppLayout } from '@/components/layout/AppLayout'
import { Badge, Card, EmptyState, FullPageSpinner, Text, Tooltip } from '@/components/ui'
import { CoachNote } from '@/components/shared/CoachNote'
import { ExercisePrescription } from '@/components/shared/ExercisePrescription'
import { cn } from '@/utils/cn'
import { formatDate } from '@/utils/format'
import { parseDateInput, todayDateInput } from '@/utils/dates'
import { formatLogSet, loadTypeMeta } from '@/utils/loadTypes'
import { muscleGroupLabel } from '@/utils/exercises'
import { routineIconMeta } from '@/utils/routineIcons'
import { dailyLogId, exerciseLogKey } from '@/utils/logs'
import { canMemberLog } from '@/utils/plans'
import { LogExerciseModal } from './LogExerciseModal'

function exerciseMatchesMuscles(ex: Exercise, muscles: MuscleGroup[]): boolean {
  if (!ex.muscleGroups?.length) return false
  return ex.muscleGroups.some((m) => muscles.includes(m))
}

function definitionToExercise(def: ExerciseDefinition): Exercise {
  return {
    exerciseId: def.id,
    name: def.name,
    sets: def.defaultSets ?? 3,
    reps: def.defaultReps ?? 10,
    loadType: def.loadType,
    restSec: def.defaultRestSec ?? 60,
    notes: def.description,
    muscleGroups: def.muscleGroups,
  }
}

export function MyRoutinesPage() {
  const { activeGymId, activeMembership } = useTenant()
  const gymId = activeGymId as string
  const memberId = activeMembership?.memberId as string
  const { notify } = useToast()
  const run = useToastAction()

  const { data: assignments = [], isLoading: loadingA } = useMemberAssignments(gymId, memberId)
  const { data: routines = [], isLoading: loadingR } = useRoutines(gymId)
  const { data: catalog = [], isLoading: loadingCatalog } = useExercises(gymId)
  const { data: logs = [] } = useLogs(gymId, memberId)
  const dayKey = todayDateInput()
  const { data: todayAttendance, isLoading: loadingAttendance } = useMemberAttendance(gymId, memberId, dayKey)
  const { data: gym } = useGym(gymId)
  const { data: plans = [] } = usePlans()
  const upsertDailyLog = useUpsertDailyLog(gymId, memberId)

  const plan = plans.find((p) => p.id === gym?.subscription?.planId)
  const logGate = canMemberLog(plan, logs.length)

  const [active, setActive] = useState<{
    routine: Routine
    exercise: Exercise
    existingLog?: WorkoutLog
  } | null>(null)
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set())
  const toggle = (id: string) =>
    setOpenIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const todayMuscles = todayAttendance?.muscleGroups ?? []
  const filterByMuscles = todayMuscles.length > 0

  const myRoutines = useMemo(() => {
    const ids = new Set(assignments.map((a) => a.routineId))
    return routines.filter((r) => ids.has(r.id))
  }, [assignments, routines])

  const displayRoutines = useMemo(() => {
    if (!filterByMuscles) {
      return {
        mode: 'full' as const,
        rows: myRoutines.map((r) => ({ routine: r, exercises: r.exercises })),
        catalogFallback: [] as Exercise[],
      }
    }

    const rows = myRoutines.map((routine) => ({
      routine,
      exercises: routine.exercises.filter((ex) => exerciseMatchesMuscles(ex, todayMuscles)),
    }))
    const anyMatched = rows.some((row) => row.exercises.length > 0)
    if (anyMatched) {
      return { mode: 'filtered' as const, rows: rows.filter((row) => row.exercises.length > 0), catalogFallback: [] }
    }

    const catalogFallback = catalog
      .filter((def) => def.muscleGroups.some((m) => todayMuscles.includes(m)))
      .map(definitionToExercise)
    return { mode: 'catalog' as const, rows: [], catalogFallback }
  }, [catalog, filterByMuscles, myRoutines, todayMuscles])

  const lastByExercise = useMemo(() => {
    const map = new Map<string, WorkoutLog>()
    for (const log of logs) if (!map.has(log.exerciseName)) map.set(log.exerciseName, log)
    return map
  }, [logs])

  const dailyLogById = useMemo(() => {
    const map = new Map<string, WorkoutLog>()
    for (const log of logs) map.set(log.id, log)
    return map
  }, [logs])

  const hasCheckedInToday = !!todayAttendance

  const saveLog = async (sets: LogSet[]) => {
    if (!active || sets.length === 0) {
      setActive(null)
      return
    }
    if (!hasCheckedInToday) {
      notify('Escaneá el QR del gimnasio para habilitar las cargas de hoy', 'error')
      setActive(null)
      return
    }
    if (!logGate.allowed && !active.existingLog) {
      notify(logGate.reason ?? 'No podés registrar cargas con tu plan actual', 'error')
      setActive(null)
      return
    }
    const exerciseKey = exerciseLogKey(active.exercise.name, active.exercise.exerciseId)
    const ok = await run(
      () =>
        upsertDailyLog.mutateAsync({
          routineId: active.routine.id,
          exerciseKey,
          exerciseName: active.exercise.name,
          dayKey,
          trainingDate: active.existingLog?.trainingDate ?? Timestamp.fromDate(parseDateInput(dayKey)),
          date: active.existingLog?.date ?? Timestamp.now(),
          sets,
        }),
      {
        success: active.existingLog ? 'Carga actualizada' : 'Carga registrada',
        error: 'No se pudo guardar la carga',
      },
    )
    if (ok) setActive(null)
  }

  if (loadingA || loadingR || loadingAttendance || (filterByMuscles && loadingCatalog)) {
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
          {!logGate.allowed && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
              <Lock className="mt-0.5 size-4 shrink-0" />
              <p>{logGate.reason}</p>
            </div>
          )}
          {!hasCheckedInToday && (
            <div className="flex items-start gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2.5 text-sm text-brand-800">
              <Lock className="mt-0.5 size-4 shrink-0" />
              <p>Escaneá el QR del gimnasio al llegar para habilitar las cargas de hoy.</p>
            </div>
          )}
          {filterByMuscles && (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-700">
              Hoy enfocás:{' '}
              <span className="font-medium text-zinc-900">
                {todayMuscles.map(muscleGroupLabel).join(' · ')}
              </span>
              . Mostramos ejercicios de esos grupos.
            </div>
          )}
          {displayRoutines.mode === 'catalog' ? (
            <Card className="overflow-hidden">
              <div className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3.5 sm:px-5">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <ClipboardList className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <Text variant="listItem">Sugerencias del catálogo</Text>
                  <p className="text-xs text-zinc-500">
                    Tus rutinas no tienen ejercicios de {todayMuscles.map(muscleGroupLabel).join(' · ')}.
                  </p>
                </div>
                <Badge tone="brand">{displayRoutines.catalogFallback.length} ej.</Badge>
              </div>
              <div className="space-y-2 px-4 pb-4 pt-3 sm:px-5">
                {displayRoutines.catalogFallback.length === 0 ? (
                  <p className="py-2 text-sm text-zinc-500">No hay ejercicios para estos músculos en el catálogo.</p>
                ) : (
                  <div className="divide-y divide-zinc-200/70">
                    {displayRoutines.catalogFallback.map((ex, i) => {
                      const last = lastByExercise.get(ex.name)
                      const routineStub: Routine = {
                        id: 'catalog-today',
                        name: 'Catálogo',
                        createdBy: '',
                        exercises: displayRoutines.catalogFallback,
                      }
                      const exerciseKey = exerciseLogKey(ex.name, ex.exerciseId)
                      const todayLog = dailyLogById.get(dailyLogId(dayKey, routineStub.id, exerciseKey))
                      const meta = loadTypeMeta(ex.loadType)
                      const LoadIcon = meta.icon
                      const logState: LogActionState =
                        !hasCheckedInToday || (!logGate.allowed && !todayLog)
                          ? 'locked'
                          : todayLog
                            ? 'edit'
                            : 'register'
                      const lockedReason = !hasCheckedInToday
                        ? 'Escaneá el QR del gimnasio para habilitar la carga de hoy'
                        : logGate.reason
                      return (
                        <div key={`${ex.name}-${i}`} className="py-3 first:pt-1 last:pb-0">
                          <div className="flex items-center gap-3">
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                              <LoadIcon className="size-4" aria-hidden />
                            </div>
                            <p className="min-w-0 flex-1 font-medium text-zinc-900">{ex.name}</p>
                            <LogActionButton
                              state={logState}
                              exerciseName={ex.name}
                              reason={lockedReason}
                              onClick={() =>
                                setActive({ routine: routineStub, exercise: ex, existingLog: todayLog })
                              }
                            />
                          </div>
                          <div className="mt-2 space-y-1.5">
                            <ExercisePrescription exercise={ex} />
                            {ex.notes && <CoachNote>{ex.notes}</CoachNote>}
                            {last && (
                              <p className="flex flex-wrap items-center gap-1 text-xs text-zinc-400">
                                <History className="size-3.5" /> Último ({formatDate(last.date)}):
                                {last.sets.map((s, idx) => (
                                  <span key={idx} className="font-medium text-zinc-600">
                                    {formatLogSet(s, ex.loadType)}
                                    {idx < last.sets.length - 1 ? ',' : ''}
                                  </span>
                                ))}
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </Card>
          ) : (
            displayRoutines.rows.map(({ routine, exercises }) => {
              const isOpen = openIds.has(routine.id)
              const { icon: RoutineIcon } = routineIconMeta(routine.icon)
              return (
                <Card key={routine.id} className="overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggle(routine.id)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center gap-3 px-4 py-3.5 text-left sm:px-5"
                  >
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                      <RoutineIcon className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <Text variant="listItem" className="truncate">
                        {routine.name}
                      </Text>
                      {routine.description && !isOpen && (
                        <p className="truncate text-xs text-zinc-500">{routine.description}</p>
                      )}
                    </div>
                    <Badge tone="brand">{exercises.length} ej.</Badge>
                    <ChevronDown
                      className={cn(
                        'size-5 shrink-0 text-zinc-400 transition-transform',
                        isOpen && 'rotate-180',
                      )}
                    />
                  </button>

                  {isOpen && (
                    <div className="space-y-2 border-t border-zinc-100 px-4 pb-4 pt-3 sm:px-5">
                      {routine.description && <CoachNote>{routine.description}</CoachNote>}
                      <div className="divide-y divide-zinc-200/70">
                        {exercises.map((ex, i) => {
                          const last = lastByExercise.get(ex.name)
                          const exerciseKey = exerciseLogKey(ex.name, ex.exerciseId)
                          const todayLog = dailyLogById.get(dailyLogId(dayKey, routine.id, exerciseKey))
                          const meta = loadTypeMeta(ex.loadType)
                          const LoadIcon = meta.icon
                          const logState: LogActionState =
                            !hasCheckedInToday || (!logGate.allowed && !todayLog)
                              ? 'locked'
                              : todayLog
                                ? 'edit'
                                : 'register'
                          const lockedReason = !hasCheckedInToday
                            ? 'Escaneá el QR del gimnasio para habilitar la carga de hoy'
                            : logGate.reason
                          return (
                            <div key={`${ex.name}-${i}`} className="py-3 first:pt-1 last:pb-0">
                              <div className="flex items-center gap-3">
                                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                                  <LoadIcon className="size-4" aria-hidden />
                                </div>
                                <p className="min-w-0 flex-1 font-medium text-zinc-900">{ex.name}</p>
                                <LogActionButton
                                  state={logState}
                                  exerciseName={ex.name}
                                  reason={lockedReason}
                                  onClick={() => setActive({ routine, exercise: ex, existingLog: todayLog })}
                                />
                              </div>
                              <div className="mt-2 space-y-1.5">
                                <ExercisePrescription exercise={ex} />
                                {ex.notes && <CoachNote>{ex.notes}</CoachNote>}
                                {last && (
                                  <p className="flex flex-wrap items-center gap-1 text-xs text-zinc-400">
                                    <History className="size-3.5" /> Último ({formatDate(last.date)}):
                                    {last.sets.map((s, idx) => (
                                      <span key={idx} className="font-medium text-zinc-600">
                                        {formatLogSet(s, ex.loadType)}
                                        {idx < last.sets.length - 1 ? ',' : ''}
                                      </span>
                                    ))}
                                  </p>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </Card>
              )
            })
          )}
        </div>
      )}

      {active && (
        <LogExerciseModal
          key={`${active.routine.id}-${active.exercise.name}`}
          open
          onClose={() => setActive(null)}
          exercise={active.exercise}
          defaultSets={active.exercise.sets}
          initialSets={active.existingLog?.sets}
          onSave={saveLog}
          saving={upsertDailyLog.isPending}
        />
      )}
    </AppLayout>
  )
}

type LogActionState = 'register' | 'edit' | 'locked'

function LogActionButton({
  state,
  exerciseName,
  reason,
  onClick,
}: {
  state: LogActionState
  exerciseName: string
  reason?: string
  onClick: () => void
}) {
  const Icon = state === 'edit' ? Pencil : state === 'locked' ? Lock : Plus
  const button = (
    <button
      type="button"
      disabled={state === 'locked'}
      onClick={onClick}
      aria-label={
        state === 'edit'
          ? `Editar carga de ${exerciseName}`
          : state === 'register'
            ? `Registrar carga de ${exerciseName}`
            : `Carga bloqueada${reason ? `: ${reason}` : ''}`
      }
      className={cn(
        'inline-flex size-10 shrink-0 items-center justify-center rounded-full transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
        state === 'register' && 'bg-brand-600 text-white hover:bg-brand-700 focus-visible:ring-brand-500',
        state === 'edit' &&
          'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 focus-visible:ring-emerald-400',
        state === 'locked' && 'cursor-not-allowed border border-zinc-100 bg-zinc-50 text-zinc-400',
      )}
    >
      <Icon className={state === 'register' ? 'size-5' : 'size-4'} aria-hidden />
    </button>
  )
  return state === 'locked' && reason ? <Tooltip text={reason}>{button}</Tooltip> : button
}

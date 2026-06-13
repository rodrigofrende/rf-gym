import { Dumbbell, Plus, Trash2 } from 'lucide-react'
import type { Routine } from '@/types'
import { useLogs } from '@/hooks/useLogs'
import { useToastAction } from '@/hooks/useToastAction'
import {
  useAssignRoutine,
  useMemberAssignments,
  useRemoveAssignment,
  useRoutines,
} from '@/hooks/useRoutines'
import { Badge, Button, Card, CardBody, CardHeader, EmptyState, Select, Spinner } from '@/components/ui'
import { formatDate } from '@/utils/format'
import { formatLogSet } from '@/utils/loadTypes'
import { routineIconMeta } from '@/utils/routineIcons'
import { useState } from 'react'

export function AssignmentsTab({ gymId, memberId }: { gymId: string; memberId: string }) {
  const run = useToastAction()
  const { data: routines = [] } = useRoutines(gymId)
  const { data: assignments = [], isLoading } = useMemberAssignments(gymId, memberId)
  const { data: logs = [] } = useLogs(gymId, memberId)
  const assign = useAssignRoutine(gymId)
  const removeAssignment = useRemoveAssignment(gymId, memberId)
  const [routineId, setRoutineId] = useState('')

  const byId = (id: string): Routine | undefined => routines.find((r) => r.id === id)
  // Tipo de carga por nombre de ejercicio (para formatear las cargas del historial).
  const loadTypeByExercise = new Map(
    routines.flatMap((r) => r.exercises.map((e) => [e.name, e.loadType] as const)),
  )
  const assignedIds = new Set(assignments.map((a) => a.routineId))
  const available = routines.filter((r) => !assignedIds.has(r.id))

  const doAssign = async () => {
    if (!routineId) return
    const ok = await run(() => assign.mutateAsync({ memberUid: memberId, routineId, active: true }), {
      success: 'Rutina asignada',
      error: 'No se pudo asignar la rutina',
    })
    if (ok) setRoutineId('')
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <p className="mb-3 text-sm font-medium text-zinc-700">Asignar rutina</p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Select
            className="flex-1"
            value={routineId}
            onChange={(e) => setRoutineId(e.target.value)}
            placeholder={available.length ? 'Elegí una rutina' : 'No hay rutinas disponibles'}
            options={available.map((r) => ({ value: r.id, label: r.name }))}
          />
          <Button leftIcon={<Plus className="size-4" />} loading={assign.isPending} onClick={doAssign}>
            Asignar
          </Button>
        </div>
      </Card>

      {isLoading ? (
        <Spinner />
      ) : assignments.length === 0 ? (
        <EmptyState icon={Dumbbell} title="Sin rutinas asignadas" />
      ) : (
        <div className="space-y-2">
          {assignments.map((a) => {
            const r = byId(a.routineId)
            const { icon: RoutineIcon } = routineIconMeta(r?.icon)
            return (
              <Card key={a.id} className="flex items-center gap-3 p-4">
                <RoutineIcon className="size-5 text-brand-500" />
                <div className="flex-1">
                  <p className="font-medium text-zinc-900">{r?.name ?? 'Rutina'}</p>
                  <p className="text-xs text-zinc-500">{r?.exercises.length ?? 0} ejercicios</p>
                </div>
                <button
                  onClick={() => removeAssignment.mutate(a.id)}
                  className="text-zinc-400 hover:text-red-500"
                  aria-label="Quitar"
                >
                  <Trash2 className="size-4" />
                </button>
              </Card>
            )
          })}
        </div>
      )}

      <Card>
        <CardHeader title="Cargas registradas" subtitle="Últimos registros del socio" />
        <CardBody>
          {logs.length === 0 ? (
            <p className="text-sm text-zinc-500">El socio todavía no registró cargas.</p>
          ) : (
            <ul className="space-y-2">
              {logs.slice(0, 12).map((log) => (
                <li
                  key={log.id}
                  className="flex items-center justify-between border-b border-zinc-50 pb-2 text-sm last:border-0"
                >
                  <span className="font-medium text-zinc-700">{log.exerciseName}</span>
                  <span className="flex items-center gap-2 text-zinc-500">
                    {log.sets.map((s, i) => (
                      <Badge key={i} tone="neutral">
                        {formatLogSet(s, loadTypeByExercise.get(log.exerciseName))}
                      </Badge>
                    ))}
                    <span className="text-xs text-zinc-400">{formatDate(log.date)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  )
}

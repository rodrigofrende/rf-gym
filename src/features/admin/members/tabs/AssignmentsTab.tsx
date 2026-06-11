import { Dumbbell, Plus, Trash2 } from 'lucide-react'
import type { Routine } from '@/types'
import { useToast } from '@/providers/ToastProvider'
import { useLogs } from '@/hooks/useLogs'
import {
  useAssignRoutine,
  useMemberAssignments,
  useRemoveAssignment,
  useRoutines,
} from '@/hooks/useRoutines'
import { Badge, Button, Card, CardBody, CardHeader, EmptyState, Select, Spinner } from '@/components/ui'
import { formatDate } from '@/utils/format'
import { useState } from 'react'

export function AssignmentsTab({ gymId, memberId }: { gymId: string; memberId: string }) {
  const { notify } = useToast()
  const { data: routines = [] } = useRoutines(gymId)
  const { data: assignments = [], isLoading } = useMemberAssignments(gymId, memberId)
  const { data: logs = [] } = useLogs(gymId, memberId)
  const assign = useAssignRoutine(gymId)
  const removeAssignment = useRemoveAssignment(gymId, memberId)
  const [routineId, setRoutineId] = useState('')

  const byId = (id: string): Routine | undefined => routines.find((r) => r.id === id)
  const assignedIds = new Set(assignments.map((a) => a.routineId))
  const available = routines.filter((r) => !assignedIds.has(r.id))

  const doAssign = async () => {
    if (!routineId) return
    try {
      await assign.mutateAsync({ memberUid: memberId, routineId, active: true })
      setRoutineId('')
      notify('Rutina asignada', 'success')
    } catch {
      notify('No se pudo asignar la rutina', 'error')
    }
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <p className="mb-3 text-sm font-medium text-slate-700">Asignar rutina</p>
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
            return (
              <Card key={a.id} className="flex items-center gap-3 p-4">
                <Dumbbell className="size-5 text-brand-500" />
                <div className="flex-1">
                  <p className="font-medium text-slate-900">{r?.name ?? 'Rutina'}</p>
                  <p className="text-xs text-slate-500">{r?.exercises.length ?? 0} ejercicios</p>
                </div>
                <button
                  onClick={() => removeAssignment.mutate(a.id)}
                  className="text-slate-400 hover:text-red-500"
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
            <p className="text-sm text-slate-500">El socio todavía no registró cargas.</p>
          ) : (
            <ul className="space-y-2">
              {logs.slice(0, 12).map((log) => (
                <li
                  key={log.id}
                  className="flex items-center justify-between border-b border-slate-50 pb-2 text-sm last:border-0"
                >
                  <span className="font-medium text-slate-700">{log.exerciseName}</span>
                  <span className="flex items-center gap-2 text-slate-500">
                    {log.sets.map((s, i) => (
                      <Badge key={i} tone="neutral">
                        {s.weight}kg × {s.reps}
                      </Badge>
                    ))}
                    <span className="text-xs text-slate-400">{formatDate(log.date)}</span>
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

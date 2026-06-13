import { useState } from 'react'
import { History, Lock } from 'lucide-react'
import type { Exercise, LogSet, SubscriptionPlan, WorkoutLog } from '@/types'
import { useTenant } from '@/providers/TenantProvider'
import { useToast } from '@/providers/ToastProvider'
import { useLogs, useRemoveLog, useUpdateLog } from '@/hooks/useLogs'
import { useRoutines } from '@/hooks/useRoutines'
import { useGym } from '@/hooks/useGym'
import { usePlans } from '@/hooks/usePlans'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, ConfirmDialog, FullPageSpinner } from '@/components/ui'
import { cn } from '@/utils/cn'
import { formatDate } from '@/utils/format'
import { canMemberLog, logsCapabilityLabel, usageLabel } from '@/utils/plans'
import { WorkoutLogHistory } from '@/features/logs/WorkoutLogHistory'
import { LogExerciseModal } from '@/features/member/routines/LogExerciseModal'

export function MyLogsPage() {
  const { activeGymId, activeMembership } = useTenant()
  const gymId = activeGymId as string
  const memberId = activeMembership?.memberId as string
  const { notify } = useToast()

  const { data: logs = [], isLoading } = useLogs(gymId, memberId)
  const { data: routines = [] } = useRoutines(gymId)
  const { data: gym } = useGym(gymId)
  const { data: plans = [] } = usePlans()
  const updateLog = useUpdateLog(gymId, memberId)
  const removeLog = useRemoveLog(gymId, memberId)

  const plan = plans.find((p) => p.id === gym?.subscription?.planId)
  const gate = canMemberLog(plan, logs.length)

  const [editing, setEditing] = useState<WorkoutLog | null>(null)
  const [toDelete, setToDelete] = useState<WorkoutLog | null>(null)

  // Reconstruye un "ejercicio" (su tipo de carga) desde la rutina para que el
  // modal muestre los inputs correctos al editar.
  const exerciseForLog = (log: WorkoutLog): Exercise => {
    const ex = routines.find((r) => r.id === log.routineId)?.exercises.find((e) => e.name === log.exerciseName)
    return { name: log.exerciseName, sets: ex?.sets ?? log.sets.length, reps: ex?.reps ?? 0, loadType: ex?.loadType }
  }

  const saveEdit = async (sets: LogSet[]) => {
    if (!editing) return
    try {
      await updateLog.mutateAsync({ logId: editing.id, data: { sets } })
      notify('Registro actualizado', 'success')
      setEditing(null)
    } catch {
      notify('No se pudo actualizar el registro', 'error')
    }
  }

  const confirmDelete = async () => {
    if (!toDelete) return
    try {
      await removeLog.mutateAsync(toDelete.id)
      notify('Registro eliminado', 'success')
      setToDelete(null)
    } catch {
      notify('No se pudo eliminar el registro', 'error')
    }
  }

  if (isLoading) {
    return (
      <AppLayout title="Mis registros">
        <FullPageSpinner />
      </AppLayout>
    )
  }

  return (
    <AppLayout
      title="Mis registros"
      subtitle="Tu historial de cargas. Tocá un ejercicio para ver tu progreso."
    >
      <div className="space-y-4">
        <UsageCard plan={plan} count={logs.length} gate={gate} />
        <WorkoutLogHistory
          logs={logs}
          routines={routines}
          onEdit={setEditing}
          onDelete={setToDelete}
          emptyDescription="Cuando registres cargas desde Mis rutinas, vas a poder verlas y editarlas acá."
        />
      </div>

      {editing && (
        <LogExerciseModal
          key={editing.id}
          open
          onClose={() => setEditing(null)}
          exercise={exerciseForLog(editing)}
          defaultSets={editing.sets.length}
          initialSets={editing.sets}
          onSave={saveEdit}
          saving={updateLog.isPending}
        />
      )}

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        title="Eliminar registro"
        description={
          toDelete
            ? `¿Eliminar tu registro de "${toDelete.exerciseName}" del ${formatDate(toDelete.date)}? Esta acción no se puede deshacer.`
            : ''
        }
        loading={removeLog.isPending}
      />
    </AppLayout>
  )
}

/** Tarjeta de uso/límite de registros según el plan del gym. */
function UsageCard({
  plan,
  count,
  gate,
}: {
  plan?: SubscriptionPlan
  count: number
  gate: { allowed: boolean; reason?: string }
}) {
  const max = plan?.maxLogsPerMember ?? 0
  const hasLimit = !!plan?.logsEnabled && max > 0
  const pct = hasLimit ? Math.min(100, Math.round((count / max) * 100)) : 0
  const barTone = pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-brand-600'
  const logsDisabled = plan?.logsEnabled === false

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <History className="size-5 text-brand-600" />
          <p className="font-semibold text-zinc-900">Registros de carga</p>
        </div>
        {!logsDisabled && (
          <span className="text-sm font-medium text-zinc-700">
            {hasLimit ? usageLabel(count, max) : count}
          </span>
        )}
      </div>

      {logsDisabled ? (
        <p className="mt-2 text-sm text-zinc-500">{logsCapabilityLabel(plan)}</p>
      ) : (
        <>
          {hasLimit && (
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-100">
              <div
                className={cn('h-full rounded-full transition-all', barTone)}
                style={{ width: `${pct}%` }}
              />
            </div>
          )}
          <p className="mt-2 text-xs text-zinc-500">
            {plan ? logsCapabilityLabel(plan) : 'Registros ilimitados'}
          </p>
        </>
      )}

      {!gate.allowed && gate.reason && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <Lock className="mt-0.5 size-4 shrink-0" />
          <p>{gate.reason}</p>
        </div>
      )}
    </Card>
  )
}

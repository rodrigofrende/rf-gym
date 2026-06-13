import { useLogs } from '@/hooks/useLogs'
import { useRoutines } from '@/hooks/useRoutines'
import { Spinner } from '@/components/ui'
import { WorkoutLogHistory } from '@/features/logs/WorkoutLogHistory'

/**
 * Progreso del socio (solo lectura para el admin): historial de cargas por
 * ejercicio con la evolución a lo largo del tiempo. No permite editar.
 */
export function ProgressTab({ gymId, memberId }: { gymId: string; memberId: string }) {
  const { data: logs = [], isLoading } = useLogs(gymId, memberId)
  const { data: routines = [] } = useRoutines(gymId)

  if (isLoading) return <Spinner />

  return (
    <WorkoutLogHistory
      logs={logs}
      routines={routines}
      emptyDescription="El socio todavía no registró cargas."
    />
  )
}

import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import type { Routine } from '@/types'
import { useTenant } from '@/providers/TenantProvider'
import { useRoutines } from '@/hooks/useRoutines'
import { AppLayout } from '@/components/layout/AppLayout'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  FullPageSpinner,
  Heading,
  InfoTooltip,
  Text,
} from '@/components/ui'
import { adminRoutineDetail, ROUTES } from '@/routes/routePaths'
import { cn } from '@/utils/cn'
import { routineIconMeta } from '@/utils/routineIcons'

export function RoutinesListPage() {
  const navigate = useNavigate()
  const { activeGymId } = useTenant()
  const gymId = activeGymId as string
  const { data: routines = [], isLoading } = useRoutines(gymId)

  return (
    <AppLayout
      title="Rutinas"
      subtitle={
        <span className="inline-flex items-center gap-1.5">
          Plantillas de entrenamiento que asignás a tus socios.
          <InfoTooltip text="Las rutinas se arman desde el catálogo de ejercicios y luego se asignan a cada socio desde su ficha." />
        </span>
      }
      actions={
        <Button leftIcon={<Plus className="size-4" />} onClick={() => navigate(ROUTES.ADMIN_ROUTINE_NEW)}>
          Nueva rutina
        </Button>
      }
    >
      {isLoading ? (
        <FullPageSpinner />
      ) : routines.length === 0 ? (
        <EmptyState
          icon={routineIconMeta().icon}
          title="Sin rutinas"
          description="Creá rutinas con sus ejercicios y luego asignalas a tus socios."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {routines.map((routine) => (
            <RoutineCard
              key={routine.id}
              routine={routine}
              onOpen={() => navigate(adminRoutineDetail(routine.id))}
            />
          ))}
        </div>
      )}
    </AppLayout>
  )
}

function RoutineCard({
  routine,
  onOpen,
}: {
  routine: Routine
  onOpen: () => void
}) {
  const { icon: RoutineIcon } = routineIconMeta(routine.icon)

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpen()
        }
      }}
      className={cn(
        'flex cursor-pointer flex-col p-5 transition-all',
        'hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <RoutineIcon className="size-5" />
        </div>
      </div>
      <Heading variant="card" className="mt-3">
        {routine.name}
      </Heading>
      {routine.description && (
        <Text variant="caption" className="mt-1">
          {routine.description}
        </Text>
      )}
      <div className="mt-3">
        <Badge tone="neutral">{routine.exercises.length} ejercicios</Badge>
      </div>
    </Card>
  )
}

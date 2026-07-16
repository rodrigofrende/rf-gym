import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react'
import type { Exercise, Routine } from '@/types'
import { useAuth } from '@/providers/AuthProvider'
import { useTenant } from '@/providers/TenantProvider'
import { useCreateRoutine, useRemoveRoutine, useRoutines, useUpdateRoutine } from '@/hooks/useRoutines'
import { useToastAction } from '@/hooks/useToastAction'
import { AppLayout } from '@/components/layout/AppLayout'
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  FullPageSpinner,
  Heading,
  IconButton,
  Text,
} from '@/components/ui'
import { CoachNote } from '@/components/shared/CoachNote'
import { ExercisePrescription } from '@/components/shared/ExercisePrescription'
import { loadTypeMeta } from '@/utils/loadTypes'
import { routineIconMeta } from '@/utils/routineIcons'
import { ROUTES } from '@/routes/routePaths'
import { RoutineBuilder } from './RoutineBuilder'

export function RoutineEditorPage() {
  const { routineId } = useParams()
  const { user } = useAuth()
  const { activeGymId } = useTenant()
  const gymId = activeGymId as string
  const navigate = useNavigate()
  const run = useToastAction()
  const { data: routines = [], isLoading } = useRoutines(gymId)
  const createRoutine = useCreateRoutine(gymId)
  const updateRoutine = useUpdateRoutine(gymId)
  const removeRoutine = useRemoveRoutine(gymId)
  const isEditing = !!routineId
  const routine = isEditing ? routines.find((item) => item.id === routineId) : null
  const [mode, setMode] = useState<'view' | 'edit'>(isEditing ? 'view' : 'edit')
  const [deleteOpen, setDeleteOpen] = useState(false)

  const handleSubmit = async (data: Omit<Routine, 'id'>) => {
    const ok = await run(
      () =>
        routine
          ? updateRoutine.mutateAsync({ routineId: routine.id, data })
          : createRoutine.mutateAsync(data),
      {
        success: routine ? 'Rutina actualizada' : 'Rutina creada',
        error: 'No se pudo guardar la rutina',
      },
    )
    if (!ok) return
    if (routine) {
      setMode('view')
      return
    }
    navigate(ROUTES.ADMIN_ROUTINES)
  }

  const confirmDelete = async () => {
    if (!routine) return
    const ok = await run(() => removeRoutine.mutateAsync(routine.id), {
      success: 'Rutina eliminada',
      error: 'No se pudo eliminar la rutina',
    })
    if (ok) navigate(ROUTES.ADMIN_ROUTINES)
  }

  if (isEditing && isLoading) {
    return (
      <AppLayout title="Rutina">
        <FullPageSpinner />
      </AppLayout>
    )
  }

  if (isEditing && !routine) {
    return (
      <AppLayout title="Rutina">
        <Link
          to={ROUTES.ADMIN_ROUTINES}
          className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700"
        >
          <ArrowLeft className="size-4" /> Volver a rutinas
        </Link>
        <Card className="p-5">
          <Heading variant="card">No se encontró la rutina</Heading>
          <Text variant="caption" className="mt-1">
            Puede haber sido eliminada o no pertenecer al gimnasio activo.
          </Text>
          <Button className="mt-4" onClick={() => navigate(ROUTES.ADMIN_ROUTINES)}>
            Volver al listado
          </Button>
        </Card>
      </AppLayout>
    )
  }

  const title = routine ? routine.name : 'Nueva rutina'
  const showView = !!routine && mode === 'view'

  return (
    <AppLayout
      title={title}
      subtitle="Armá la plantilla con ejercicios del catálogo y ajustá los parámetros de entrenamiento."
    >
      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        <Link
          to={ROUTES.ADMIN_ROUTINES}
          className="inline-flex items-center gap-1 text-zinc-500 hover:text-zinc-700"
        >
          <ArrowLeft className="size-4" />
          Rutinas
        </Link>
        <span className="text-zinc-300">/</span>
        <span className="font-medium text-zinc-700">{title}</span>
      </div>

      {showView ? (
        <RoutineReadView
          routine={routine}
          onEdit={() => setMode('edit')}
          onDelete={() => setDeleteOpen(true)}
        />
      ) : (
        <RoutineBuilder
          initial={routine}
          createdBy={user?.uid ?? ''}
          saving={createRoutine.isPending || updateRoutine.isPending}
          onCancel={() => {
            if (routine) {
              setMode('view')
              return
            }
            navigate(ROUTES.ADMIN_ROUTINES)
          }}
          onSubmit={handleSubmit}
        />
      )}

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={confirmDelete}
        title="Eliminar rutina"
        description={`¿Querés eliminar la rutina "${routine?.name}"? Esta acción no se puede deshacer.`}
        loading={removeRoutine.isPending}
      />
    </AppLayout>
  )
}

function RoutineReadView({
  routine,
  onEdit,
  onDelete,
}: {
  routine: Routine
  onEdit: () => void
  onDelete: () => void
}) {
  const { icon: RoutineIcon } = routineIconMeta(routine.icon)

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <RoutineIcon className="size-6" aria-hidden />
            </div>
            <div className="min-w-0">
              <Heading variant="card">{routine.name}</Heading>
              <Text variant="caption" className="mt-1">
                {routine.description || 'Sin descripción'}
              </Text>
              <div className="mt-3">
                <Badge tone="neutral">{routine.exercises.length} ejercicios</Badge>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <IconButton
              icon={<Pencil className="size-4" />}
              label="Editar rutina"
              className="border border-zinc-200 text-zinc-500"
              onClick={onEdit}
            />
            <IconButton
              icon={<Trash2 className="size-4" />}
              label="Eliminar rutina"
              tone="danger"
              className="border border-red-200 text-red-500"
              onClick={onDelete}
            />
          </div>
        </div>
      </Card>

      <div className="space-y-2">
        {routine.exercises.map((exercise, index) => (
          <ExerciseSummary key={`${exercise.name}-${index}`} exercise={exercise} index={index} />
        ))}
      </div>
    </div>
  )
}

function ExerciseSummary({ exercise, index }: { exercise: Exercise; index: number }) {
  const meta = loadTypeMeta(exercise.loadType)
  const LoadIcon = meta.icon

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-brand-600">
          <LoadIcon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-zinc-400">Ejercicio {index + 1}</p>
          <p className="text-sm font-semibold text-zinc-900">{exercise.name}</p>
          <ExercisePrescription exercise={exercise} className="mt-2" />
          {exercise.notes ? <CoachNote className="mt-2">{exercise.notes}</CoachNote> : null}
        </div>
      </div>
    </Card>
  )
}

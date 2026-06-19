import { useState, type ReactNode } from 'react'
import { Dumbbell, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import type { ExerciseCategory, ExerciseDefinition, MuscleGroup } from '@/types'
import { useAuth } from '@/providers/AuthProvider'
import { useToast } from '@/providers/ToastProvider'
import { useTenant } from '@/providers/TenantProvider'
import {
  useCreateExercise,
  useExercises,
  useRemoveExercise,
  useUpdateExercise,
} from '@/hooks/useExercises'
import { useGym } from '@/hooks/useGym'
import { usePlans } from '@/hooks/usePlans'
import { useToastAction } from '@/hooks/useToastAction'
import { AppLayout } from '@/components/layout/AppLayout'
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  FullPageSpinner,
  Heading,
  IconButton,
  InfoTooltip,
  Input,
  Text,
} from '@/components/ui'
import { cn } from '@/utils/cn'
import {
  EXERCISE_CATEGORY_OPTIONS,
  ExerciseCategoryIcon,
  MUSCLE_GROUP_OPTIONS,
  categoryLabel,
  filterExercises,
  muscleGroupLabel,
} from '@/utils/exercises'
import { loadTypeMeta } from '@/utils/loadTypes'
import { canCreateExercise, usageLabel } from '@/utils/plans'
import { ExerciseFormModal } from './ExerciseFormModal'

export function ExercisesListPage() {
  const { user } = useAuth()
  const { notify } = useToast()
  const { activeGymId } = useTenant()
  const gymId = activeGymId as string
  const run = useToastAction()
  const { data: exercises = [], isLoading } = useExercises(gymId)
  const { data: gym } = useGym(gymId)
  const { data: plans = [] } = usePlans()
  const createExercise = useCreateExercise(gymId)
  const updateExercise = useUpdateExercise(gymId)
  const removeExercise = useRemoveExercise(gymId)
  const plan = plans.find((p) => p.id === gym?.subscription?.planId)
  const createLimit = canCreateExercise(plan, exercises.length)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ExerciseDefinition | null>(null)
  const [toDelete, setToDelete] = useState<ExerciseDefinition | null>(null)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<ExerciseCategory | 'all'>('all')
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup | 'all'>('all')

  const filtered = filterExercises(exercises, { search, category, muscleGroup })

  const openNew = () => {
    if (!createLimit.allowed) {
      notify(createLimit.reason ?? 'Tu plan no permite crear más ejercicios.', 'error')
      return
    }
    setEditing(null)
    setModalOpen(true)
  }

  const handleSubmit = async (data: Omit<ExerciseDefinition, 'id'>) => {
    const ok = await run(
      () =>
        editing
          ? updateExercise.mutateAsync({ exerciseId: editing.id, data })
          : createExercise.mutateAsync(data),
      {
        success: editing ? 'Ejercicio actualizado' : 'Ejercicio creado',
        error: 'No se pudo guardar el ejercicio',
      },
    )
    if (ok) setModalOpen(false)
  }

  const confirmDelete = async () => {
    if (!toDelete) return
    const ok = await run(() => removeExercise.mutateAsync(toDelete.id), {
      success: 'Ejercicio eliminado',
      error: 'No se pudo eliminar',
    })
    if (ok) setToDelete(null)
  }

  return (
    <AppLayout
      title="Ejercicios"
      subtitle={
        <span className="inline-flex items-center gap-1.5">
          Administrá la biblioteca de ejercicios para armar rutinas más rápido.
          <InfoTooltip text="El límite de ejercicios depende del plan del gym. Las rutinas existentes conservan su copia si eliminás un ejercicio del catálogo." />
        </span>
      }
      actions={
        <Button leftIcon={<Plus className="size-4" />} onClick={openNew}>
          Nuevo ejercicio
        </Button>
      }
    >
      <div className="mb-4 space-y-3 rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar ejercicio"
              className="pl-9"
            />
          </div>
          {plan && (
            <Badge tone={createLimit.allowed ? 'neutral' : 'amber'}>
              {usageLabel(exercises.length, plan.maxExercises)} ejercicios del plan
            </Badge>
          )}
        </div>

        <FilterRow label="Tipo">
          <FilterChip selected={category === 'all'} onClick={() => setCategory('all')}>
            Todos
          </FilterChip>
          {EXERCISE_CATEGORY_OPTIONS.map((value) => (
            <FilterChip key={value} selected={category === value} onClick={() => setCategory(value)}>
              {categoryLabel(value)}
            </FilterChip>
          ))}
        </FilterRow>

        <FilterRow label="Músculo">
          <FilterChip selected={muscleGroup === 'all'} onClick={() => setMuscleGroup('all')}>
            Todos
          </FilterChip>
          {MUSCLE_GROUP_OPTIONS.map((value) => (
            <FilterChip key={value} selected={muscleGroup === value} onClick={() => setMuscleGroup(value)}>
              {muscleGroupLabel(value)}
            </FilterChip>
          ))}
        </FilterRow>
      </div>

      {isLoading ? (
        <FullPageSpinner />
      ) : exercises.length === 0 ? (
        <EmptyState
          icon={Dumbbell}
          title="Sin ejercicios"
          description="Creá tu pool de ejercicios para reutilizarlos en las rutinas."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Sin resultados"
          description="Probá ajustar la búsqueda o los filtros."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((exercise) => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              onEdit={() => {
                setEditing(exercise)
                setModalOpen(true)
              }}
              onDelete={() => setToDelete(exercise)}
            />
          ))}
        </div>
      )}

      <ExerciseFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        initial={editing}
        createdBy={user?.uid ?? ''}
        saving={createExercise.isPending || updateExercise.isPending}
      />

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        title="Eliminar ejercicio"
        description={`¿Querés eliminar "${toDelete?.name}" del catálogo? Las rutinas existentes conservan su copia.`}
        loading={removeExercise.isPending}
      />
    </AppLayout>
  )
}

function ExerciseCard({
  exercise,
  onEdit,
  onDelete,
}: {
  exercise: ExerciseDefinition
  onEdit: () => void
  onDelete: () => void
}) {
  const LoadIcon = loadTypeMeta(exercise.loadType).icon

  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <ExerciseCategoryIcon category={exercise.category} className="size-5" />
          </div>
          <div className="min-w-0">
            <Heading variant="card" className="truncate">
              {exercise.name}
            </Heading>
            <div className="mt-1 flex flex-wrap gap-1.5">
              <Badge tone="brand">{categoryLabel(exercise.category)}</Badge>
              <Badge tone="neutral">
                <LoadIcon className="mr-1 size-3" />
                {loadTypeMeta(exercise.loadType).shortLabel}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 gap-0.5">
          <IconButton icon={<Pencil className="size-4" />} label={`Editar ${exercise.name}`} onClick={onEdit} />
          <IconButton
            icon={<Trash2 className="size-4" />}
            label={`Eliminar ${exercise.name}`}
            tone="danger"
            onClick={onDelete}
          />
        </div>
      </div>

      {exercise.description && (
        <Text variant="caption" className="mt-3">
          {exercise.description}
        </Text>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {exercise.muscleGroups.map((value) => (
          <Badge key={value} tone="neutral">
            {muscleGroupLabel(value)}
          </Badge>
        ))}
      </div>

      {(exercise.defaultSets || exercise.defaultReps || exercise.defaultRestSec) && (
        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-zinc-100 pt-3 text-center">
          <MiniMetric label="Series" value={exercise.defaultSets ?? '-'} />
          <MiniMetric label="Reps" value={exercise.defaultReps ?? '-'} />
          <MiniMetric label="Descanso" value={exercise.defaultRestSec ? `${exercise.defaultRestSec}s` : '-'} />
        </div>
      )}
    </Card>
  )
}

function MiniMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-surface-muted px-2 py-1.5">
      <p className="text-xs text-zinc-400">{label}</p>
      <p className="text-sm font-semibold text-zinc-800">{value}</p>
    </div>
  )
}

function FilterRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <p className="w-16 shrink-0 text-xs font-semibold uppercase tracking-wide text-zinc-400">{label}</p>
      <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">{children}</div>
    </div>
  )
}

function FilterChip({
  selected,
  onClick,
  children,
}: {
  selected: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'whitespace-nowrap rounded-[var(--radius-pill)] border px-3 py-1.5 text-sm font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
        selected
          ? 'border-brand-500 bg-brand-50 text-brand-700'
          : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50',
      )}
    >
      {children}
    </button>
  )
}

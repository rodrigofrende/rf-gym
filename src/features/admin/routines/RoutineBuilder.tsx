import { useState } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Controller,
  useFieldArray,
  useForm,
  useWatch,
  type Control,
  type FieldErrors,
  type UseFormRegister,
  type UseFormSetValue,
} from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Check,
  ChevronDown,
  GripVertical,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'
import type {
  Exercise,
  ExerciseCategory,
  ExerciseDefinition,
  LoadType,
  MuscleGroup,
  Routine,
  RoutineIconKey,
} from '@/types'
import { useTenant } from '@/providers/TenantProvider'
import { useExercises } from '@/hooks/useExercises'
import { Badge, Button, Card, FormField, IconSelect, InfoTooltip, Input, Select } from '@/components/ui'
import { ExercisePrescription } from '@/components/shared/ExercisePrescription'
import { cn } from '@/utils/cn'
import {
  EXERCISE_CATEGORY_OPTIONS,
  ExerciseCategoryIcon,
  MUSCLE_GROUP_OPTIONS,
  categoryLabel,
  filterExercises,
  muscleGroupLabel,
} from '@/utils/exercises'
import { LOAD_TYPE_OPTIONS, loadTypeMeta, normalizeLoadType } from '@/utils/loadTypes'
import { ROUTINE_ICON_OPTIONS } from '@/utils/routineIcons'

const LOAD_TYPE_VALUES = ['weight', 'time', 'bodyweight'] as const satisfies readonly LoadType[]

const ROUTINE_ICON_VALUES = [
  'strength',
  'lower',
  'upper',
  'cardio',
  'mobility',
  'core',
  'functional',
  'boxing',
  'yoga',
  'running',
  'recovery',
] as const satisfies readonly RoutineIconKey[]

const exerciseSchema = z.object({
  exerciseId: z.string().optional(),
  name: z.string().min(1, 'Nombre'),
  sets: z.number().min(1),
  reps: z.number().min(1),
  intensity: z.string().optional(),
  weight: z.string().optional(),
  loadType: z.enum(LOAD_TYPE_VALUES).optional(),
  restSec: z.number().min(0),
  notes: z.string().optional(),
})

const normalizeExerciseName = (name: string) => name.trim().toLowerCase()

const schema = z
  .object({
    name: z.string().min(2, 'Ingresá un nombre'),
    description: z.string().optional(),
    icon: z.enum(ROUTINE_ICON_VALUES).optional(),
    exercises: z.array(exerciseSchema).min(1, 'Agregá al menos un ejercicio'),
  })
  .superRefine((values, ctx) => {
    const seen = new Map<string, number>()
    values.exercises.forEach((exercise, index) => {
      const key = normalizeExerciseName(exercise.name)
      if (!key) return
      const firstIndex = seen.get(key)
      if (firstIndex === undefined) {
        seen.set(key, index)
        return
      }
      ctx.addIssue({
        code: 'custom',
        path: ['exercises', index, 'name'],
        message: 'Este ejercicio ya está en la rutina',
      })
      ctx.addIssue({
        code: 'custom',
        path: ['exercises'],
        message: `No repitas ejercicios: "${exercise.name}" ya fue agregado.`,
      })
    })
  })
type FormValues = z.infer<typeof schema>
type FormExercise = z.infer<typeof exerciseSchema>

const EMPTY_EXERCISE: FormExercise = {
  name: '',
  sets: 3,
  reps: 10,
  intensity: '',
  weight: '',
  loadType: 'weight',
  restSec: 60,
  notes: '',
}

const sortableId = (fieldId: string) => `routine:${fieldId}`

function toFormExercises(exercises?: Exercise[]): FormExercise[] {
  if (!exercises?.length) return []
  return exercises.map((e) => ({
    exerciseId: e.exerciseId,
    name: e.name,
    sets: e.sets,
    reps: e.reps,
    intensity: e.intensity ?? '',
    weight: e.weight ?? '',
    loadType: normalizeLoadType(e.loadType),
    restSec: e.restSec ?? 0,
    notes: e.notes ?? '',
  }))
}

function exerciseFromDefinition(exercise: ExerciseDefinition): FormExercise {
  return {
    exerciseId: exercise.id,
    name: exercise.name,
    sets: exercise.defaultSets ?? 3,
    reps: exercise.defaultReps ?? 10,
    intensity: '',
    weight: '',
    loadType: exercise.loadType,
    restSec: exercise.defaultRestSec ?? 60,
    notes: exercise.description ?? '',
  }
}

export function RoutineBuilder({
  initial,
  createdBy,
  saving,
  onCancel,
  onSubmit,
}: {
  initial?: Routine | null
  createdBy: string
  saving?: boolean
  onCancel: () => void
  onSubmit: (data: Omit<Routine, 'id'>) => void
}) {
  const { activeGymId } = useTenant()
  const gymId = activeGymId as string
  const { data: pool = [], isLoading: poolLoading } = useExercises(gymId)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<ExerciseCategory | 'all'>('all')
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup | 'all'>('all')

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initial?.name ?? '',
      description: initial?.description ?? '',
      icon: initial?.icon ?? 'strength',
      exercises: toFormExercises(initial?.exercises),
    },
  })
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: 'exercises',
  })
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const [openIndex, setOpenIndex] = useState(initial ? -1 : 0)
  const watchedExercises = useWatch({ control, name: 'exercises' }) ?? []
  const filteredPool = filterExercises(pool, { search, category, muscleGroup })
  const sortableItems = fields.map((field) => sortableId(field.id))

  const countByExerciseId = new Map<string, number>()
  const addedExerciseNames = new Set<string>()
  watchedExercises.forEach((exercise) => {
    if (exercise.name) addedExerciseNames.add(normalizeExerciseName(exercise.name))
    if (exercise.exerciseId) {
      countByExerciseId.set(exercise.exerciseId, (countByExerciseId.get(exercise.exerciseId) ?? 0) + 1)
    }
  })

  const appendExercise = (exercise: FormExercise) => {
    setOpenIndex(fields.length)
    append(exercise)
  }

  const addExerciseFromPool = (exercise: ExerciseDefinition) => {
    if (addedExerciseNames.has(normalizeExerciseName(exercise.name))) return
    appendExercise(exerciseFromDefinition(exercise))
  }

  const addBlankExercise = () => appendExercise(EMPTY_EXERCISE)

  const removeExercise = (i: number) => {
    remove(i)
    setOpenIndex((cur) => (cur === i ? -1 : cur > i ? cur - 1 : cur))
  }

  const moveExercise = (from: number, to: number) => {
    if (to < 0 || to >= fields.length) return
    move(from, to)
    setOpenIndex((cur) => (cur === from ? to : cur === to ? from : cur))
  }

  const toggle = (i: number) => setOpenIndex((cur) => (cur === i ? -1 : i))

  const submit = (v: FormValues) => {
    onSubmit({
      name: v.name,
      description: v.description,
      icon: v.icon,
      createdBy,
      exercises: v.exercises,
    })
  }

  const onInvalid = (errs: FieldErrors<FormValues>) => {
    const exErrs = errs.exercises
    if (Array.isArray(exErrs)) {
      const idx = exErrs.findIndex(Boolean)
      if (idx >= 0) setOpenIndex(idx)
    }
  }

  const onDragEnd = (event: DragEndEvent) => {
    const activeId = String(event.active.id)
    const overId = event.over ? String(event.over.id) : ''
    if (!activeId.startsWith('routine:') || !overId.startsWith('routine:') || activeId === overId) return

    const oldIndex = sortableItems.indexOf(activeId)
    const newIndex = sortableItems.indexOf(overId)
    if (oldIndex >= 0 && newIndex >= 0) moveExercise(oldIndex, newIndex)
  }

  return (
    <form onSubmit={handleSubmit(submit, onInvalid)} className="space-y-5">
      <Card className="p-5">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
          <FormField label="Nombre de la rutina" error={errors.name?.message} required>
            <Input {...register('name')} invalid={!!errors.name} placeholder="Ej. Full body A" />
          </FormField>
          <FormField label="Icono de la rutina">
            <Controller
              control={control}
              name="icon"
              render={({ field }) => (
                <IconSelect
                  value={field.value ?? 'strength'}
                  onChange={field.onChange}
                  options={ROUTINE_ICON_OPTIONS}
                  placeholder="Elegir icono"
                />
              )}
            />
          </FormField>
        </div>
        <div className="mt-4">
          <FormField label="Descripción">
            <Input {...register('description')} placeholder="Notas generales" />
          </FormField>
        </div>
      </Card>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <section className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm">
            <div className="mb-3">
              <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-800">
                <span>Pool de ejercicios</span>
                <InfoTooltip text="Tocá Agregar para copiar el ejercicio a la rutina. Cada ejercicio puede aparecer una sola vez." />
              </p>
              <p className="text-xs text-zinc-500">Filtrá el catálogo y sumá ejercicios con un toque.</p>
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar ejercicio"
                className="pl-9"
              />
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField label="Tipo">
                <Select
                  value={category}
                  onChange={(event) => setCategory(event.target.value as ExerciseCategory | 'all')}
                  options={[
                    { value: 'all', label: 'Todos' },
                    ...EXERCISE_CATEGORY_OPTIONS.map((value) => ({
                      value,
                      label: categoryLabel(value),
                    })),
                  ]}
                />
              </FormField>
              <FormField label="Músculo">
                <Select
                  value={muscleGroup}
                  onChange={(event) => setMuscleGroup(event.target.value as MuscleGroup | 'all')}
                  options={[
                    { value: 'all', label: 'Todos' },
                    ...MUSCLE_GROUP_OPTIONS.map((value) => ({
                      value,
                      label: muscleGroupLabel(value),
                    })),
                  ]}
                />
              </FormField>
            </div>

            <div className="mt-4 space-y-2">
              {poolLoading ? (
                <p className="rounded-xl bg-surface-muted p-3 text-sm text-zinc-500">Cargando ejercicios...</p>
              ) : filteredPool.length === 0 ? (
                <p className="rounded-xl bg-surface-muted p-3 text-sm text-zinc-500">
                  No hay ejercicios para estos filtros.
                </p>
              ) : (
                filteredPool.map((exercise) => (
                  <PoolExerciseCard
                    key={exercise.id}
                    exercise={exercise}
                    addedCount={countByExerciseId.get(exercise.id) ?? 0}
                    disabled={addedExerciseNames.has(normalizeExerciseName(exercise.name))}
                    onAdd={() => addExerciseFromPool(exercise)}
                  />
                ))
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm">
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-zinc-800">
                  Rutina <span className="font-normal text-zinc-400">({fields.length})</span>
                </p>
                <p className="text-xs text-zinc-500">
                  Ordená con las flechas y ajustá series, reps y descanso.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                leftIcon={<Plus className="size-4" />}
                onClick={addBlankExercise}
              >
                Ejercicio manual
              </Button>
            </div>

            {errors.exercises?.message && (
              <p className="mb-2 text-xs text-red-500">{errors.exercises.message}</p>
            )}

            {fields.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-200 bg-surface-muted p-6 text-center text-sm text-zinc-500">
                Agregá ejercicios desde el pool o cargá uno manualmente.
              </div>
            ) : (
              <SortableContext items={sortableItems} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {fields.map((field, i) => (
                    <SortableExerciseCard
                      key={field.id}
                      sortableId={sortableId(field.id)}
                      index={i}
                      control={control}
                      register={register}
                      setValue={setValue}
                      isOpen={openIndex === i}
                      onToggle={() => toggle(i)}
                      onRemove={() => removeExercise(i)}
                      hasError={!!errors.exercises?.[i]}
                    />
                  ))}
                </div>
              </SortableContext>
            )}
          </section>
        </div>
      </DndContext>

      <div className="flex flex-col-reverse gap-2 border-t border-zinc-100 pt-4 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" loading={saving}>
          {initial ? 'Guardar rutina' : 'Crear rutina'}
        </Button>
      </div>
    </form>
  )
}

function PoolExerciseCard({
  exercise,
  addedCount,
  disabled,
  onAdd,
}: {
  exercise: ExerciseDefinition
  addedCount: number
  disabled: boolean
  onAdd: () => void
}) {
  const meta = loadTypeMeta(exercise.loadType)
  const LoadIcon = meta.icon

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm transition-colors hover:border-brand-200">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <ExerciseCategoryIcon category={exercise.category} className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold text-zinc-800">{exercise.name}</p>
            {addedCount > 0 ? (
              <Badge tone="green">
                <Check className="mr-1 size-3.5" />
                {addedCount} en rutina
              </Badge>
            ) : null}
          </div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <Badge tone="brand">{categoryLabel(exercise.category)}</Badge>
            <Badge tone="neutral">
              <LoadIcon className="mr-1 size-3.5" />
              {meta.shortLabel}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            {exercise.muscleGroups.slice(0, 2).map(muscleGroupLabel).join(' · ')}
            {exercise.muscleGroups.length > 2 ? ` · +${exercise.muscleGroups.length - 2}` : ''}
          </p>
        </div>
        <Button type="button" size="sm" variant="secondary" onClick={onAdd} disabled={disabled}>
          {disabled ? 'Agregado' : 'Agregar'}
        </Button>
      </div>
    </div>
  )
}

function LoadTypePicker({
  value,
  onChange,
}: {
  value: LoadType
  onChange: (value: LoadType) => void
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Tipo de carga">
      {LOAD_TYPE_OPTIONS.map(({ value: optionValue, label }) => {
        const meta = loadTypeMeta(optionValue)
        const Icon = meta.icon
        const selected = value === optionValue
        return (
          <button
            key={optionValue}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(optionValue)}
            className={cn(
              'flex items-start gap-2.5 rounded-xl border p-3 text-left transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1',
              selected
                ? 'border-brand-500 bg-brand-50 shadow-sm'
                : 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50',
            )}
          >
            <div
              className={cn(
                'flex size-8 shrink-0 items-center justify-center rounded-lg',
                selected ? 'bg-brand-100 text-brand-700' : 'bg-zinc-100 text-zinc-500',
              )}
            >
              <Icon className="size-4" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className={cn('text-sm font-medium', selected ? 'text-brand-800' : 'text-zinc-800')}>
                {label}
              </p>
              <p className="mt-0.5 text-xs leading-snug text-zinc-500">{meta.tooltip}</p>
            </div>
          </button>
        )
      })}
    </div>
  )
}

function SortableExerciseCard({
  sortableId: id,
  index,
  control,
  register,
  setValue,
  isOpen,
  onToggle,
  onRemove,
  hasError,
}: {
  sortableId: string
  index: number
  control: Control<FormValues>
  register: UseFormRegister<FormValues>
  setValue: UseFormSetValue<FormValues>
  isOpen: boolean
  onToggle: () => void
  onRemove: () => void
  hasError: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const name = useWatch({ control, name: `exercises.${index}.name` })
  const sets = useWatch({ control, name: `exercises.${index}.sets` })
  const reps = useWatch({ control, name: `exercises.${index}.reps` })
  const loadType = useWatch({ control, name: `exercises.${index}.loadType` }) ?? 'weight'
  const meta = loadTypeMeta(loadType)
  const panelId = `exercise-panel-${index}`
  const summaryExercise = {
    name: name || '',
    sets: sets ?? 3,
    reps: reps ?? 10,
    loadType,
  }
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'overflow-hidden rounded-xl border bg-white shadow-sm transition-shadow',
        isOpen && 'ring-1 ring-brand-100',
        hasError ? 'border-red-300' : 'border-zinc-200',
        isDragging && 'z-10 opacity-80 shadow-lg',
      )}
    >
      <div className="flex items-center">
        <button
          type="button"
          className="ml-2 hidden shrink-0 rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 lg:inline-flex"
          aria-label={`Arrastrar ejercicio ${index + 1}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-controls={panelId}
          className={cn(
            'flex min-w-0 flex-1 items-center gap-2 px-3 py-3 text-left transition-colors',
            'hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500',
            isOpen && 'bg-zinc-50/80',
          )}
        >
          <ChevronDown
            className={cn(
              'size-4 shrink-0 text-zinc-400 transition-transform',
              isOpen && 'rotate-180 text-brand-600',
            )}
          />
          <span className="hidden shrink-0 text-xs font-medium text-zinc-400 sm:inline">
            Ejercicio {index + 1}
          </span>
          <span className={cn('truncate text-sm font-semibold', name ? 'text-zinc-800' : 'text-zinc-400')}>
            {name || 'Sin nombre'}
          </span>
          {!isOpen && (
            <ExercisePrescription
              exercise={summaryExercise}
              className="ml-auto hidden shrink-0 pl-2 sm:flex"
            />
          )}
          {hasError && <span className="size-1.5 shrink-0 rounded-full bg-red-500" aria-hidden />}
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Eliminar ejercicio ${index + 1}`}
          className="mr-2 shrink-0 rounded-lg border border-transparent p-1.5 text-zinc-400 hover:border-red-100 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      {isOpen && (
        <div id={panelId} className="space-y-4 border-t border-zinc-100 bg-zinc-50/40 p-4">
          <FormField label="Nombre del ejercicio">
            <Input placeholder="Ej. Press militar" {...register(`exercises.${index}.name`)} />
          </FormField>

          <FormField
            label="Tipo de carga"
            tooltip="Define qué campos verá el socio al registrar este ejercicio."
          >
            <LoadTypePicker
              value={normalizeLoadType(loadType)}
              onChange={(value) => setValue(`exercises.${index}.loadType`, value)}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <FormField label="Series" hint="Cantidad de veces">
              <Input
                type="number"
                placeholder="4"
                {...register(`exercises.${index}.sets`, { valueAsNumber: true })}
              />
            </FormField>
            <FormField
              label={meta.shape === 'time_load' ? 'Reps (ref.)' : 'Reps'}
              hint={meta.shape === 'time_load' ? 'Referencia' : 'Por serie'}
            >
              <Input
                type="number"
                placeholder="10"
                {...register(`exercises.${index}.reps`, { valueAsNumber: true })}
              />
            </FormField>
            <FormField label="Descanso" hint="En segundos">
              <Input
                type="number"
                placeholder="90"
                {...register(`exercises.${index}.restSec`, { valueAsNumber: true })}
              />
            </FormField>
          </div>

          {meta.shape === 'weight_reps' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField
                label="Intensidad"
                tooltip="RPE = esfuerzo percibido del 1 al 10 (10 = máximo)."
              >
                <Input placeholder="Ej. RPE 7" {...register(`exercises.${index}.intensity`)} />
              </FormField>
              <FormField label="Peso objetivo" hint="Peso total en kg">
                <Input placeholder="Ej. 80 kg" {...register(`exercises.${index}.weight`)} />
              </FormField>
            </div>
          )}

          {meta.shape === 'time_load' && (
            <FormField label="Intensidad" hint="Ej. segundos por serie">
              <Input placeholder="Ej. 40 seg" {...register(`exercises.${index}.intensity`)} />
            </FormField>
          )}

          {meta.shape === 'reps_only' && (
            <FormField label="Intensidad" tooltip="Usá este campo para indicar RPE, dificultad o una referencia técnica.">
              <Input placeholder="Ej. RPE 8" {...register(`exercises.${index}.intensity`)} />
            </FormField>
          )}

          <FormField label="Notas">
            <Input
              placeholder="Ej. Si hay dolor, saltar"
              {...register(`exercises.${index}.notes`)}
            />
          </FormField>
        </div>
      )}
    </div>
  )
}


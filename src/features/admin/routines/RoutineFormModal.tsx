import { useState } from 'react'
import {
  Controller,
  useForm,
  useFieldArray,
  useWatch,
  type Control,
  type FieldErrors,
  type UseFormRegister,
  type UseFormSetValue,
} from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ChevronDown, Plus, Trash2 } from 'lucide-react'
import type { Exercise, LoadType, Routine, RoutineIconKey } from '@/types'
import { Badge, Button, FormField, IconSelect, Input, Modal } from '@/components/ui'
import { cn } from '@/utils/cn'
import {
  formatExerciseVolume,
  LOAD_TYPE_OPTIONS,
  loadTypeMeta,
  normalizeLoadType,
} from '@/utils/loadTypes'
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
  name: z.string().min(1, 'Nombre'),
  sets: z.number().min(1),
  reps: z.number().min(1),
  intensity: z.string().optional(),
  weight: z.string().optional(),
  loadType: z.enum(LOAD_TYPE_VALUES).optional(),
  restSec: z.number().min(0),
  notes: z.string().optional(),
})

const schema = z.object({
  name: z.string().min(2, 'Ingresá un nombre'),
  description: z.string().optional(),
  icon: z.enum(ROUTINE_ICON_VALUES).optional(),
  exercises: z.array(exerciseSchema).min(1, 'Agregá al menos un ejercicio'),
})
type FormValues = z.infer<typeof schema>

const EMPTY_EXERCISE = {
  name: '',
  sets: 3,
  reps: 10,
  intensity: '',
  weight: '',
  loadType: 'weight' as const,
  restSec: 60,
  notes: '',
}

type FormExercise = z.infer<typeof exerciseSchema>

function toFormExercises(exercises?: Exercise[]): FormExercise[] {
  if (!exercises?.length) return [EMPTY_EXERCISE]
  return exercises.map((e) => ({
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

export function RoutineFormModal({
  open,
  onClose,
  onSubmit,
  initial,
  createdBy,
  saving,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (data: Omit<Routine, 'id'>) => void
  initial?: Routine | null
  createdBy: string
  saving?: boolean
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? 'Editar rutina' : 'Nueva rutina'}
      size="xl"
    >
      <RoutineForm
        onClose={onClose}
        onSubmit={onSubmit}
        initial={initial}
        createdBy={createdBy}
        saving={saving}
      />
    </Modal>
  )
}

function RoutineForm({
  onClose,
  onSubmit,
  initial,
  createdBy,
  saving,
}: {
  onClose: () => void
  onSubmit: (data: Omit<Routine, 'id'>) => void
  initial?: Routine | null
  createdBy: string
  saving?: boolean
}) {
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
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'exercises',
  })

  const [openIndex, setOpenIndex] = useState(initial ? -1 : 0)

  const toggle = (i: number) => setOpenIndex((cur) => (cur === i ? -1 : i))
  const addExercise = () => {
    setOpenIndex(fields.length)
    append(EMPTY_EXERCISE)
  }
  const removeExercise = (i: number) => {
    remove(i)
    setOpenIndex((cur) => (cur === i ? -1 : cur > i ? cur - 1 : cur))
  }

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

  return (
    <form onSubmit={handleSubmit(submit, onInvalid)} className="space-y-5">
      <FormField label="Nombre de la rutina" error={errors.name?.message} required>
        <Input {...register('name')} invalid={!!errors.name} placeholder="Ej. Full body A" />
      </FormField>
      <FormField label="Descripción">
        <Input {...register('description')} placeholder="Notas generales" />
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

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold text-zinc-800">
            Ejercicios <span className="font-normal text-zinc-400">({fields.length})</span>
          </p>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            leftIcon={<Plus className="size-4" />}
            onClick={addExercise}
          >
            Agregar
          </Button>
        </div>
        {errors.exercises?.message && (
          <p className="mb-2 text-xs text-red-500">{errors.exercises.message}</p>
        )}

        <div className="space-y-2">
          {fields.map((field, i) => (
            <ExerciseCard
              key={field.id}
              index={i}
              control={control}
              register={register}
              setValue={setValue}
              isOpen={openIndex === i}
              onToggle={() => toggle(i)}
              onRemove={() => removeExercise(i)}
              canRemove={fields.length > 1}
              hasError={!!errors.exercises?.[i]}
            />
          ))}
        </div>
      </div>

      <div className="sticky bottom-0 -mx-5 flex justify-end gap-2 border-t border-zinc-100 bg-surface px-5 py-4">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" loading={saving}>
          {initial ? 'Guardar' : 'Crear rutina'}
        </Button>
      </div>
    </form>
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

function ExerciseCard({
  index,
  control,
  register,
  setValue,
  isOpen,
  onToggle,
  onRemove,
  canRemove,
  hasError,
}: {
  index: number
  control: Control<FormValues>
  register: UseFormRegister<FormValues>
  setValue: UseFormSetValue<FormValues>
  isOpen: boolean
  onToggle: () => void
  onRemove: () => void
  canRemove: boolean
  hasError: boolean
}) {
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

  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border bg-white shadow-sm transition-shadow',
        isOpen && 'ring-1 ring-brand-100',
        hasError ? 'border-red-300' : 'border-zinc-200',
      )}
    >
      <div className="flex items-center">
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
          <span className="shrink-0 text-xs font-medium text-zinc-400">Ejercicio {index + 1}</span>
          <span
            className={cn('truncate text-sm font-semibold', name ? 'text-zinc-800' : 'text-zinc-400')}
          >
            {name || 'Sin nombre'}
          </span>
          {!isOpen && (
            <span className="ml-auto flex shrink-0 items-center gap-1.5 pl-2">
              <Badge tone="neutral">{formatExerciseVolume(summaryExercise)}</Badge>
              <Badge tone="brand">{meta.shortLabel}</Badge>
            </span>
          )}
          {hasError && <span className="size-1.5 shrink-0 rounded-full bg-red-500" aria-hidden />}
        </button>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Eliminar ejercicio ${index + 1}`}
            className="mr-2 shrink-0 rounded-lg border border-transparent p-1.5 text-zinc-400 hover:border-red-100 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          >
            <Trash2 className="size-4" />
          </button>
        )}
      </div>

      {isOpen && (
        <div id={panelId} className="space-y-4 border-t border-zinc-100 bg-zinc-50/40 p-4">
          <FormField label="Nombre del ejercicio">
            <Input placeholder="Ej. Press militar" {...register(`exercises.${index}.name`)} />
          </FormField>

          <FormField label="Tipo de carga" hint="Define los campos que carga el socio">
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
              hint={meta.shape === 'time_load' ? 'Opcional, referencia' : 'Por serie'}
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
                hint="Opcional"
                tooltip="RPE = esfuerzo percibido del 1 al 10 (10 = máximo)."
              >
                <Input placeholder="Ej. RPE 7" {...register(`exercises.${index}.intensity`)} />
              </FormField>
              <FormField label="Peso objetivo" hint="Opcional · peso total en kg">
                <Input placeholder="Ej. 80 kg" {...register(`exercises.${index}.weight`)} />
              </FormField>
            </div>
          )}

          {meta.shape === 'time_load' && (
            <FormField label="Intensidad" hint="Opcional · ej. segundos por serie">
              <Input placeholder="Ej. 40 seg" {...register(`exercises.${index}.intensity`)} />
            </FormField>
          )}

          {meta.shape === 'reps_only' && (
            <FormField label="Intensidad" hint="Opcional">
              <Input placeholder="Ej. RPE 8" {...register(`exercises.${index}.intensity`)} />
            </FormField>
          )}

          <FormField label="Notas (opcional)">
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

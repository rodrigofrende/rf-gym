import { useState } from 'react'
import {
  useForm,
  useFieldArray,
  useWatch,
  type Control,
  type FieldErrors,
  type UseFormRegister,
} from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ChevronDown, Plus, Trash2 } from 'lucide-react'
import type { Exercise, Routine } from '@/types'
import { Button, FormField, Input, Modal, Select } from '@/components/ui'
import { cn } from '@/utils/cn'
import { LOAD_TYPE_OPTIONS } from '@/utils/loadTypes'

const LOAD_TYPE_VALUES = [
  'weight',
  'cable',
  'barbell',
  'unilateral',
  'bodyweight',
  'isometric',
] as const

const exerciseSchema = z.object({
  name: z.string().min(1, 'Nombre'),
  sets: z.number().min(1),
  reps: z.number().min(1),
  // Intensidad y/o peso: ambos opcionales, el usuario completa el que quiera.
  intensity: z.string().optional(),
  weight: z.string().optional(),
  loadType: z.enum(LOAD_TYPE_VALUES).optional(),
  restSec: z.number().min(0),
  notes: z.string().optional(),
})

const schema = z.object({
  name: z.string().min(2, 'Ingresá un nombre'),
  description: z.string().optional(),
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
    loadType: e.loadType ?? 'weight',
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
      size="lg"
    >
      {/* El form vive en un componente que se monta al abrir el modal (Modal
          desmonta sus hijos al cerrar), así su estado arranca fresco cada vez. */}
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
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initial?.name ?? '',
      description: initial?.description ?? '',
      exercises: toFormExercises(initial?.exercises),
    },
  })
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'exercises',
  })

  // Acordeón: un ejercicio abierto a la vez para navegar/editar cómodo.
  // -1 = todos colapsados. Rutina nueva → abrir el único; edición (varios
  // ejercicios) → colapsar todo para ver la lista de un vistazo.
  const [openIndex, setOpenIndex] = useState(initial ? -1 : 0)

  const toggle = (i: number) => setOpenIndex((cur) => (cur === i ? -1 : i))
  const addExercise = () => {
    setOpenIndex(fields.length) // el nuevo queda al final y abierto
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
      createdBy,
      exercises: v.exercises,
    })
  }
  // Si hay errores en un ejercicio colapsado, abrirlo para que el error sea visible.
  const onInvalid = (errs: FieldErrors<FormValues>) => {
    const exErrs = errs.exercises
    if (Array.isArray(exErrs)) {
      const idx = exErrs.findIndex(Boolean)
      if (idx >= 0) setOpenIndex(idx)
    }
  }

  return (
    <form onSubmit={handleSubmit(submit, onInvalid)} className="space-y-4">
      <FormField label="Nombre de la rutina" error={errors.name?.message} required>
        <Input {...register('name')} invalid={!!errors.name} placeholder="Ej. Full body A" />
      </FormField>
      <FormField label="Descripción">
        <Input {...register('description')} placeholder="Notas generales" />
      </FormField>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium text-zinc-700">
            Ejercicios <span className="text-zinc-400">({fields.length})</span>
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
              isOpen={openIndex === i}
              onToggle={() => toggle(i)}
              onRemove={() => removeExercise(i)}
              canRemove={fields.length > 1}
              hasError={!!errors.exercises?.[i]}
            />
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
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

function ExerciseCard({
  index,
  control,
  register,
  isOpen,
  onToggle,
  onRemove,
  canRemove,
  hasError,
}: {
  index: number
  control: Control<FormValues>
  register: UseFormRegister<FormValues>
  isOpen: boolean
  onToggle: () => void
  onRemove: () => void
  canRemove: boolean
  hasError: boolean
}) {
  // Resumen en el encabezado para identificar el ejercicio colapsado.
  const name = useWatch({ control, name: `exercises.${index}.name` })
  const sets = useWatch({ control, name: `exercises.${index}.sets` })
  const reps = useWatch({ control, name: `exercises.${index}.reps` })
  const panelId = `exercise-panel-${index}`

  return (
    <div
      className={cn(
        'overflow-hidden rounded-lg border',
        hasError ? 'border-red-300' : 'border-zinc-200',
      )}
    >
      <div className="flex items-center">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-controls={panelId}
          className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2.5 text-left hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500"
        >
          <ChevronDown
            className={cn(
              'size-4 shrink-0 text-zinc-400 transition-transform',
              isOpen && 'rotate-180',
            )}
          />
          <span className="shrink-0 text-xs font-medium text-zinc-400">Ejercicio {index + 1}</span>
          <span
            className={cn('truncate text-sm font-medium', name ? 'text-zinc-700' : 'text-zinc-400')}
          >
            {name || 'Sin nombre'}
          </span>
          <span className="ml-auto flex shrink-0 items-center gap-2 pl-2">
            {!isOpen && sets != null && reps != null && (
              <span className="text-xs text-zinc-400">
                {sets}×{reps}
              </span>
            )}
            {hasError && <span className="size-1.5 rounded-full bg-red-500" aria-hidden />}
          </span>
        </button>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Eliminar ejercicio ${index + 1}`}
            className="mr-2 shrink-0 rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          >
            <Trash2 className="size-4" />
          </button>
        )}
      </div>

      {isOpen && (
        <div id={panelId} className="space-y-3 border-t border-zinc-100 p-3">
          <FormField label="Nombre del ejercicio">
            <Input placeholder="Ej. Press militar" {...register(`exercises.${index}.name`)} />
          </FormField>
          <FormField label="Tipo de carga" hint="Define los campos que carga el socio">
            <Select {...register(`exercises.${index}.loadType`)} options={LOAD_TYPE_OPTIONS} />
          </FormField>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <FormField label="Series" hint="Cantidad de veces">
              <Input
                type="number"
                placeholder="4"
                {...register(`exercises.${index}.sets`, {
                  valueAsNumber: true,
                })}
              />
            </FormField>
            <FormField label="Reps" hint="Por serie">
              <Input
                type="number"
                placeholder="10"
                {...register(`exercises.${index}.reps`, {
                  valueAsNumber: true,
                })}
              />
            </FormField>
            <FormField label="Descanso" hint="En segundos">
              <Input
                type="number"
                placeholder="90"
                {...register(`exercises.${index}.restSec`, {
                  valueAsNumber: true,
                })}
              />
            </FormField>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField
              label="Intensidad"
              hint="Opcional"
              tooltip="RPE = esfuerzo percibido del 1 al 10 (10 = máximo). Podés usar RPE o dejarlo vacío y completar solo el peso."
            >
              <Input placeholder="Ej. RPE 7" {...register(`exercises.${index}.intensity`)} />
            </FormField>
            <FormField label="Peso" hint="Opcional · ej. kg">
              <Input placeholder="Ej. 80 kg" {...register(`exercises.${index}.weight`)} />
            </FormField>
          </div>
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

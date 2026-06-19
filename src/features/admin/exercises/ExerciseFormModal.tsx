import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { ExerciseDefinition, LoadType, MuscleGroup } from '@/types'
import { Badge, Button, FormField, Input, Modal, Select, Textarea } from '@/components/ui'
import { cn } from '@/utils/cn'
import {
  EXERCISE_CATEGORY_OPTIONS,
  MUSCLE_GROUP_OPTIONS,
  categoryLabel,
  muscleGroupLabel,
} from '@/utils/exercises'
import { LOAD_TYPE_OPTIONS } from '@/utils/loadTypes'

const LOAD_TYPE_VALUES = ['weight', 'time', 'bodyweight'] as const satisfies readonly LoadType[]

const schema = z.object({
  name: z.string().min(2, 'Ingresá un nombre'),
  category: z.enum(EXERCISE_CATEGORY_OPTIONS),
  muscleGroups: z.array(z.enum(MUSCLE_GROUP_OPTIONS)).min(1, 'Elegí al menos un músculo'),
  loadType: z.enum(LOAD_TYPE_VALUES),
  description: z.string().optional(),
  defaultSets: z.number().min(1).optional(),
  defaultReps: z.number().min(1).optional(),
  defaultRestSec: z.number().min(0).optional(),
})
type FormValues = z.infer<typeof schema>

const optionalNumber = (value: unknown) => (value === '' || value == null ? undefined : Number(value))

export function ExerciseFormModal({
  open,
  onClose,
  onSubmit,
  initial,
  createdBy,
  saving,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (data: Omit<ExerciseDefinition, 'id'>) => void
  initial?: ExerciseDefinition | null
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
    values: {
      name: initial?.name ?? '',
      category: initial?.category ?? 'strength',
      muscleGroups: initial?.muscleGroups ?? [],
      loadType: initial?.loadType ?? 'weight',
      description: initial?.description ?? '',
      defaultSets: initial?.defaultSets,
      defaultReps: initial?.defaultReps,
      defaultRestSec: initial?.defaultRestSec,
    },
  })

  const submit = (v: FormValues) => {
    onSubmit({
      name: v.name.trim(),
      category: v.category,
      muscleGroups: v.muscleGroups,
      loadType: v.loadType,
      description: v.description?.trim() || undefined,
      defaultSets: v.defaultSets,
      defaultReps: v.defaultReps,
      defaultRestSec: v.defaultRestSec,
      createdBy,
    })
  }

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Editar ejercicio' : 'Nuevo ejercicio'} size="xl">
      <form onSubmit={handleSubmit(submit)} className="space-y-4">
        <FormField label="Nombre del ejercicio" error={errors.name?.message} required>
          <Input placeholder="Ej. Press banca" {...register('name')} invalid={!!errors.name} />
        </FormField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Tipo de ejercicio" error={errors.category?.message} required>
            <Select
              {...register('category')}
              options={EXERCISE_CATEGORY_OPTIONS.map((value) => ({
                value,
                label: categoryLabel(value),
              }))}
            />
          </FormField>
          <FormField
            label="Tipo de carga"
            error={errors.loadType?.message}
            tooltip="Define qué campos verá el socio al registrar su entrenamiento."
            required
          >
            <Select
              {...register('loadType')}
              options={LOAD_TYPE_OPTIONS.map(({ value, label }) => ({ value, label }))}
            />
          </FormField>
        </div>

        <Controller
          control={control}
          name="muscleGroups"
          render={({ field }) => (
            <FormField
              label="Músculos que trabaja"
              error={errors.muscleGroups?.message}
              tooltip="Podés elegir varios; se usan para filtrar el pool cuando armás rutinas."
              required
            >
              <div className="flex flex-wrap gap-2">
                {MUSCLE_GROUP_OPTIONS.map((value) => {
                  const selected = field.value.includes(value)
                  const nextValue = selected
                    ? field.value.filter((item) => item !== value)
                    : [...field.value, value]

                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => field.onChange(nextValue)}
                      className={cn(
                        'rounded-[var(--radius-pill)] border px-3 py-1.5 text-sm font-medium transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                        selected
                          ? 'border-brand-500 bg-brand-50 text-brand-700'
                          : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50',
                      )}
                    >
                      {muscleGroupLabel(value)}
                    </button>
                  )
                })}
              </div>
              {field.value.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {field.value.map((value: MuscleGroup) => (
                    <Badge key={value} tone="brand">
                      {muscleGroupLabel(value)}
                    </Badge>
                  ))}
                </div>
              )}
            </FormField>
          )}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FormField
            label="Series por defecto"
            tooltip="Se precarga al agregar este ejercicio a una rutina; después podés ajustarlo."
          >
            <Input
              type="number"
              min={1}
              placeholder="3"
              {...register('defaultSets', { setValueAs: optionalNumber })}
            />
          </FormField>
          <FormField
            label="Reps por defecto"
            tooltip="Se precarga al agregar este ejercicio a una rutina; después podés ajustarlo."
          >
            <Input
              type="number"
              min={1}
              placeholder="10"
              {...register('defaultReps', { setValueAs: optionalNumber })}
            />
          </FormField>
          <FormField
            label="Descanso por defecto"
            hint="Segundos"
            tooltip="Se precarga al agregar este ejercicio a una rutina; después podés ajustarlo."
          >
            <Input
              type="number"
              min={0}
              placeholder="60"
              {...register('defaultRestSec', { setValueAs: optionalNumber })}
            />
          </FormField>
        </div>

        <FormField label="Descripción">
          <Textarea rows={3} placeholder="Notas técnicas o indicaciones generales" {...register('description')} />
        </FormField>

        <div className="flex justify-end gap-2 border-t border-zinc-100 pt-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            {initial ? 'Guardar' : 'Crear ejercicio'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

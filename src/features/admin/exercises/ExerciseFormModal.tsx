import { Controller, useForm } from 'react-hook-form'
import { useId } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { ExerciseDefinition, LoadType } from '@/types'
import { Button, FormField, Input, Modal, Select, Text, Textarea } from '@/components/ui'
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
  defaultRestMin: z.number().min(0).optional(),
})
type FormValues = z.infer<typeof schema>

const optionalNumber = (value: unknown) => (value === '' || value == null ? undefined : Number(value))
const secondsToMinutes = (seconds?: number) =>
  seconds == null ? undefined : Number((seconds / 60).toFixed(2))
const minutesToSeconds = (minutes?: number) =>
  minutes == null ? undefined : Math.round(minutes * 60)

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
  const formId = useId()
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
      defaultRestMin: secondsToMinutes(initial?.defaultRestSec),
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
      defaultRestSec: minutesToSeconds(v.defaultRestMin),
      createdBy,
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? 'Editar ejercicio' : 'Nuevo ejercicio'}
      size="xl"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" fullWidth className="sm:w-auto" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form={formId} fullWidth className="sm:w-auto" loading={saving}>
            {initial ? 'Guardar' : 'Crear ejercicio'}
          </Button>
        </div>
      }
    >
      <form id={formId} onSubmit={handleSubmit(submit)} className="space-y-5">
        <section className="space-y-4 rounded-2xl border border-zinc-100 bg-white p-4">
          <Text variant="label">Datos básicos</Text>
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
        </section>

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
                <Text variant="caption" className="mt-2">
                  {field.value.length} músculo{field.value.length === 1 ? '' : 's'} seleccionado
                  {field.value.length === 1 ? '' : 's'}.
                </Text>
              )}
            </FormField>
          )}
        />

        <section className="space-y-4 rounded-2xl border border-zinc-100 bg-surface-muted/50 p-4">
          <div>
            <Text variant="label">Valores por defecto</Text>
            <Text variant="caption">
              Se precargan al agregar este ejercicio a una rutina. Si usás series descendentes,
              tomá estos valores como referencia y detallá el esquema al editar la rutina.
            </Text>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField label="Series" hint="Total de series. Ej. 4">
              <Input
                type="number"
                min={1}
                placeholder="3"
                {...register('defaultSets', { setValueAs: optionalNumber })}
              />
            </FormField>
            <FormField label="Reps" hint="Referencia por serie. Ej. 12-10-8 en notas de rutina.">
              <Input
                type="number"
                min={1}
                placeholder="10"
                {...register('defaultReps', { setValueAs: optionalNumber })}
              />
            </FormField>
            <FormField
              label="Descanso"
              hint="En minutos"
              tooltip="Se guarda internamente en segundos para mantener compatibilidad con rutinas existentes."
            >
              <Input
                type="number"
                min={0}
                step={0.5}
                placeholder="2"
                {...register('defaultRestMin', { setValueAs: optionalNumber })}
              />
            </FormField>
          </div>
        </section>

        <FormField label="Descripción">
          <Textarea rows={3} placeholder="Notas técnicas o indicaciones generales" {...register('description')} />
        </FormField>
      </form>
    </Modal>
  )
}

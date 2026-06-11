import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2 } from 'lucide-react'
import type { Exercise, Routine } from '@/types'
import { Button, FormField, Input, Modal } from '@/components/ui'

const exerciseSchema = z.object({
  name: z.string().min(1, 'Nombre'),
  sets: z.number().min(1),
  reps: z.number().min(1),
  intensity: z.string().optional(),
  restSec: z.number().min(0),
  notes: z.string().optional(),
})

const schema = z.object({
  name: z.string().min(2, 'Ingresá un nombre'),
  description: z.string().optional(),
  exercises: z.array(exerciseSchema).min(1, 'Agregá al menos un ejercicio'),
})
type FormValues = z.infer<typeof schema>

const EMPTY_EXERCISE = { name: '', sets: 3, reps: 10, intensity: '', restSec: 60, notes: '' }

type FormExercise = z.infer<typeof exerciseSchema>

function toFormExercises(exercises?: Exercise[]): FormExercise[] {
  if (!exercises?.length) return [EMPTY_EXERCISE]
  return exercises.map((e) => ({
    name: e.name,
    sets: e.sets,
    reps: e.reps,
    intensity: e.intensity ?? '',
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
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      name: initial?.name ?? '',
      description: initial?.description ?? '',
      exercises: toFormExercises(initial?.exercises),
    },
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'exercises' })

  const submit = (v: FormValues) => {
    onSubmit({
      name: v.name,
      description: v.description,
      createdBy,
      exercises: v.exercises,
    })
  }

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Editar rutina' : 'Nueva rutina'} size="lg">
      <form onSubmit={handleSubmit(submit)} className="space-y-4">
        <FormField label="Nombre de la rutina" error={errors.name?.message} required>
          <Input {...register('name')} invalid={!!errors.name} placeholder="Ej. Full body A" />
        </FormField>
        <FormField label="Descripción">
          <Input {...register('description')} placeholder="Notas generales" />
        </FormField>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700">Ejercicios</p>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              leftIcon={<Plus className="size-4" />}
              onClick={() => append(EMPTY_EXERCISE)}
            >
              Agregar
            </Button>
          </div>
          {errors.exercises?.message && (
            <p className="mb-2 text-xs text-red-500">{errors.exercises.message}</p>
          )}

          <div className="space-y-3">
            {fields.map((field, i) => (
              <div key={field.id} className="rounded-lg border border-slate-200 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400">Ejercicio {i + 1}</span>
                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => remove(i)}
                      className="text-slate-400 hover:text-red-500"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  <FormField label="Nombre del ejercicio">
                    <Input placeholder="Ej. Press militar" {...register(`exercises.${i}.name`)} />
                  </FormField>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <FormField label="Series" hint="Cantidad de veces">
                      <Input type="number" placeholder="4" {...register(`exercises.${i}.sets`, { valueAsNumber: true })} />
                    </FormField>
                    <FormField label="Reps" hint="Por serie">
                      <Input type="number" placeholder="10" {...register(`exercises.${i}.reps`, { valueAsNumber: true })} />
                    </FormField>
                    <FormField label="Intensidad" hint="RPE 1-10 o peso (kg)">
                      <Input placeholder="RPE 7 o 20 kg" {...register(`exercises.${i}.intensity`)} />
                    </FormField>
                    <FormField label="Descanso" hint="En segundos">
                      <Input type="number" placeholder="90" {...register(`exercises.${i}.restSec`, { valueAsNumber: true })} />
                    </FormField>
                  </div>
                  <FormField label="Notas (opcional)">
                    <Input placeholder="Ej. Si hay dolor, saltar" {...register(`exercises.${i}.notes`)} />
                  </FormField>
                  <p className="rounded-md bg-brand-50 px-2.5 py-1.5 text-xs text-brand-700">
                    <strong>RPE</strong> = esfuerzo percibido del 1 al 10 (10 = máximo).
                    También podés indicar directamente el peso en kg.
                  </p>
                </div>
              </div>
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
    </Modal>
  )
}

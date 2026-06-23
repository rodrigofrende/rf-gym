import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { SubscriptionPlan } from '@/types'
import { Button, FormField, Input, Modal, MoneyInput, Select, Textarea, Toggle } from '@/components/ui'

const schema = z.object({
  name: z.string().min(2, 'Ingresá un nombre'),
  price: z.number().min(0),
  maxAdmins: z.number().min(0),
  maxMembers: z.number().min(0),
  maxRoutines: z.number().min(0),
  maxExercises: z.number().min(0),
  logsEnabled: z.boolean(),
  maxLogsPerMember: z.number().min(0),
  whiteLabel: z.enum(['none', 'basic', 'full']),
  features: z.string().optional(),
  active: z.boolean(),
})
type FormValues = z.infer<typeof schema>

const DEFAULT_VALUES: FormValues = {
  name: '',
  price: 0,
  maxAdmins: 1,
  maxMembers: 30,
  maxRoutines: 10,
  maxExercises: 30,
  logsEnabled: false,
  maxLogsPerMember: 0,
  whiteLabel: 'none',
  features: '',
  active: true,
}

function valuesFromPlan(plan?: SubscriptionPlan | null): FormValues {
  if (!plan) return DEFAULT_VALUES
  return {
    name: plan.name,
    price: plan.price,
    maxAdmins: plan.maxAdmins,
    maxMembers: plan.maxMembers,
    maxRoutines: plan.maxRoutines,
    maxExercises: plan.maxExercises,
    logsEnabled: plan.logsEnabled,
    maxLogsPerMember: plan.maxLogsPerMember,
    whiteLabel: plan.whiteLabel,
    features: (plan.features ?? []).join('\n'),
    active: plan.active,
  }
}

export function PlanFormModal({
  open,
  onClose,
  onSubmit,
  initial,
  saving,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (data: Omit<SubscriptionPlan, 'id'>) => void
  initial?: SubscriptionPlan | null
  saving?: boolean
}) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULT_VALUES,
  })

  useEffect(() => {
    if (open) reset(valuesFromPlan(initial))
  }, [initial, open, reset])

  const close = () => {
    reset(valuesFromPlan(initial))
    onClose()
  }

  const submit = (v: FormValues) => {
    onSubmit({
      name: v.name,
      price: v.price,
      maxAdmins: v.maxAdmins,
      maxMembers: v.maxMembers,
      maxRoutines: v.maxRoutines,
      maxExercises: v.maxExercises,
      logsEnabled: v.logsEnabled,
      maxLogsPerMember: v.maxLogsPerMember,
      whiteLabel: v.whiteLabel,
      features: (v.features ?? '')
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      active: v.active,
    })
  }

  return (
    <Modal open={open} onClose={close} title={initial ? 'Editar plan' : 'Nuevo plan'} size="xl">
      <form onSubmit={handleSubmit(submit)} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Nombre del plan" error={errors.name?.message} required>
            <Input placeholder="Ej. Profesional" {...register('name')} invalid={!!errors.name} />
          </FormField>
          <FormField label="Precio mensual">
            <Controller
              control={control}
              name="price"
              render={({ field }) => <MoneyInput value={field.value ?? 0} onChange={field.onChange} />}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FormField label="Máx. admins" hint="0 = ilimitado">
            <Input type="number" min={0} {...register('maxAdmins', { valueAsNumber: true })} />
          </FormField>
          <FormField label="Máx. socios" hint="0 = ilimitado">
            <Input type="number" min={0} {...register('maxMembers', { valueAsNumber: true })} />
          </FormField>
          <FormField label="Máx. rutinas" hint="0 = ilimitado">
            <Input type="number" min={0} {...register('maxRoutines', { valueAsNumber: true })} />
          </FormField>
          <FormField label="Máx. ejercicios" hint="0 = ilimitado">
            <Input type="number" min={0} {...register('maxExercises', { valueAsNumber: true })} />
          </FormField>
        </div>

        <div className="space-y-3 rounded-lg border border-zinc-200 p-4">
          <Controller
            control={control}
            name="logsEnabled"
            render={({ field }) => (
              <Toggle
                checked={field.value}
                onChange={field.onChange}
                label="Registro de cargas para alumnos"
                tooltip="Cuando está activo, los socios pueden registrar series, pesos, reps o segundos según el tipo de carga de cada ejercicio."
              />
            )}
          />
          <FormField
            label="Máx. registros por alumno"
            hint="0 = ilimitado"
            tooltip="Este límite solo aplica si el registro de cargas para alumnos está habilitado."
          >
            <Input type="number" min={0} {...register('maxLogsPerMember', { valueAsNumber: true })} />
          </FormField>
        </div>

        <FormField
          label="White-label"
          tooltip="Sin white-label no permite personalización. Basic habilita logo y colores. Full queda reservado para personalización completa."
        >
          <Select
            {...register('whiteLabel')}
            options={[
              { value: 'none', label: 'Sin white-label' },
              { value: 'basic', label: 'White-label (logo + colores)' },
              { value: 'full', label: 'White-label completo' },
            ]}
          />
        </FormField>

        <FormField label="Características (una por línea)">
          <Textarea
            {...register('features')}
            rows={4}
            placeholder={'Hasta 3 admins\n150 socios\nPanel de analíticas'}
          />
        </FormField>

        <Controller
          control={control}
          name="active"
          render={({ field }) => (
            <Toggle
              checked={field.value}
              onChange={field.onChange}
              label="Activo (disponible para asignar)"
              tooltip="Los planes inactivos no deberían asignarse a nuevos gimnasios, pero se conservan para gimnasios existentes."
            />
          )}
        />

        <div className="flex justify-end gap-2 border-t border-zinc-100 pt-3">
          <Button type="button" variant="secondary" onClick={close}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            {initial ? 'Guardar' : 'Crear plan'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

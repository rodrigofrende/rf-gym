import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { SubscriptionPlan } from '@/types'
import { Button, FormField, Input, Modal, MoneyInput, Select, Toggle } from '@/components/ui'

const schema = z.object({
  name: z.string().min(2, 'Ingresá un nombre'),
  price: z.number().min(0),
  maxAdmins: z.number().min(0),
  maxMembers: z.number().min(0),
  maxRoutines: z.number().min(0),
  logsEnabled: z.boolean(),
  maxLogsPerMember: z.number().min(0),
  whiteLabel: z.enum(['none', 'basic', 'full']),
  features: z.string().optional(),
  active: z.boolean(),
})
type FormValues = z.infer<typeof schema>

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
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      name: initial?.name ?? '',
      price: initial?.price ?? 0,
      maxAdmins: initial?.maxAdmins ?? 1,
      maxMembers: initial?.maxMembers ?? 30,
      maxRoutines: initial?.maxRoutines ?? 10,
      logsEnabled: initial?.logsEnabled ?? false,
      maxLogsPerMember: initial?.maxLogsPerMember ?? 0,
      whiteLabel: initial?.whiteLabel ?? 'none',
      features: (initial?.features ?? []).join('\n'),
      active: initial?.active ?? true,
    },
  })

  const submit = (v: FormValues) => {
    onSubmit({
      name: v.name,
      price: v.price,
      maxAdmins: v.maxAdmins,
      maxMembers: v.maxMembers,
      maxRoutines: v.maxRoutines,
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
    <Modal open={open} onClose={onClose} title={initial ? 'Editar plan' : 'Nuevo plan'} size="xl">
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FormField label="Máx. admins" hint="0 = ilimitado">
            <Input type="number" min={0} {...register('maxAdmins', { valueAsNumber: true })} />
          </FormField>
          <FormField label="Máx. socios" hint="0 = ilimitado">
            <Input type="number" min={0} {...register('maxMembers', { valueAsNumber: true })} />
          </FormField>
          <FormField label="Máx. rutinas" hint="0 = ilimitado">
            <Input type="number" min={0} {...register('maxRoutines', { valueAsNumber: true })} />
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
              />
            )}
          />
          <FormField label="Máx. registros por alumno" hint="0 = ilimitado (solo si está habilitado)">
            <Input type="number" min={0} {...register('maxLogsPerMember', { valueAsNumber: true })} />
          </FormField>
        </div>

        <FormField label="White-label">
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
          <textarea
            {...register('features')}
            rows={4}
            placeholder={'Hasta 3 admins\n150 socios\nPanel de analíticas'}
            className="w-full rounded-lg border border-zinc-200 bg-surface px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
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
            />
          )}
        />

        <div className="flex justify-end gap-2 border-t border-zinc-100 pt-3">
          <Button type="button" variant="secondary" onClick={onClose}>
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

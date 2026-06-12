import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { Tariff } from '@/types'
import { Button, FormField, Input, Modal, MoneyInput } from '@/components/ui'

const schema = z.object({
  name: z.string().min(2, 'Ingresá un nombre'),
  weeklyFrequency: z.number().min(0),
  price: z.number().min(0),
  description: z.string().optional(),
  active: z.boolean(),
})
type FormValues = z.infer<typeof schema>

export function TariffFormModal({
  open,
  onClose,
  onSubmit,
  initial,
  saving,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (data: Omit<Tariff, 'id'>) => void
  initial?: Tariff | null
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
      weeklyFrequency: initial?.weeklyFrequency ?? 3,
      price: initial?.price ?? 0,
      description: initial?.description ?? '',
      active: initial?.active ?? true,
    },
  })

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Editar tarifa' : 'Nueva tarifa'}>
      <form onSubmit={handleSubmit((v) => onSubmit(v))} className="space-y-4">
        <FormField label="Nombre del plan / servicio" error={errors.name?.message} required>
          <Input placeholder="Ej. Musculación" {...register('name')} invalid={!!errors.name} />
        </FormField>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Veces por semana" hint="0 = libre / sin límite">
            <Input
              type="number"
              min={0}
              {...register('weeklyFrequency', { valueAsNumber: true })}
            />
          </FormField>
          <FormField label="Precio mensual">
            <Controller
              control={control}
              name="price"
              render={({ field }) => <MoneyInput value={field.value ?? 0} onChange={field.onChange} />}
            />
          </FormField>
        </div>
        <FormField label="Descripción (opcional)">
          <Input placeholder="Ej. Acceso a sala de musculación" {...register('description')} />
        </FormField>
        <label className="flex items-center gap-2 text-sm font-medium text-zinc-700">
          <input type="checkbox" {...register('active')} className="size-4 rounded border-zinc-300" />
          Activa (visible para los socios)
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            {initial ? 'Guardar' : 'Crear tarifa'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { Tariff, TariffIconKey } from '@/types'
import { Button, FormField, IconSelect, Input, Modal, MoneyInput, Toggle } from '@/components/ui'
import { TARIFF_ICON_OPTIONS } from '@/utils/tariffIcons'

const TARIFF_ICON_VALUES = [
  'membership',
  'dumbbell',
  'activity',
  'heart',
  'users',
  'calendar',
  'star',
  'crown',
  'zap',
  'sparkles',
] as const satisfies readonly TariffIconKey[]

const schema = z.object({
  name: z.string().min(2, 'Ingresá un nombre'),
  icon: z.enum(TARIFF_ICON_VALUES).optional(),
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
      icon: initial?.icon ?? 'membership',
      weeklyFrequency: initial?.weeklyFrequency ?? 3,
      price: initial?.price ?? 0,
      description: initial?.description ?? '',
      active: initial?.active ?? true,
    },
  })

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Editar tarifa' : 'Nueva tarifa'} size="lg">
      <form onSubmit={handleSubmit((v) => onSubmit(v))} className="space-y-4">
        <FormField label="Icono de la tarifa">
          <Controller
            control={control}
            name="icon"
            render={({ field }) => (
              <IconSelect
                value={field.value ?? 'membership'}
                onChange={field.onChange}
                options={TARIFF_ICON_OPTIONS}
                placeholder="Elegir icono"
              />
            )}
          />
        </FormField>

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

        <Controller
          control={control}
          name="active"
          render={({ field }) => (
            <Toggle
              checked={field.value}
              onChange={field.onChange}
              label="Activa (visible para los socios)"
            />
          )}
        />

        <div className="flex justify-end gap-2 border-t border-zinc-100 pt-3">
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

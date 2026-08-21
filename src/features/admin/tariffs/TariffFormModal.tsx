import { useEffect, useId } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { Tariff, TariffIconKey } from '@/types'
import { Button, FormField, IconSelect, Input, Modal, MoneyInput, Textarea, Toggle } from '@/components/ui'
import { cn } from '@/utils/cn'
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

const FREQUENCY_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7] as const

const schema = z.object({
  name: z.string().min(2, 'Ingresá un nombre'),
  icon: z.enum(TARIFF_ICON_VALUES).optional(),
  weeklyFrequency: z.number().min(0, 'No puede ser menor a 0').max(7, 'El máximo es 7 veces por semana'),
  price: z.number().min(0),
  description: z.string().optional(),
  active: z.boolean(),
})
type FormValues = z.infer<typeof schema>

const DEFAULT_VALUES: FormValues = {
  name: '',
  icon: 'membership',
  weeklyFrequency: 3,
  price: 0,
  description: '',
  active: true,
}

function valuesFromTariff(tariff?: Tariff | null): FormValues {
  if (!tariff) return DEFAULT_VALUES
  return {
    name: tariff.name,
    icon: tariff.icon ?? 'membership',
    weeklyFrequency: tariff.weeklyFrequency,
    price: tariff.price,
    description: tariff.description ?? '',
    active: tariff.active,
  }
}

function FrequencySelect({
  id,
  value,
  onChange,
  invalid,
}: {
  id?: string
  value: number
  onChange: (value: number) => void
  invalid?: boolean
}) {
  return (
    <div
      id={id}
      role="radiogroup"
      aria-invalid={invalid || undefined}
      className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5"
    >
      {FREQUENCY_OPTIONS.map((option) => {
        const selected = option === value
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option)}
            className={cn(
              'h-11 shrink-0 rounded-[var(--radius-control)] px-3.5 text-sm font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1',
              selected
                ? 'bg-brand-600 text-white'
                : 'border border-zinc-200 bg-surface text-zinc-700 hover:bg-zinc-50',
            )}
          >
            {option === 0 ? 'Libre' : option}
          </button>
        )
      })}
    </div>
  )
}

export function TariffFormModal({
  open,
  onClose,
  onSubmit,
  onRequestDelete,
  initial,
  saving,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (data: Omit<Tariff, 'id'>) => void
  onRequestDelete?: () => void
  initial?: Tariff | null
  saving?: boolean
}) {
  const formId = useId()
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
    if (open) reset(valuesFromTariff(initial))
  }, [initial, open, reset])

  const close = () => {
    reset(valuesFromTariff(initial))
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title={initial ? 'Editar tarifa' : 'Nueva tarifa'}
      size="md"
      footer={
        <div className="space-y-3">
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" fullWidth className="sm:w-auto" onClick={close}>
              Cancelar
            </Button>
            <Button type="submit" form={formId} fullWidth className="sm:w-auto" loading={saving}>
              {initial ? 'Guardar' : 'Crear tarifa'}
            </Button>
          </div>
          {initial && onRequestDelete ? (
            <button
              type="button"
              onClick={onRequestDelete}
              className="w-full rounded-[var(--radius-control)] py-2 text-center text-sm font-medium text-red-600 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
            >
              Eliminar tarifa
            </button>
          ) : null}
        </div>
      }
    >
      <form id={formId} onSubmit={handleSubmit((values) => onSubmit(values))} className="space-y-5">
        <FormField label="Nombre del plan" error={errors.name?.message} required>
          <Input placeholder="Ej. Musculación" {...register('name')} invalid={!!errors.name} />
        </FormField>

        <FormField
          label="Veces por semana"
          hint="Libre = puede venir todos los días."
          error={errors.weeklyFrequency?.message}
        >
          <Controller
            control={control}
            name="weeklyFrequency"
            render={({ field }) => (
              <FrequencySelect
                value={field.value}
                onChange={field.onChange}
                invalid={!!errors.weeklyFrequency}
              />
            )}
          />
        </FormField>

        <FormField label="Precio mensual">
          <Controller
            control={control}
            name="price"
            render={({ field }) => <MoneyInput value={field.value ?? 0} onChange={field.onChange} />}
          />
        </FormField>

        <FormField label="Qué incluye" hint="Opcional. Lo ven los socios al elegir el plan.">
          <Textarea
            rows={2}
            placeholder="Ej. Sala de musculación y vestuarios"
            {...register('description')}
          />
        </FormField>

        <FormField label="Icono">
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

        <Controller
          control={control}
          name="active"
          render={({ field }) => (
            <Toggle
              checked={field.value}
              onChange={field.onChange}
              label="Plan activo"
              description="Solo los activos aparecen al asignar el servicio a un socio."
            />
          )}
        />
      </form>
    </Modal>
  )
}

import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Timestamp } from 'firebase/firestore'
import type { Member } from '@/types'
import { useTenant } from '@/providers/TenantProvider'
import { useTariffs } from '@/hooks/useTariffs'
import { Button, DateInput, FormField, Input, Modal, MoneyInput, Select } from '@/components/ui'
import { toDateInput } from '@/utils/format'
import { addMonths } from '@/utils/payments'
import { frequencyLabel, tariffLabel } from '@/utils/tariffs'

const schema = z.object({
  fullName: z.string().min(2, 'Ingresá el nombre'),
  email: z.string().email('Email inválido'),
  phone: z.string().optional(),
  birthDate: z.string().optional(),
  role: z.enum(['user', 'admin']),
  tariffId: z.string().optional(),
  monthlyCost: z.number().min(0),
  startDate: z.string().optional(),
  paymentDate: z.string().optional(),
  status: z.enum(['active', 'paused', 'overdue']),
})
type FormValues = z.infer<typeof schema>

const toTs = (value?: string) => (value ? Timestamp.fromDate(new Date(value)) : null)

/** Suma 1 mes exacto a una fecha YYYY-MM-DD (usa mediodía para evitar saltos de día). */
function plusOneMonth(dateStr: string): string {
  if (!dateStr) return ''
  return toDateInput(addMonths(new Date(`${dateStr}T12:00:00`), 1))
}

export function MemberFormModal({
  open,
  onClose,
  onSubmit,
  initial,
  saving,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (data: Omit<Member, 'id' | 'uid'>) => void
  initial?: Member | null
  saving?: boolean
}) {
  const { activeGymId } = useTenant()
  const { data: tariffs = [] } = useTariffs(activeGymId ?? '')

  const today = toDateInput(new Date())

  const {
    register,
    control,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      fullName: initial?.fullName ?? '',
      email: initial?.email ?? '',
      phone: initial?.phone ?? '',
      birthDate: toDateInput(initial?.birthDate),
      role: initial?.role ?? 'user',
      tariffId: initial?.tariffId ?? '',
      monthlyCost: initial?.monthlyCost ?? 0,
      startDate: initial ? toDateInput(initial.startDate) : today,
      paymentDate: initial ? toDateInput(initial.paymentDate) : plusOneMonth(today),
      status: initial?.status ?? 'active',
    },
  })

  // Tarifas seleccionables: activas + la actual del socio (aunque esté inactiva).
  const selectable = tariffs.filter((t) => t.active || t.id === initial?.tariffId)
  const tariffId = useWatch({ control, name: 'tariffId' })
  const selectedTariff = tariffs.find((t) => t.id === tariffId)

  const tariffReg = register('tariffId')
  const startReg = register('startDate')

  const tariffHint =
    tariffs.length === 0
      ? 'No hay tarifas. Creá una en la sección Tarifas.'
      : selectedTariff
        ? `${frequencyLabel(selectedTariff.weeklyFrequency)} · autocompletó el costo`
        : 'Elegí un plan; autocompleta el costo'

  const submit = (v: FormValues) => {
    const tariff = tariffs.find((t) => t.id === v.tariffId)
    onSubmit({
      fullName: v.fullName,
      email: v.email,
      phone: v.phone,
      birthDate: toTs(v.birthDate),
      role: v.role,
      service: tariff?.name ?? '',
      tariffId: v.tariffId || undefined,
      weeklyFrequency: tariff?.weeklyFrequency,
      monthlyCost: v.monthlyCost ?? 0,
      startDate: toTs(v.startDate),
      paymentDate: toTs(v.paymentDate),
      status: v.status,
    })
  }

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Editar socio' : 'Nuevo socio'} size="lg">
      <form onSubmit={handleSubmit(submit)} className="space-y-5">
        {/* Datos personales */}
        <section className="space-y-3">
          <p className="text-sm font-semibold text-zinc-700">Datos personales</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Nombre completo" error={errors.fullName?.message} required>
              <Input {...register('fullName')} invalid={!!errors.fullName} />
            </FormField>
            <FormField label="Email (para el alta)" error={errors.email?.message} required>
              <Input type="email" {...register('email')} invalid={!!errors.email} disabled={!!initial} />
            </FormField>
            <FormField label="Teléfono">
              <Input {...register('phone')} />
            </FormField>
            <FormField label="Fecha de nacimiento">
              <DateInput {...register('birthDate')} />
            </FormField>
          </div>
        </section>

        {/* Membresía y pago */}
        <section className="space-y-3 border-t border-zinc-100 pt-4">
          <p className="text-sm font-semibold text-zinc-700">Membresía y pago</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Tipo de usuario">
              <Select
                {...register('role')}
                options={[
                  { value: 'user', label: 'Socio' },
                  { value: 'admin', label: 'Administrador' },
                ]}
              />
            </FormField>
            <FormField label="Estado">
              <Select
                {...register('status')}
                options={[
                  { value: 'active', label: 'Activo' },
                  { value: 'paused', label: 'Pausado' },
                  { value: 'overdue', label: 'Vencido' },
                ]}
              />
            </FormField>
            <FormField label="Servicio contratado (tarifa)" hint={tariffHint}>
              <Select
                {...tariffReg}
                onChange={(e) => {
                  tariffReg.onChange(e)
                  const t = tariffs.find((x) => x.id === e.target.value)
                  if (t) setValue('monthlyCost', t.price, { shouldDirty: true })
                }}
                placeholder={selectable.length ? 'Elegí una tarifa' : 'Sin tarifas'}
                options={selectable.map((t) => ({ value: t.id, label: tariffLabel(t) }))}
              />
            </FormField>
            <FormField label="Costo mensual" error={errors.monthlyCost?.message}>
              <Controller
                control={control}
                name="monthlyCost"
                render={({ field }) => (
                  <MoneyInput value={field.value ?? 0} onChange={field.onChange} />
                )}
              />
            </FormField>
            <FormField label="Fecha de inicio" hint="Autocompleta el próximo pago a 1 mes">
              <DateInput
                {...startReg}
                onChange={(e) => {
                  startReg.onChange(e)
                  if (e.target.value) setValue('paymentDate', plusOneMonth(e.target.value))
                }}
              />
            </FormField>
            <FormField label="Próximo pago">
              <DateInput {...register('paymentDate')} />
            </FormField>
          </div>
        </section>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            {initial ? 'Guardar cambios' : 'Crear socio'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Timestamp } from 'firebase/firestore'
import type { Member } from '@/types'
import { Button, FormField, Input, Modal, MoneyInput, Select } from '@/components/ui'
import { toDateInput } from '@/utils/format'

const schema = z.object({
  fullName: z.string().min(2, 'Ingresá el nombre'),
  email: z.string().email('Email inválido'),
  phone: z.string().optional(),
  birthDate: z.string().optional(),
  role: z.enum(['user', 'admin']),
  service: z.string().optional(),
  startDate: z.string().optional(),
  paymentDate: z.string().optional(),
  monthlyCost: z.number().min(0),
  status: z.enum(['active', 'paused', 'overdue']),
})
type FormValues = z.infer<typeof schema>

const toTs = (value?: string) => (value ? Timestamp.fromDate(new Date(value)) : null)

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
  const {
    register,
    control,
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
      service: initial?.service ?? '',
      startDate: toDateInput(initial?.startDate),
      paymentDate: toDateInput(initial?.paymentDate),
      monthlyCost: initial?.monthlyCost ?? 0,
      status: initial?.status ?? 'active',
    },
  })

  const submit = (v: FormValues) => {
    onSubmit({
      fullName: v.fullName,
      email: v.email,
      phone: v.phone,
      birthDate: toTs(v.birthDate),
      role: v.role,
      service: v.service,
      startDate: toTs(v.startDate),
      paymentDate: toTs(v.paymentDate),
      monthlyCost: v.monthlyCost ?? 0,
      status: v.status,
    })
  }

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Editar socio' : 'Nuevo socio'} size="lg">
      <form onSubmit={handleSubmit(submit)} className="space-y-4">
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
            <Input type="date" {...register('birthDate')} />
          </FormField>
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
          <FormField label="Servicio contratado">
            <Input placeholder="Ej. Musculación + clases" {...register('service')} />
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
          <FormField label="Fecha de inicio">
            <Input type="date" {...register('startDate')} />
          </FormField>
          <FormField label="Próximo pago">
            <Input type="date" {...register('paymentDate')} />
          </FormField>
        </div>

        <div className="flex justify-end gap-2 pt-2">
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

import { useEffect } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { Member } from '@/types'
import { useTenant } from '@/providers/TenantProvider'
import { useGym } from '@/hooks/useGym'
import { useMembers } from '@/hooks/useMembers'
import { usePlans } from '@/hooks/usePlans'
import { useTariffs } from '@/hooks/useTariffs'
import { Button, DateInput, FormField, Input, Modal, MoneyInput, Select, Text } from '@/components/ui'
import { toDateInput } from '@/utils/format'
import { dateInputToTimestamp, parseDateInput, todayDateInput } from '@/utils/dates'
import { emailLocalPart, suggestLoginEmail, tenantEmailDomain } from '@/utils/loginEmail'
import { canCreateAdmin, usageLabel } from '@/utils/plans'
import { frequencyLabel, tariffLabel } from '@/utils/tariffs'

const schema = z.object({
  fullName: z.string().min(2, 'Ingresá el nombre'),
  loginLocal: z
    .string()
    .min(2, 'Ingresá el usuario')
    .regex(/^[a-z0-9._-]+$/, 'Usá solo minúsculas, números, puntos o guiones'),
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

const toTs = (value?: string) => dateInputToTimestamp(value)

/** Suma 1 mes exacto a una fecha YYYY-MM-DD (usa mediodía para evitar saltos de día). */
function plusOneMonth(dateStr: string): string {
  if (!dateStr) return ''
  const d = parseDateInput(dateStr)
  d.setMonth(d.getMonth() + 1)
  return toDateInput(d)
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
  const { activeGymId, activeMembership } = useTenant()
  const { data: tariffs = [] } = useTariffs(activeGymId ?? '')
  const { data: members = [] } = useMembers(activeGymId ?? '')
  const { data: gym } = useGym(activeGymId ?? '')
  const { data: plans = [] } = usePlans()
  const gymName = activeMembership?.gymName ?? 'Gimnasio'
  const domain = tenantEmailDomain(gymName)

  const today = todayDateInput()

  const {
    register,
    control,
    setValue,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: '',
      loginLocal: '',
      phone: '',
      birthDate: '',
      role: 'user',
      tariffId: '',
      monthlyCost: 0,
      startDate: today,
      paymentDate: plusOneMonth(today),
      status: 'active',
    },
  })

  // Tarifas seleccionables: activas + la actual del socio (aunque esté inactiva).
  const selectable = tariffs.filter((t) => t.active || t.id === initial?.tariffId)
  const fullName = useWatch({ control, name: 'fullName' })
  const role = useWatch({ control, name: 'role' })
  const tariffId = useWatch({ control, name: 'tariffId' })
  const selectedTariff = tariffs.find((t) => t.id === tariffId)
  const plan = plans.find((p) => p.id === gym?.subscription?.planId)

  const tariffReg = register('tariffId')
  const startReg = register('startDate')
  const existingEmails = members
    .filter((m) => m.id !== initial?.id)
    .map((m) => m.loginEmail || m.email)
  const adminCount = members.filter((m) => m.role === 'admin' && m.id !== initial?.id).length
  const adminGate = role === 'admin' ? canCreateAdmin(plan, adminCount) : { allowed: true }
  const adminLimitHint =
    role === 'admin' && plan
      ? `Administradores del plan: ${usageLabel(adminCount + (initial?.role === 'admin' ? 1 : 0), plan.maxAdmins)}`
      : undefined

  const formValues = (): FormValues => ({
    fullName: initial?.fullName ?? '',
    loginLocal: emailLocalPart(initial?.loginEmail || initial?.email || ''),
    phone: initial?.phone ?? '',
    birthDate: toDateInput(initial?.birthDate),
    role: initial?.role ?? 'user',
    tariffId: initial?.tariffId ?? '',
    monthlyCost: initial?.monthlyCost ?? 0,
    startDate: initial ? toDateInput(initial.startDate) : today,
    paymentDate: initial ? toDateInput(initial.paymentDate) : plusOneMonth(today),
    status: initial?.status ?? 'active',
  })

  useEffect(() => {
    if (open) reset(formValues())
  }, [initial, open, reset])

  const close = () => {
    reset(formValues())
    onClose()
  }

  const applySuggestedEmail = () => {
    const email = suggestLoginEmail(fullName, gymName, existingEmails)
    setValue('loginLocal', emailLocalPart(email), { shouldDirty: true, shouldValidate: true })
  }

  const tariffHint =
    tariffs.length === 0
      ? 'No hay tarifas. Creá una en la sección Tarifas.'
      : selectedTariff
        ? `${frequencyLabel(selectedTariff.weeklyFrequency)} · autocompletó el costo`
        : 'Elegí un plan; autocompleta el costo'

  const submit = (v: FormValues) => {
    if (v.role === 'admin' && !adminGate.allowed) return
    const tariff = tariffs.find((t) => t.id === v.tariffId)
    const loginEmail = `${v.loginLocal}@${domain}`
    onSubmit({
      fullName: v.fullName,
      email: loginEmail,
      loginEmail,
      authStatus: initial?.authStatus ?? 'pending_password',
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
    <Modal
      open={open}
      onClose={close}
      title={initial ? 'Editar socio' : 'Nuevo socio'}
      size="xl"
      closeOnBackdrop={!saving}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" fullWidth className="sm:w-auto" onClick={close}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="member-form"
            fullWidth
            className="sm:w-auto"
            loading={saving}
            disabled={!adminGate.allowed}
          >
            {initial ? 'Guardar cambios' : 'Crear socio'}
          </Button>
        </div>
      }
    >
      <form id="member-form" onSubmit={handleSubmit(submit)} className="space-y-5">
        {/* Datos personales */}
        <section className="space-y-3">
          <Text variant="label">Datos personales</Text>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Nombre completo" error={errors.fullName?.message} required>
              <Input {...register('fullName')} invalid={!!errors.fullName} />
            </FormField>
            <FormField
              label="Email de acceso"
              error={errors.loginLocal?.message}
              tooltip="El socio inicia sesión con este email. El dominio depende del gimnasio."
              required
            >
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                <div className="flex min-w-0 flex-1 rounded-[var(--radius-control)] border border-zinc-200 bg-surface focus-within:ring-2 focus-within:ring-brand-500">
                  <input
                    className="min-w-0 flex-1 rounded-l-[var(--radius-control)] bg-transparent px-3 py-2 text-sm outline-none disabled:text-zinc-500"
                    {...register('loginLocal')}
                    disabled={!!initial}
                  />
                  <span className="flex shrink-0 items-center rounded-r-[var(--radius-control)] border-l border-zinc-200 bg-surface-muted px-3 text-sm text-zinc-500">
                    @{domain}
                  </span>
                </div>
                {!initial && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-10 shrink-0"
                    onClick={applySuggestedEmail}
                  >
                    Usar sugerido
                  </Button>
                )}
              </div>
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
          <Text variant="label">Membresía y pago</Text>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Tipo de usuario" hint={adminGate.reason ?? adminLimitHint}>
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
            <FormField
              label="Servicio contratado (tarifa)"
              hint={tariffHint}
              tooltip="La tarifa define la cuota y la frecuencia semanal; al guardarla queda como snapshot del socio."
            >
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
      </form>
    </Modal>
  )
}

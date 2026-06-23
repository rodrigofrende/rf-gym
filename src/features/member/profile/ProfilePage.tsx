import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Check, Copy, KeyRound } from 'lucide-react'
import type { Tariff } from '@/types'
import { dateInputToTimestamp } from '@/utils/dates'
import { useTenant } from '@/providers/TenantProvider'
import { useToast } from '@/providers/ToastProvider'
import { useToastAction } from '@/hooks/useToastAction'
import { useMember, useUpdateMemberProfile } from '@/hooks/useMembers'
import { useTariffs } from '@/hooks/useTariffs'
import { AppLayout } from '@/components/layout/AppLayout'
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  DateInput,
  FormField,
  FullPageSpinner,
  Heading,
  IconButton,
  Input,
  Modal,
  Text,
  Tooltip,
} from '@/components/ui'
import { InfoGrid } from '@/components/shared/InfoGrid'
import { cn } from '@/utils/cn'
import { formatCurrency, toDateInput } from '@/utils/format'
import { frequencyLabel } from '@/utils/tariffs'
import { STATUS_LABEL } from '@/utils/roles'
import { ROUTES } from '@/routes/routePaths'

const schema = z.object({
  fullName: z.string().min(2, 'Ingresá tu nombre'),
  phone: z.string().optional(),
  birthDate: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

/**
 * Perfil del socio. SOLO datos personales + su servicio/estado de pago.
 * No importa NotesTab ni hooks de notas: el socio no sabe que existen.
 */
export function ProfilePage() {
  const { activeGymId, activeMembership } = useTenant()
  const gymId = activeGymId as string
  const memberId = activeMembership?.memberId as string
  const navigate = useNavigate()
  const { notify } = useToast()
  const run = useToastAction()
  const [copiedEmail, setCopiedEmail] = useState(false)
  const [plansOpen, setPlansOpen] = useState(false)

  const { data: member, isLoading } = useMember(gymId, memberId)
  const { data: tariffs = [] } = useTariffs(gymId)
  const updateProfile = useUpdateMemberProfile(gymId, memberId)

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      fullName: member?.fullName ?? '',
      phone: member?.phone ?? '',
      birthDate: toDateInput(member?.birthDate),
    },
  })

  if (isLoading) {
    return (
      <AppLayout title="Mi perfil">
        <FullPageSpinner />
      </AppLayout>
    )
  }

  const onSubmit = (v: FormValues) =>
    run(
      () =>
        updateProfile.mutateAsync({
          fullName: v.fullName,
          phone: v.phone,
          birthDate: dateInputToTimestamp(v.birthDate),
        }),
      { success: 'Datos actualizados', error: 'No se pudieron guardar los cambios' },
    )

  const accessEmail = member?.loginEmail || member?.email || ''
  const currentTariff = tariffs.find((t) => t.id === member?.tariffId)
  const copyEmail = async () => {
    if (!accessEmail) return
    await navigator.clipboard.writeText(accessEmail)
    setCopiedEmail(true)
    notify('Email copiado', 'success')
    window.setTimeout(() => setCopiedEmail(false), 1500)
  }

  return (
    <AppLayout title="Mi perfil">
      <div className="mx-auto max-w-5xl">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 lg:items-start">
          <Card className="lg:col-span-1">
            <CardBody>
              <div className="flex flex-col items-center text-center">
                <Avatar name={member?.fullName ?? '?'} src={member?.photoURL} size="lg" />
                <Heading variant="card" className="mt-3 text-lg">
                  {member?.fullName}
                </Heading>
                <Text variant="caption" className="mt-1 break-all">
                  {member?.email}
                </Text>
              </div>
              {member && (
                <div className="mt-5 border-t border-zinc-100 pt-5">
                  <InfoGrid
                    items={[
                      { label: 'Servicio', value: member.service || '—' },
                      {
                        label: 'Estado',
                        value: <Badge tone="neutral">{STATUS_LABEL[member.status]}</Badge>,
                      },
                    ]}
                  />
                </div>
              )}
            </CardBody>
          </Card>

          <div className="space-y-5 lg:col-span-2">
            <Card>
              <CardHeader
                title="Seguridad"
                subtitle="Tu contraseña no se muestra ni se guarda visible por seguridad."
                action={
                  <Tooltip text="Cambiar contraseña">
                    <IconButton
                      tone="brand"
                      className="border border-brand-100 bg-brand-50"
                      label="Cambiar contraseña"
                      icon={<KeyRound className="size-4" />}
                      onClick={() =>
                        navigate(`${ROUTES.SET_PASSWORD}?email=${encodeURIComponent(accessEmail)}&mode=change`)
                      }
                    />
                  </Tooltip>
                }
              />
              <CardBody>
                <div className="space-y-4">
                  <InfoGrid
                    items={[
                      {
                        label: 'Email de acceso',
                        value: (
                          <span className="inline-flex max-w-full items-center gap-2">
                            <span className="min-w-0 break-all">{accessEmail}</span>
                            <Tooltip text={copiedEmail ? 'Copiado' : 'Copiar email'}>
                              <IconButton
                                size="sm"
                                tone="brand"
                                label="Copiar email de acceso"
                                icon={
                                  copiedEmail ? (
                                    <Check className="size-4 text-emerald-600" />
                                  ) : (
                                    <Copy className="size-4" />
                                  )
                                }
                                onClick={copyEmail}
                                className="shrink-0"
                              />
                            </Tooltip>
                          </span>
                        ),
                      },
                      {
                        label: 'Estado',
                        value: (
                          <Badge tone={member?.authStatus === 'password_change_required' ? 'amber' : 'green'}>
                            {member?.authStatus === 'password_change_required'
                              ? 'Cambio requerido'
                              : 'Contraseña activa'}
                          </Badge>
                        ),
                      },
                    ]}
                  />
                  <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-sm leading-relaxed text-amber-800">
                    Si olvidás totalmente tu contraseña, comunicate con administración. En esta versión el cambio se hace estando logueado.
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Datos personales" subtitle="Mantené tu información al día" />
              <CardBody>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <FormField label="Nombre completo" error={errors.fullName?.message} required>
                    <Input {...register('fullName')} invalid={!!errors.fullName} />
                  </FormField>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField label="Teléfono">
                      <Input {...register('phone')} />
                    </FormField>
                    <FormField label="Fecha de nacimiento">
                      <DateInput {...register('birthDate')} />
                    </FormField>
                  </div>
                  <div className="flex justify-end">
                    <Button type="submit" loading={updateProfile.isPending} disabled={!isDirty}>
                      Guardar cambios
                    </Button>
                  </div>
                </form>
              </CardBody>
            </Card>
          </div>
        </div>

        {(currentTariff || member?.service) && (
          <Card className="mt-5">
            <CardHeader
              title="Plan actual"
              subtitle="Tu tarifa vigente"
              action={
                tariffs.length > 0 ? (
                  <Button variant="secondary" size="sm" onClick={() => setPlansOpen(true)}>
                    Ver todos
                  </Button>
                ) : null
              }
            />
            <CardBody>
              {currentTariff ? (
                <PlanCard tariff={currentTariff} current />
              ) : (
                <Card className="border-brand-300 bg-brand-50 p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Heading variant="card">{member?.service}</Heading>
                    <Badge tone="brand">Tu plan</Badge>
                  </div>
                  <Text variant="metric" className="mt-2">
                    {formatCurrency(member?.monthlyCost)}
                    <span className="text-sm font-normal text-zinc-400"> /mes</span>
                  </Text>
                </Card>
              )}
            </CardBody>
          </Card>
        )}

        <Modal open={plansOpen} onClose={() => setPlansOpen(false)} title="Planes del gimnasio" size="lg">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {tariffs
              .filter((t) => t.active || t.id === member?.tariffId)
              .map((t) => (
                <PlanCard key={t.id} tariff={t} current={t.id === member?.tariffId} />
              ))}
          </div>
        </Modal>
      </div>
    </AppLayout>
  )
}

function PlanCard({
  tariff,
  current,
}: {
  tariff: Tariff
  current?: boolean
}) {
  return (
    <Card className={cn('p-5', current ? 'border-brand-300 bg-brand-50' : '')}>
      <div className="flex flex-wrap items-center gap-2">
        <Heading variant="card">{tariff.name}</Heading>
        <Badge tone="neutral">{frequencyLabel(tariff.weeklyFrequency)}</Badge>
        {current && <Badge tone="brand">Tu plan</Badge>}
      </div>
      {tariff.description && (
        <Text variant="caption" className="mt-1">
          {tariff.description}
        </Text>
      )}
      <Text variant="metric" className="mt-2">
        {formatCurrency(tariff.price)}
        <span className="text-sm font-normal text-zinc-400"> /mes</span>
      </Text>
    </Card>
  )
}

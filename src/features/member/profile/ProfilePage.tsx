import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Timestamp } from 'firebase/firestore'
import { useTenant } from '@/providers/TenantProvider'
import { useToast } from '@/providers/ToastProvider'
import { useMember, useUpdateMemberProfile } from '@/hooks/useMembers'
import { AppLayout } from '@/components/layout/AppLayout'
import { Avatar, Badge, Button, Card, CardBody, CardHeader, FormField, FullPageSpinner, Input } from '@/components/ui'
import { toDateInput } from '@/utils/format'
import { STATUS_LABEL } from '@/utils/roles'

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
  const { notify } = useToast()

  const { data: member, isLoading } = useMember(gymId, memberId)
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

  const onSubmit = async (v: FormValues) => {
    try {
      await updateProfile.mutateAsync({
        fullName: v.fullName,
        phone: v.phone,
        birthDate: v.birthDate ? Timestamp.fromDate(new Date(v.birthDate)) : null,
      })
      notify('Datos actualizados', 'success')
    } catch {
      notify('No se pudieron guardar los cambios', 'error')
    }
  }

  return (
    <AppLayout title="Mi perfil">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-1">
          <div className="flex flex-col items-center text-center">
            <Avatar name={member?.fullName ?? '?'} src={member?.photoURL} size="lg" />
            <h2 className="mt-3 font-semibold text-slate-900">{member?.fullName}</h2>
            <p className="text-sm text-slate-500">{member?.email}</p>
            {member && (
              <div className="mt-4 w-full space-y-2 border-t border-slate-100 pt-4 text-left text-sm">
                <Row label="Servicio" value={member.service || '—'} />
                <Row
                  label="Estado"
                  value={<Badge tone="neutral">{STATUS_LABEL[member.status]}</Badge>}
                />
              </div>
            )}
          </div>
        </Card>

        <Card className="lg:col-span-2">
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
                  <Input type="date" {...register('birthDate')} />
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
    </AppLayout>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-800">{value}</span>
    </div>
  )
}

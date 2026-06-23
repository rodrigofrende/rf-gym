import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Building2, LogIn, Pencil, Plus, ShieldCheck, Trash2, UserPlus, Wallet } from 'lucide-react'
import type { Gym, GymSubscription, Member, SubscriptionPlan } from '@/types'
import { useAuth } from '@/providers/AuthProvider'
import { useTenant } from '@/providers/TenantProvider'
import { useGymAdminActions, useGyms } from '@/hooks/useGyms'
import { useCreateMember, useMembers, useRemoveMember } from '@/hooks/useMembers'
import { useToastAction } from '@/hooks/useToastAction'
import { usePlans } from '@/hooks/usePlans'
import { useRoutines } from '@/hooks/useRoutines'
import { useExercises } from '@/hooks/useExercises'
import { AppLayout } from '@/components/layout/AppLayout'
import { defaultHomeForRole } from '@/routes/routePaths'
import { addMonths, getPaymentStatus } from '@/utils/payments'
import { formatCurrency, toDateInput } from '@/utils/format'
import { dateInputToTimestamp } from '@/utils/dates'
import { exceedsLimit, usageLabel } from '@/utils/plans'
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  DateInput,
  EmptyState,
  FormField,
  FullPageSpinner,
  Heading,
  IconButton,
  InfoTooltip,
  Input,
  Modal,
  MoneyInput,
  Select,
  Text,
} from '@/components/ui'
import { GymPaymentsModal } from './GymPaymentsModal'

export function SuperGymsPage() {
  const { user } = useAuth()
  const run = useToastAction()
  const { data: gyms = [], isLoading } = useGyms()
  const { data: plans = [] } = usePlans()
  const { create, update, remove } = useGymAdminActions()
  const [newOpen, setNewOpen] = useState(false)
  const [editingGym, setEditingGym] = useState<Gym | null>(null)
  const [toDeleteGym, setToDeleteGym] = useState<Gym | null>(null)

  const confirmRemoveGym = async () => {
    if (!toDeleteGym) return
    const ok = await run(() => remove.mutateAsync(toDeleteGym.id), {
      success: 'Gimnasio eliminado',
      error: 'No se pudo eliminar',
    })
    if (ok) setToDeleteGym(null)
  }

  return (
    <AppLayout
      title="Gimnasios"
      subtitle={
        <span className="inline-flex items-center gap-1.5">
          Administrá todos los gimnasios y sus administradores.
          <InfoTooltip text="Los límites del plan se comparan contra el uso real del gym: socios, admins, rutinas y ejercicios." />
        </span>
      }
      actions={
        <Button leftIcon={<Plus className="size-4" />} onClick={() => setNewOpen(true)}>
          Nuevo gimnasio
        </Button>
      }
    >
      {isLoading ? (
        <FullPageSpinner />
      ) : gyms.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Sin gimnasios"
          description="Creá el primer gimnasio para empezar."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {gyms.map((gym) => (
            <GymCard
              key={gym.id}
              gym={gym}
              plan={plans.find((p) => p.id === gym.subscription?.planId)}
              onEdit={() => setEditingGym(gym)}
              onRemoveGym={() => setToDeleteGym(gym)}
            />
          ))}
        </div>
      )}

      {newOpen && (
        <GymFormModal
          plans={plans}
          saving={create.isPending}
          onClose={() => setNewOpen(false)}
          onSubmit={async (data) => {
            const ok = await run(
              () =>
                create.mutateAsync({
                  ...data,
                  ownerUid: user?.uid ?? '',
                  adminUids: [],
                }),
              { success: 'Gimnasio creado', error: 'No se pudo crear el gimnasio' },
            )
            if (ok) setNewOpen(false)
          }}
        />
      )}

      {editingGym && (
        <GymFormModal
          gym={editingGym}
          plans={plans}
          saving={update.isPending}
          onClose={() => setEditingGym(null)}
          onSubmit={async (data) => {
            const ok = await run(
              () => update.mutateAsync({ gymId: editingGym.id, data }),
              { success: 'Gimnasio actualizado', error: 'No se pudo actualizar el gimnasio' },
            )
            if (ok) setEditingGym(null)
          }}
        />
      )}

      <ConfirmDialog
        open={!!toDeleteGym}
        onClose={() => setToDeleteGym(null)}
        onConfirm={confirmRemoveGym}
        title="Eliminar gimnasio"
        description={`¿Querés eliminar el gimnasio "${toDeleteGym?.name}"? Esta acción no se puede deshacer.`}
        loading={remove.isPending}
      />
    </AppLayout>
  )
}

type GymFormData = Pick<Gym, 'name' | 'logoURL' | 'subscription'>
type GymFormErrors = Partial<Record<'name' | 'logoURL' | 'planId' | 'monthlyCost' | 'dueDate', string>>

function GymFormModal({
  gym,
  plans,
  saving,
  onClose,
  onSubmit,
}: {
  gym?: Gym
  plans: SubscriptionPlan[]
  saving?: boolean
  onClose: () => void
  onSubmit: (data: GymFormData) => Promise<void>
}) {
  const activePlans = plans.filter((p) => p.active || p.id === gym?.subscription?.planId)
  const [name, setName] = useState(gym?.name ?? '')
  const [logoURL, setLogoURL] = useState(gym?.logoURL ?? '')
  const [planId, setPlanId] = useState(gym?.subscription?.planId ?? '')
  const selectedPlan = plans.find((p) => p.id === planId)
  const [monthlyCost, setMonthlyCost] = useState(gym?.subscription?.monthlyCost ?? selectedPlan?.price ?? 0)
  const [dueDate, setDueDate] = useState(
    gym?.subscription?.dueDate ? toDateInput(gym.subscription.dueDate) : toDateInput(addMonths(new Date(), 1)),
  )
  const [status, setStatus] = useState<GymSubscription['status']>(gym?.subscription?.status ?? 'active')
  const [errors, setErrors] = useState<GymFormErrors>({})

  const clearError = (field: keyof GymFormErrors) => {
    setErrors((prev) => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  const validate = () => {
    const next: GymFormErrors = {}
    const trimmedName = name.trim()
    const trimmedLogoURL = logoURL.trim()

    if (trimmedName.length < 2) next.name = 'Ingresá el nombre del gimnasio.'
    if (trimmedLogoURL && !/^https?:\/\/\S+\.\S+/.test(trimmedLogoURL)) {
      next.logoURL = 'Usá una URL válida que empiece con http:// o https://.'
    }
    if (!planId) {
      next.planId = activePlans.length
        ? 'Elegí el plan de suscripción del gimnasio.'
        : 'Primero creá al menos un plan activo.'
    }
    if (monthlyCost <= 0) next.monthlyCost = 'Ingresá un costo mensual mayor a cero.'
    if (!dueDate) next.dueDate = 'Elegí el próximo vencimiento de la suscripción.'

    setErrors(next)
    return Object.keys(next).length === 0
  }

  const submit = async () => {
    if (!validate()) return
    const plan = plans.find((p) => p.id === planId)
    await onSubmit({
      name: name.trim(),
      logoURL: logoURL.trim() || undefined,
      subscription: planId
        ? {
            planId,
            monthlyCost: monthlyCost || plan?.price || 0,
            status,
            dueDate: dateInputToTimestamp(dueDate),
            lastPaymentDate: gym?.subscription?.lastPaymentDate,
          }
        : undefined,
    })
  }

  return (
    <Modal open onClose={onClose} title={gym ? `Editar gimnasio — ${gym.name}` : 'Nuevo gimnasio'} size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            label="Nombre del gimnasio"
            hint="Lo verás en el selector de gimnasios."
            error={errors.name}
            required
          >
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                clearError('name')
              }}
              placeholder="Ej. PowerHouse Gym"
              invalid={!!errors.name}
              autoFocus
            />
          </FormField>
          <FormField label="Logo URL" hint="Opcional, se usa en sidebar y selector." error={errors.logoURL}>
            <Input
              value={logoURL}
              onChange={(e) => {
                setLogoURL(e.target.value)
                clearError('logoURL')
              }}
              placeholder="https://..."
              invalid={!!errors.logoURL}
            />
          </FormField>
          <FormField
            label="Plan de suscripción"
            hint="Define precio y límites del tenant."
            error={errors.planId}
            required
          >
            <Select
              value={planId}
              onChange={(e) => {
                const nextPlan = plans.find((p) => p.id === e.target.value)
                setPlanId(e.target.value)
                clearError('planId')
                if (nextPlan) {
                  setMonthlyCost(nextPlan.price)
                  clearError('monthlyCost')
                } else {
                  setMonthlyCost(0)
                }
              }}
              placeholder={activePlans.length ? 'Elegí un plan' : 'No hay planes'}
              invalid={!!errors.planId}
              options={activePlans.map((p) => ({
                value: p.id,
                label: `${p.name} · ${formatCurrency(p.price)}`,
              }))}
            />
          </FormField>
          <FormField label="Estado de suscripción" required>
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value as GymSubscription['status'])}
              options={[
                { value: 'active', label: 'Activa' },
                { value: 'suspended', label: 'Suspendida' },
              ]}
            />
          </FormField>
          <FormField label="Costo mensual" error={errors.monthlyCost} required>
            <MoneyInput
              value={monthlyCost}
              onChange={(value) => {
                setMonthlyCost(value)
                clearError('monthlyCost')
              }}
              invalid={!!errors.monthlyCost}
            />
          </FormField>
          <FormField label="Próximo vencimiento" error={errors.dueDate} required>
            <DateInput
              value={dueDate}
              onChange={(e) => {
                setDueDate(e.target.value)
                clearError('dueDate')
              }}
              invalid={!!errors.dueDate}
            />
          </FormField>
        </div>
        <div className="flex justify-end gap-2 border-t border-zinc-100 pt-3">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button loading={saving} onClick={submit}>
            {gym ? 'Guardar cambios' : 'Crear gimnasio'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function GymCard({
  gym,
  plan,
  onEdit,
  onRemoveGym,
}: {
  gym: Gym
  plan?: SubscriptionPlan
  onEdit: () => void
  onRemoveGym: () => void
}) {
  const navigate = useNavigate()
  const { selectGym } = useTenant()
  const run = useToastAction()
  const { data: members = [] } = useMembers(gym.id)
  const { data: routines = [] } = useRoutines(gym.id)
  const { data: exercises = [] } = useExercises(gym.id)
  const createMember = useCreateMember(gym.id)
  const removeMember = useRemoveMember(gym.id)
  const { removeAdmin } = useGymAdminActions()

  const admins = members.filter((m) => m.role === 'admin')
  const subStatus = getPaymentStatus(gym.subscription?.dueDate)
  const suspended = subStatus.state === 'blocked'

  const usage = {
    members: members.filter((m) => m.role === 'user').length,
    admins: admins.length,
    routines: routines.length,
    exercises: exercises.length,
  }
  const overLimit = exceedsLimit(usage, plan)

  const [addOpen, setAddOpen] = useState(false)
  const [payOpen, setPayOpen] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [adminToRemove, setAdminToRemove] = useState<Member | null>(null)

  const enterGym = () => {
    selectGym(gym.id)
    navigate(defaultHomeForRole('admin'))
  }

  const handleAddAdmin = async () => {
    if (fullName.trim().length < 2 || !email.trim()) return
    const ok = await run(
      () =>
        createMember.mutateAsync({
          fullName: fullName.trim(),
          email: email.trim(),
          role: 'admin',
          status: 'active',
        }),
      { success: 'Administrador agregado', error: 'No se pudo agregar el administrador' },
    )
    if (ok) {
      setFullName('')
      setEmail('')
      setAddOpen(false)
    }
  }

  const confirmRemoveAdmin = async () => {
    if (!adminToRemove) return
    const ok = await run(
      async () => {
        await removeMember.mutateAsync(adminToRemove.id)
        if (adminToRemove.uid)
          await removeAdmin.mutateAsync({ gymId: gym.id, uid: adminToRemove.uid })
      },
      { success: 'Administrador eliminado', error: 'No se pudo eliminar' },
    )
    if (ok) setAdminToRemove(null)
  }

  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-start justify-between">
        <div className="flex min-w-0 items-center gap-3">
          {gym.logoURL ? (
            <img src={gym.logoURL} alt={gym.name} className="size-10 rounded-xl object-cover" />
          ) : (
            <div className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <Building2 className="size-5" />
            </div>
          )}
          <div className="min-w-0">
            <Heading variant="card" className="truncate">
              {gym.name}
            </Heading>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge tone="neutral">{admins.length} admin{admins.length === 1 ? '' : 's'}</Badge>
              {suspended && <Badge tone="red">Suspendido</Badge>}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button size="sm" variant="secondary" leftIcon={<Wallet className="size-4" />} onClick={() => setPayOpen(true)}>
            Pagos
          </Button>
          <Button size="sm" variant="secondary" leftIcon={<LogIn className="size-4" />} onClick={enterGym}>
            Entrar
          </Button>
          <IconButton
            icon={<Pencil className="size-4" />}
            label="Editar gimnasio"
            onClick={onEdit}
          />
          <IconButton
            icon={<Trash2 className="size-4" />}
            label="Eliminar gimnasio"
            tone="danger"
            onClick={onRemoveGym}
          />
        </div>
      </div>

      {plan ? (
        <div className="mt-3 rounded-lg bg-surface-muted p-3">
          <div className="flex items-center justify-between gap-2">
            <Text variant="label">Plan {plan.name}</Text>
            {overLimit && (
              <Badge tone="amber">
                <AlertTriangle className="mr-1 inline size-3" />
                Límite superado
              </Badge>
            )}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <Badge tone="neutral">{usageLabel(usage.members, plan.maxMembers)} socios</Badge>
            <Badge tone="neutral">{usageLabel(usage.routines, plan.maxRoutines)} rutinas</Badge>
            <Badge tone="neutral">{usageLabel(usage.exercises, plan.maxExercises)} ejercicios</Badge>
            <Badge tone="neutral">{usageLabel(usage.admins, plan.maxAdmins)} admins</Badge>
          </div>
        </div>
      ) : (
        <p className="mt-3 text-xs text-zinc-400">Sin plan asignado.</p>
      )}

      <div className="mt-4 border-t border-zinc-100 pt-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Administradores</p>
          <Button
            size="sm"
            variant="ghost"
            leftIcon={<UserPlus className="size-4" />}
            onClick={() => setAddOpen(true)}
          >
            Agregar
          </Button>
        </div>
        {admins.length === 0 ? (
          <p className="text-sm text-zinc-400">Sin administradores.</p>
        ) : (
          <ul className="space-y-1">
            {admins.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between rounded-lg bg-surface-muted px-3 py-2"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <ShieldCheck className="size-4 shrink-0 text-brand-600" />
                  <div className="min-w-0">
                    <Text variant="listItem" className="truncate">
                      {a.fullName}
                    </Text>
                    <Text variant="caption" className="truncate">
                      {a.email}
                    </Text>
                  </div>
                </div>
                <IconButton
                  icon={<Trash2 className="size-4" />}
                  label={`Quitar a ${a.fullName}`}
                  tone="danger"
                  onClick={() => setAdminToRemove(a)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title={`Nuevo admin — ${gym.name}`}>
        <div className="space-y-4">
          <FormField label="Nombre completo">
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} autoFocus />
          </FormField>
          <FormField
            label="Email"
            tooltip="El admin reclama su acceso iniciando sesión con este email."
          >
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </FormField>
          <div className="flex justify-end gap-2 border-t border-zinc-100 pt-3">
            <Button variant="secondary" onClick={() => setAddOpen(false)}>
              Cancelar
            </Button>
            <Button loading={createMember.isPending} onClick={handleAddAdmin}>
              Agregar admin
            </Button>
          </div>
        </div>
      </Modal>

      {payOpen && <GymPaymentsModal gym={gym} onClose={() => setPayOpen(false)} />}

      <ConfirmDialog
        open={!!adminToRemove}
        onClose={() => setAdminToRemove(null)}
        onConfirm={confirmRemoveAdmin}
        title="Quitar administrador"
        description={`¿Querés quitar a ${adminToRemove?.fullName} como administrador de ${gym.name}?`}
        confirmLabel="Quitar"
        loading={removeMember.isPending || removeAdmin.isPending}
      />
    </Card>
  )
}

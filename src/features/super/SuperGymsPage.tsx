import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Building2, LogIn, Plus, ShieldCheck, Trash2, UserPlus, Wallet } from 'lucide-react'
import type { Gym, GymSubscription, Member, SubscriptionPlan } from '@/types'
import { useAuth } from '@/providers/AuthProvider'
import { useTenant } from '@/providers/TenantProvider'
import { useToast } from '@/providers/ToastProvider'
import { useGymAdminActions, useGyms } from '@/hooks/useGyms'
import { useCreateMember, useMembers, useRemoveMember } from '@/hooks/useMembers'
import { usePlans } from '@/hooks/usePlans'
import { useRoutines } from '@/hooks/useRoutines'
import { AppLayout } from '@/components/layout/AppLayout'
import { ROUTES } from '@/routes/routePaths'
import { addMonths, getPaymentStatus } from '@/utils/payments'
import { formatCurrency } from '@/utils/format'
import { exceedsLimit, usageLabel } from '@/utils/plans'
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  FormField,
  FullPageSpinner,
  Input,
  Modal,
  Select,
} from '@/components/ui'
import { GymPaymentsModal } from './GymPaymentsModal'

export function SuperGymsPage() {
  const { user } = useAuth()
  const { notify } = useToast()
  const { data: gyms = [], isLoading } = useGyms()
  const { data: plans = [] } = usePlans()
  const { create, remove } = useGymAdminActions()
  const [newOpen, setNewOpen] = useState(false)
  const [name, setName] = useState('')
  const [planId, setPlanId] = useState('')
  const [toDeleteGym, setToDeleteGym] = useState<Gym | null>(null)

  const activePlans = plans.filter((p) => p.active)

  const handleCreate = async () => {
    if (name.trim().length < 2) return
    const plan = plans.find((p) => p.id === planId)
    const subscription: GymSubscription | undefined = plan
      ? {
          planId: plan.id,
          monthlyCost: plan.price,
          status: 'active',
          dueDate: addMonths(new Date(), 1),
        }
      : undefined
    try {
      await create.mutateAsync({
        name: name.trim(),
        ownerUid: user?.uid ?? '',
        adminUids: [],
        subscription,
      })
      notify('Gimnasio creado', 'success')
      setName('')
      setPlanId('')
      setNewOpen(false)
    } catch {
      notify('No se pudo crear el gimnasio', 'error')
    }
  }

  const confirmRemoveGym = async () => {
    if (!toDeleteGym) return
    try {
      await remove.mutateAsync(toDeleteGym.id)
      notify('Gimnasio eliminado', 'success')
      setToDeleteGym(null)
    } catch {
      notify('No se pudo eliminar', 'error')
    }
  }

  return (
    <AppLayout
      title="Gimnasios"
      subtitle="Administrá todos los gimnasios y sus administradores."
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
              onRemoveGym={() => setToDeleteGym(gym)}
            />
          ))}
        </div>
      )}

      <Modal open={newOpen} onClose={() => setNewOpen(false)} title="Nuevo gimnasio">
        <div className="space-y-4">
          <FormField label="Nombre del gimnasio" hint="Lo verás en el selector de gimnasios.">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. PowerHouse Gym"
              autoFocus
            />
          </FormField>
          <FormField label="Plan de suscripción" hint="Opcional · define el precio y los límites">
            <Select
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
              placeholder={activePlans.length ? 'Elegí un plan' : 'No hay planes'}
              options={activePlans.map((p) => ({
                value: p.id,
                label: `${p.name} · ${formatCurrency(p.price)}`,
              }))}
            />
          </FormField>
          <div className="flex justify-end gap-2 border-t border-zinc-100 pt-3">
            <Button variant="secondary" onClick={() => setNewOpen(false)}>
              Cancelar
            </Button>
            <Button loading={create.isPending} onClick={handleCreate}>
              Crear gimnasio
            </Button>
          </div>
        </div>
      </Modal>

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

function GymCard({
  gym,
  plan,
  onRemoveGym,
}: {
  gym: Gym
  plan?: SubscriptionPlan
  onRemoveGym: () => void
}) {
  const navigate = useNavigate()
  const { selectGym } = useTenant()
  const { notify } = useToast()
  const { data: members = [] } = useMembers(gym.id)
  const { data: routines = [] } = useRoutines(gym.id)
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
  }
  const overLimit = exceedsLimit(usage, plan)

  const [addOpen, setAddOpen] = useState(false)
  const [payOpen, setPayOpen] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [adminToRemove, setAdminToRemove] = useState<Member | null>(null)

  const enterGym = () => {
    selectGym(gym.id)
    navigate(ROUTES.ADMIN_DASHBOARD)
  }

  const handleAddAdmin = async () => {
    if (fullName.trim().length < 2 || !email.trim()) return
    try {
      await createMember.mutateAsync({
        fullName: fullName.trim(),
        email: email.trim(),
        role: 'admin',
        status: 'active',
      })
      notify('Administrador agregado', 'success')
      setFullName('')
      setEmail('')
      setAddOpen(false)
    } catch {
      notify('No se pudo agregar el administrador', 'error')
    }
  }

  const confirmRemoveAdmin = async () => {
    if (!adminToRemove) return
    try {
      await removeMember.mutateAsync(adminToRemove.id)
      if (adminToRemove.uid)
        await removeAdmin.mutateAsync({ gymId: gym.id, uid: adminToRemove.uid })
      notify('Administrador eliminado', 'success')
      setAdminToRemove(null)
    } catch {
      notify('No se pudo eliminar', 'error')
    }
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
            <h3 className="truncate font-semibold text-zinc-900">{gym.name}</h3>
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
          <button
            onClick={onRemoveGym}
            aria-label="Eliminar gimnasio"
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-red-500"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      {plan ? (
        <div className="mt-3 rounded-lg bg-surface-muted p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-zinc-700">Plan {plan.name}</p>
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
                    <p className="truncate text-sm font-medium text-zinc-800">{a.fullName}</p>
                    <p className="truncate text-xs text-zinc-500">{a.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => setAdminToRemove(a)}
                  aria-label={`Quitar a ${a.fullName}`}
                  className="shrink-0 rounded text-zinc-400 hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                >
                  <Trash2 className="size-4" />
                </button>
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
          <FormField label="Email" hint="Con este email el admin reclama su acceso al ingresar.">
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

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, LogIn, Plus, ShieldCheck, Trash2, UserPlus } from 'lucide-react'
import type { Gym, Member } from '@/types'
import { useAuth } from '@/providers/AuthProvider'
import { useTenant } from '@/providers/TenantProvider'
import { useToast } from '@/providers/ToastProvider'
import { useGymAdminActions, useGyms } from '@/hooks/useGyms'
import { useCreateMember, useMembers, useRemoveMember } from '@/hooks/useMembers'
import { AppLayout } from '@/components/layout/AppLayout'
import { ROUTES } from '@/routes/routePaths'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  FormField,
  FullPageSpinner,
  Input,
  Modal,
} from '@/components/ui'

export function SuperGymsPage() {
  const { user } = useAuth()
  const { notify } = useToast()
  const { data: gyms = [], isLoading } = useGyms()
  const { create, remove } = useGymAdminActions()
  const [newOpen, setNewOpen] = useState(false)
  const [name, setName] = useState('')

  const handleCreate = async () => {
    if (name.trim().length < 2) return
    try {
      await create.mutateAsync({ name: name.trim(), ownerUid: user?.uid ?? '', adminUids: [] })
      notify('Gimnasio creado', 'success')
      setName('')
      setNewOpen(false)
    } catch {
      notify('No se pudo crear el gimnasio', 'error')
    }
  }

  const handleRemoveGym = async (gym: Gym) => {
    if (!confirm(`¿Eliminar el gimnasio "${gym.name}"? Esta acción no se puede deshacer.`)) return
    try {
      await remove.mutateAsync(gym.id)
      notify('Gimnasio eliminado', 'success')
    } catch {
      notify('No se pudo eliminar', 'error')
    }
  }

  return (
    <AppLayout title="Gimnasios">
      <div className="mb-5 flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Administrá todos los gimnasios y sus administradores.
        </p>
        <Button leftIcon={<Plus className="size-4" />} onClick={() => setNewOpen(true)}>
          Nuevo gimnasio
        </Button>
      </div>

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
            <GymCard key={gym.id} gym={gym} onRemoveGym={() => handleRemoveGym(gym)} />
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
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
            <Button variant="secondary" onClick={() => setNewOpen(false)}>
              Cancelar
            </Button>
            <Button loading={create.isPending} onClick={handleCreate}>
              Crear gimnasio
            </Button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  )
}

function GymCard({ gym, onRemoveGym }: { gym: Gym; onRemoveGym: () => void }) {
  const navigate = useNavigate()
  const { selectGym } = useTenant()
  const { notify } = useToast()
  const { data: members = [] } = useMembers(gym.id)
  const createMember = useCreateMember(gym.id)
  const removeMember = useRemoveMember(gym.id)
  const { removeAdmin } = useGymAdminActions()

  const admins = members.filter((m) => m.role === 'admin')

  const [addOpen, setAddOpen] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')

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

  const handleRemoveAdmin = async (admin: Member) => {
    if (!confirm(`¿Quitar a ${admin.fullName} como administrador?`)) return
    try {
      await removeMember.mutateAsync(admin.id)
      if (admin.uid) await removeAdmin.mutateAsync({ gymId: gym.id, uid: admin.uid })
      notify('Administrador eliminado', 'success')
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
            <h3 className="truncate font-semibold text-slate-900">{gym.name}</h3>
            <Badge tone="neutral">{admins.length} admin{admins.length === 1 ? '' : 's'}</Badge>
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button size="sm" variant="secondary" leftIcon={<LogIn className="size-4" />} onClick={enterGym}>
            Entrar
          </Button>
          <button
            onClick={onRemoveGym}
            aria-label="Eliminar gimnasio"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-500"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      <div className="mt-4 border-t border-slate-100 pt-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Administradores</p>
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
          <p className="text-sm text-slate-400">Sin administradores.</p>
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
                    <p className="truncate text-sm font-medium text-slate-800">{a.fullName}</p>
                    <p className="truncate text-xs text-slate-500">{a.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveAdmin(a)}
                  aria-label={`Quitar a ${a.fullName}`}
                  className="shrink-0 text-slate-400 hover:text-red-500"
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
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
            <Button variant="secondary" onClick={() => setAddOpen(false)}>
              Cancelar
            </Button>
            <Button loading={createMember.isPending} onClick={handleAddAdmin}>
              Agregar admin
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  )
}

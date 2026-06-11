import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Users } from 'lucide-react'
import type { Member, MemberStatus } from '@/types'
import { useTenant } from '@/providers/TenantProvider'
import { useToast } from '@/providers/ToastProvider'
import { useCreateMember, useMembers } from '@/hooks/useMembers'
import { AppLayout } from '@/components/layout/AppLayout'
import { Avatar, Badge, Button, EmptyState, FullPageSpinner, Input, Table, type Column } from '@/components/ui'
import { formatCurrency } from '@/utils/format'
import { STATUS_LABEL } from '@/utils/roles'
import { adminMemberDetail } from '@/routes/routePaths'
import { MemberFormModal } from './MemberFormModal'

const STATUS_TONE: Record<MemberStatus, 'green' | 'amber' | 'red'> = {
  active: 'green',
  paused: 'amber',
  overdue: 'red',
}

export function MembersListPage() {
  const { activeGymId } = useTenant()
  const gymId = activeGymId as string
  const navigate = useNavigate()
  const { notify } = useToast()
  const { data: members = [], isLoading } = useMembers(gymId)
  const createMember = useCreateMember(gymId)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return members
    return members.filter(
      (m) => m.fullName.toLowerCase().includes(q) || m.email.toLowerCase().includes(q),
    )
  }, [members, search])

  const columns: Column<Member>[] = [
    {
      key: 'name',
      header: 'Socio',
      render: (m) => (
        <div className="flex items-center gap-3">
          <Avatar name={m.fullName} src={m.photoURL} size="sm" />
          <div>
            <p className="font-medium text-slate-900">{m.fullName}</p>
            <p className="text-xs text-slate-500">{m.email}</p>
          </div>
        </div>
      ),
    },
    { key: 'service', header: 'Servicio', render: (m) => m.service || '—' },
    {
      key: 'cost',
      header: 'Mensual',
      render: (m) => formatCurrency(m.monthlyCost),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (m) => <Badge tone={STATUS_TONE[m.status]}>{STATUS_LABEL[m.status]}</Badge>,
    },
    {
      key: 'linked',
      header: '',
      render: (m) =>
        m.uid ? null : <Badge tone="amber">Invitación pendiente</Badge>,
    },
  ]

  const handleCreate = async (data: Omit<Member, 'id' | 'uid'>) => {
    try {
      await createMember.mutateAsync(data)
      notify('Socio creado. Podrá ingresar con su email.', 'success')
      setModalOpen(false)
    } catch {
      notify('No se pudo crear el socio', 'error')
    }
  }

  return (
    <AppLayout title="Socios">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            className="pl-9"
            placeholder="Buscar por nombre o email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button leftIcon={<Plus className="size-4" />} onClick={() => setModalOpen(true)}>
          Nuevo socio
        </Button>
      </div>

      {isLoading ? (
        <FullPageSpinner />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Sin socios"
          description="Creá el primer socio para empezar a gestionar el gimnasio."
          action={
            <Button leftIcon={<Plus className="size-4" />} onClick={() => setModalOpen(true)}>
              Nuevo socio
            </Button>
          }
        />
      ) : (
        <Table
          columns={columns}
          rows={filtered}
          keyOf={(m) => m.id}
          onRowClick={(m) => navigate(adminMemberDetail(m.id))}
        />
      )}

      <MemberFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreate}
        saving={createMember.isPending}
      />
    </AppLayout>
  )
}

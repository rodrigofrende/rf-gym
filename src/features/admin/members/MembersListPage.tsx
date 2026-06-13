import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Plus, Search, Users, Wallet } from 'lucide-react'
import type { Member, MemberStatus } from '@/types'
import { useAuth } from '@/providers/AuthProvider'
import { useTenant } from '@/providers/TenantProvider'
import { useCreateMember, useMembers } from '@/hooks/useMembers'
import { useToastAction } from '@/hooks/useToastAction'
import { AppLayout } from '@/components/layout/AppLayout'
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  FullPageSpinner,
  Input,
  Money,
  Sensitive,
  Table,
  type Column,
} from '@/components/ui'
import { STATUS_LABEL } from '@/utils/roles'
import { adminMemberDetail } from '@/routes/routePaths'
import { MemberFormModal } from './MemberFormModal'
import { MemberRegisterPaymentModal } from './MemberRegisterPaymentModal'

const STATUS_TONE: Record<MemberStatus, 'green' | 'amber' | 'red'> = {
  active: 'green',
  paused: 'amber',
  overdue: 'red',
}

export function MembersListPage() {
  const { user } = useAuth()
  const { activeGymId } = useTenant()
  const gymId = activeGymId as string
  const navigate = useNavigate()
  const run = useToastAction()
  const { data: members = [], isLoading } = useMembers(gymId)
  const createMember = useCreateMember(gymId)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [payMember, setPayMember] = useState<Member | null>(null)

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return members
    return members.filter(
      (m) => m.fullName.toLowerCase().includes(q) || m.email.toLowerCase().includes(q),
    )
  }, [members, search])

  const openPay = (member: Member, e?: { stopPropagation: () => void }) => {
    e?.stopPropagation()
    setPayMember(member)
  }

  const columns: Column<Member>[] = [
    {
      key: 'name',
      header: 'Socio',
      render: (m) => (
        <div className="flex items-center gap-3">
          <Avatar name={m.fullName} src={m.photoURL} size="sm" />
          <div>
            <p className="font-medium text-zinc-900">{m.fullName}</p>
            <Sensitive className="block text-xs text-zinc-500">{m.email}</Sensitive>
          </div>
        </div>
      ),
    },
    { key: 'service', header: 'Servicio', render: (m) => m.service || '—' },
    {
      key: 'cost',
      header: 'Mensual',
      render: (m) => <Money value={m.monthlyCost} />,
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
    {
      key: 'actions',
      header: '',
      className: 'w-px whitespace-nowrap',
      render: (m) => (
        <Button
          size="sm"
          leftIcon={<Wallet className="size-4" />}
          onClick={(e) => openPay(m, e)}
          aria-label={`Registrar pago de ${m.fullName}`}
        >
          Registrar pago
        </Button>
      ),
    },
  ]

  const handleCreate = async (data: Omit<Member, 'id' | 'uid'>) => {
    const ok = await run(() => createMember.mutateAsync(data), {
      success: 'Socio creado. Podrá ingresar con su email.',
      error: 'No se pudo crear el socio',
    })
    if (ok) setModalOpen(false)
  }

  return (
    <AppLayout
      title="Socios"
      subtitle="Gestioná las altas, pagos y rutinas de tus socios."
      actions={
        <Button leftIcon={<Plus className="size-4" />} onClick={() => setModalOpen(true)}>
          Nuevo socio
        </Button>
      }
    >
      <div className="relative mb-5 max-w-xs">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
        <Input
          className="pl-9"
          placeholder="Buscar por nombre o email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <FullPageSpinner />
      ) : filtered.length === 0 ? (
        search.trim() ? (
          <EmptyState
            icon={Search}
            title="Sin resultados"
            description={`No hay socios que coincidan con "${search.trim()}".`}
          />
        ) : (
          <EmptyState
            icon={Users}
            title="Sin socios"
            description="Creá el primer socio para empezar a gestionar el gimnasio."
          />
        )
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {filtered.map((m) => (
              <Card key={m.id} className="overflow-hidden">
                <button
                  type="button"
                  onClick={() => navigate(adminMemberDetail(m.id))}
                  className="flex w-full items-center gap-3 p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500"
                >
                  <Avatar name={m.fullName} src={m.photoURL} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-zinc-900">{m.fullName}</p>
                    <Sensitive className="block truncate text-xs text-zinc-500">{m.email}</Sensitive>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge tone={STATUS_TONE[m.status]}>{STATUS_LABEL[m.status]}</Badge>
                      {m.monthlyCost != null ? (
                        <span className="text-xs text-zinc-500">
                          <Money value={m.monthlyCost} /> /mes
                        </span>
                      ) : null}
                      {!m.uid ? <Badge tone="amber">Pendiente</Badge> : null}
                    </div>
                  </div>
                  <ChevronRight className="size-5 shrink-0 text-zinc-300" aria-hidden />
                </button>
                <div className="border-t border-zinc-100 p-3">
                  <Button
                    fullWidth
                    leftIcon={<Wallet className="size-4" />}
                    onClick={() => openPay(m)}
                  >
                    Registrar pago
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          <div className="hidden md:block">
            <Table
              columns={columns}
              rows={filtered}
              keyOf={(m) => m.id}
              onRowClick={(m) => navigate(adminMemberDetail(m.id))}
            />
          </div>
        </>
      )}

      <MemberFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreate}
        saving={createMember.isPending}
      />

      {payMember && (
        <MemberRegisterPaymentModal
          open
          onClose={() => setPayMember(null)}
          gymId={gymId}
          member={payMember}
          adminUid={user?.uid ?? ''}
        />
      )}
    </AppLayout>
  )
}

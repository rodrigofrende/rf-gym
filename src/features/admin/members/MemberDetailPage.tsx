import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Lock, Pencil, Trash2, Wallet } from 'lucide-react'
import type { Member } from '@/types'
import { useAuth } from '@/providers/AuthProvider'
import { useTenant } from '@/providers/TenantProvider'
import { useMember, useRemoveMember, useUpdateMember } from '@/hooks/useMembers'
import { useToastAction } from '@/hooks/useToastAction'
import { AppLayout } from '@/components/layout/AppLayout'
import { Avatar, Badge, Button, Card, CardBody, CardHeader, ConfirmDialog, FullPageSpinner, Sensitive } from '@/components/ui'
import { InfoGrid } from '@/components/shared/InfoGrid'
import { formatDate } from '@/utils/format'
import { ROLE_LABEL } from '@/utils/roles'
import { ROUTES } from '@/routes/routePaths'
import { cn } from '@/utils/cn'
import { MemberFormModal } from './MemberFormModal'
import { MemberRegisterPaymentModal } from './MemberRegisterPaymentModal'
import { NotesTab } from './tabs/NotesTab'
import { AssignmentsTab } from './tabs/AssignmentsTab'
import { PaymentsTab } from './tabs/PaymentsTab'
import { ProgressTab } from './tabs/ProgressTab'

type Tab = 'data' | 'notes' | 'payments' | 'routines' | 'progress'
const TABS: { key: Tab; label: string; locked?: boolean }[] = [
  { key: 'data', label: 'Datos' },
  { key: 'notes', label: 'Notas privadas', locked: true },
  { key: 'payments', label: 'Pagos' },
  { key: 'routines', label: 'Rutinas y cargas' },
  { key: 'progress', label: 'Progreso' },
]

export function MemberDetailPage() {
  const { uid: memberId = '' } = useParams()
  const { user } = useAuth()
  const { activeGymId } = useTenant()
  const gymId = activeGymId as string
  const navigate = useNavigate()
  const run = useToastAction()

  const { data: member, isLoading } = useMember(gymId, memberId)
  const updateMember = useUpdateMember(gymId)
  const removeMember = useRemoveMember(gymId)
  const [tab, setTab] = useState<Tab>('data')
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [payOpen, setPayOpen] = useState(false)

  if (isLoading) {
    return (
      <AppLayout title="Socio">
        <FullPageSpinner />
      </AppLayout>
    )
  }

  if (!member) {
    return (
      <AppLayout title="Socio">
        <p className="text-sm text-zinc-500">No se encontró el socio.</p>
      </AppLayout>
    )
  }

  const handleEdit = async (data: Omit<Member, 'id' | 'uid'>) => {
    const ok = await run(() => updateMember.mutateAsync({ memberId, data }), {
      success: 'Socio actualizado',
      error: 'No se pudo actualizar',
    })
    if (ok) setEditOpen(false)
  }

  const confirmDelete = async () => {
    const ok = await run(() => removeMember.mutateAsync(memberId), {
      success: 'Socio eliminado',
      error: 'No se pudo eliminar',
    })
    if (ok) navigate(ROUTES.ADMIN_MEMBERS)
  }

  return (
    <AppLayout title="Detalle de socio">
      <button
        onClick={() => navigate(ROUTES.ADMIN_MEMBERS)}
        className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700"
      >
        <ArrowLeft className="size-4" /> Volver a socios
      </button>

      <Card className="mb-5">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar name={member.fullName} src={member.photoURL} size="lg" />
            <div>
              <h2 className="text-xl font-bold text-zinc-900">{member.fullName}</h2>
              <Sensitive className="block text-sm text-zinc-500">{member.email}</Sensitive>
              <div className="mt-2 flex items-center gap-2">
                <Badge tone="brand">{ROLE_LABEL[member.role]}</Badge>
                {!member.uid && <Badge tone="amber">Invitación pendiente</Badge>}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button leftIcon={<Wallet className="size-4" />} onClick={() => setPayOpen(true)}>
              Registrar pago
            </Button>
            <Button variant="secondary" leftIcon={<Pencil className="size-4" />} onClick={() => setEditOpen(true)}>
              Editar
            </Button>
            <Button variant="danger" leftIcon={<Trash2 className="size-4" />} onClick={() => setDeleteOpen(true)}>
              Eliminar
            </Button>
          </div>
        </div>

        <div className="flex gap-1 overflow-x-auto border-t border-zinc-100 px-3">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition-colors',
                tab === t.key
                  ? 'border-brand-600 text-brand-700'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700',
              )}
            >
              {t.locked && <Lock className="size-3.5" />}
              {t.label}
            </button>
          ))}
        </div>
      </Card>

      {tab === 'data' && (
        <Card>
          <CardHeader title="Datos personales" />
          <CardBody>
            <InfoGrid
              items={[
                { label: 'Nombre', value: member.fullName },
                { label: 'Email', value: <Sensitive>{member.email}</Sensitive> },
                { label: 'Teléfono', value: <Sensitive>{member.phone || '—'}</Sensitive> },
                { label: 'Nacimiento', value: formatDate(member.birthDate) },
              ]}
            />
          </CardBody>
        </Card>
      )}

      {tab === 'notes' && <NotesTab gymId={gymId} memberId={memberId} adminUid={user?.uid ?? ''} />}

      {tab === 'payments' && (
        <PaymentsTab gymId={gymId} member={member} adminUid={user?.uid ?? ''} />
      )}

      {tab === 'routines' && <AssignmentsTab gymId={gymId} memberId={memberId} />}

      {tab === 'progress' && <ProgressTab gymId={gymId} memberId={memberId} />}

      <MemberFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSubmit={handleEdit}
        initial={member}
        saving={updateMember.isPending}
      />

      {payOpen && (
        <MemberRegisterPaymentModal
          open
          onClose={() => setPayOpen(false)}
          gymId={gymId}
          member={member}
          adminUid={user?.uid ?? ''}
        />
      )}

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={confirmDelete}
        title="Eliminar socio"
        description={`¿Querés eliminar a ${member.fullName}? Se borrarán sus datos, pagos y registros. Esta acción no se puede deshacer.`}
        loading={removeMember.isPending}
      />
    </AppLayout>
  )
}

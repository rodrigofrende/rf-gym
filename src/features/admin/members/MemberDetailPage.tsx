import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Lock, Pencil, Trash2 } from 'lucide-react'
import type { Member } from '@/types'
import { useAuth } from '@/providers/AuthProvider'
import { useTenant } from '@/providers/TenantProvider'
import { useToast } from '@/providers/ToastProvider'
import { useMember, useRemoveMember, useUpdateMember } from '@/hooks/useMembers'
import { AppLayout } from '@/components/layout/AppLayout'
import { Avatar, Badge, Button, Card, CardBody, CardHeader, FullPageSpinner } from '@/components/ui'
import { InfoGrid } from '@/components/shared/InfoGrid'
import { formatDate } from '@/utils/format'
import { ROLE_LABEL } from '@/utils/roles'
import { ROUTES } from '@/routes/routePaths'
import { cn } from '@/utils/cn'
import { MemberFormModal } from './MemberFormModal'
import { NotesTab } from './tabs/NotesTab'
import { AssignmentsTab } from './tabs/AssignmentsTab'
import { PaymentsTab } from './tabs/PaymentsTab'

type Tab = 'data' | 'notes' | 'payments' | 'routines'
const TABS: { key: Tab; label: string; locked?: boolean }[] = [
  { key: 'data', label: 'Datos' },
  { key: 'notes', label: 'Notas privadas', locked: true },
  { key: 'payments', label: 'Pagos' },
  { key: 'routines', label: 'Rutinas y cargas' },
]

export function MemberDetailPage() {
  const { uid: memberId = '' } = useParams()
  const { user } = useAuth()
  const { activeGymId } = useTenant()
  const gymId = activeGymId as string
  const navigate = useNavigate()
  const { notify } = useToast()

  const { data: member, isLoading } = useMember(gymId, memberId)
  const updateMember = useUpdateMember(gymId)
  const removeMember = useRemoveMember(gymId)
  const [tab, setTab] = useState<Tab>('data')
  const [editOpen, setEditOpen] = useState(false)

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
        <p className="text-sm text-slate-500">No se encontró el socio.</p>
      </AppLayout>
    )
  }

  const handleEdit = async (data: Omit<Member, 'id' | 'uid'>) => {
    try {
      await updateMember.mutateAsync({ memberId, data })
      notify('Socio actualizado', 'success')
      setEditOpen(false)
    } catch {
      notify('No se pudo actualizar', 'error')
    }
  }

  const handleDelete = async () => {
    if (!confirm(`¿Eliminar a ${member.fullName}?`)) return
    try {
      await removeMember.mutateAsync(memberId)
      notify('Socio eliminado', 'success')
      navigate(ROUTES.ADMIN_MEMBERS)
    } catch {
      notify('No se pudo eliminar', 'error')
    }
  }

  return (
    <AppLayout title="Detalle de socio">
      <button
        onClick={() => navigate(ROUTES.ADMIN_MEMBERS)}
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="size-4" /> Volver a socios
      </button>

      <Card className="mb-5">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar name={member.fullName} src={member.photoURL} size="lg" />
            <div>
              <h2 className="text-xl font-bold text-slate-900">{member.fullName}</h2>
              <p className="text-sm text-slate-500">{member.email}</p>
              <div className="mt-2 flex items-center gap-2">
                <Badge tone="brand">{ROLE_LABEL[member.role]}</Badge>
                {!member.uid && <Badge tone="amber">Invitación pendiente</Badge>}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" leftIcon={<Pencil className="size-4" />} onClick={() => setEditOpen(true)}>
              Editar
            </Button>
            <Button variant="danger" leftIcon={<Trash2 className="size-4" />} onClick={handleDelete}>
              Eliminar
            </Button>
          </div>
        </div>

        <div className="flex gap-1 overflow-x-auto border-t border-slate-100 px-3">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition-colors',
                tab === t.key
                  ? 'border-brand-600 text-brand-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700',
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
                { label: 'Email', value: member.email },
                { label: 'Teléfono', value: member.phone || '—' },
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

      <MemberFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSubmit={handleEdit}
        initial={member}
        saving={updateMember.isPending}
      />
    </AppLayout>
  )
}

import { useState } from 'react'
import { Plus } from 'lucide-react'
import type { Member } from '@/types'
import { useToast } from '@/providers/ToastProvider'
import { useMemberPayments, useRemoveMemberPayment } from '@/hooks/usePayments'
import { Badge, Button, Card, CardBody, CardHeader, ConfirmDialog, Spinner } from '@/components/ui'
import { InfoGrid } from '@/components/shared/InfoGrid'
import { STATUS_LABEL } from '@/utils/roles'
import { PaymentSummary } from '@/features/payments/PaymentSummary'
import { PaymentHistoryList } from '@/features/payments/PaymentHistoryList'
import { MemberRegisterPaymentModal } from '../MemberRegisterPaymentModal'

export function PaymentsTab({
  gymId,
  member,
  adminUid,
}: {
  gymId: string
  member: Member
  adminUid: string
}) {
  const { notify } = useToast()
  const { data: payments = [], isLoading } = useMemberPayments(gymId, member.id)
  const removePayment = useRemoveMemberPayment(gymId, member.id)
  const [open, setOpen] = useState(false)
  const [toDelete, setToDelete] = useState<string | null>(null)

  const confirmDelete = async () => {
    if (!toDelete) return
    try {
      await removePayment.mutateAsync(toDelete)
      notify('Pago eliminado', 'success')
      setToDelete(null)
    } catch {
      notify('No se pudo eliminar el pago', 'error')
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Pagos"
          subtitle="Cuota, vencimiento y deuda"
          action={
            <Button size="sm" leftIcon={<Plus className="size-4" />} onClick={() => setOpen(true)}>
              Registrar pago
            </Button>
          }
        />
        <CardBody className="space-y-4">
          <PaymentSummary
            monthlyCost={member.monthlyCost}
            lastPaymentDate={member.lastPaymentDate}
            dueDate={member.paymentDate}
          />
          <InfoGrid
            items={[
              { label: 'Servicio', value: member.service || '—' },
              { label: 'Estado', value: <Badge tone="neutral">{STATUS_LABEL[member.status]}</Badge> },
            ]}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Historial de pagos" />
        <CardBody>
          {isLoading ? (
            <Spinner />
          ) : (
            <PaymentHistoryList payments={payments} onDelete={(id) => setToDelete(id)} />
          )}
        </CardBody>
      </Card>

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        title="Eliminar pago"
        description="¿Querés eliminar este pago del historial? Esta acción no se puede deshacer."
        loading={removePayment.isPending}
      />

      {open && (
        <MemberRegisterPaymentModal
          open
          onClose={() => setOpen(false)}
          gymId={gymId}
          member={member}
          adminUid={adminUid}
        />
      )}
    </div>
  )
}

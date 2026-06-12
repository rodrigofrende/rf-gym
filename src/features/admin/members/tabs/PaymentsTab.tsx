import { useState } from 'react'
import { Plus } from 'lucide-react'
import type { Member } from '@/types'
import { useToast } from '@/providers/ToastProvider'
import {
  useMemberPayments,
  useRegisterMemberPayment,
  useRemoveMemberPayment,
} from '@/hooks/usePayments'
import { Badge, Button, Card, CardBody, CardHeader, Spinner } from '@/components/ui'
import { InfoGrid } from '@/components/shared/InfoGrid'
import { toDate } from '@/utils/format'
import { STATUS_LABEL } from '@/utils/roles'
import { PaymentSummary } from '@/features/payments/PaymentSummary'
import { PaymentHistoryList } from '@/features/payments/PaymentHistoryList'
import { RegisterPaymentModal, type PaymentFormValue } from '@/features/payments/RegisterPaymentModal'

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
  const register = useRegisterMemberPayment(gymId, member.id)
  const removePayment = useRemoveMemberPayment(gymId, member.id)
  const [open, setOpen] = useState(false)

  const handleSubmit = async (v: PaymentFormValue) => {
    try {
      await register.mutateAsync({
        payment: { amount: v.amount, date: v.date, comment: v.comment, createdBy: adminUid },
        currentDueDate: toDate(member.paymentDate) ?? undefined,
      })
      notify('Pago registrado', 'success')
      setOpen(false)
    } catch {
      notify('No se pudo registrar el pago', 'error')
    }
  }

  const handleDelete = async (paymentId: string) => {
    if (!confirm('¿Eliminar este pago del historial?')) return
    try {
      await removePayment.mutateAsync(paymentId)
      notify('Pago eliminado', 'success')
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
            <PaymentHistoryList payments={payments} onDelete={handleDelete} />
          )}
        </CardBody>
      </Card>

      {open && (
        <RegisterPaymentModal
          open
          onClose={() => setOpen(false)}
          defaultAmount={member.monthlyCost ?? 0}
          onSubmit={handleSubmit}
          saving={register.isPending}
        />
      )}
    </div>
  )
}

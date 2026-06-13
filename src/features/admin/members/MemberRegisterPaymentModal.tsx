import type { Member } from '@/types'
import { useToast } from '@/providers/ToastProvider'
import { useRegisterMemberPayment } from '@/hooks/usePayments'
import { RegisterPaymentModal, type PaymentFormValue } from '@/features/payments/RegisterPaymentModal'
import { toDate } from '@/utils/format'

export function MemberRegisterPaymentModal({
  open,
  onClose,
  gymId,
  member,
  adminUid,
}: {
  open: boolean
  onClose: () => void
  gymId: string
  member: Member
  adminUid: string
}) {
  const { notify } = useToast()
  const register = useRegisterMemberPayment(gymId, member.id)

  const handleSubmit = async (v: PaymentFormValue) => {
    try {
      await register.mutateAsync({
        payment: { amount: v.amount, date: v.date, comment: v.comment, createdBy: adminUid },
        currentDueDate: toDate(member.paymentDate) ?? undefined,
      })
      notify('Pago registrado', 'success')
      onClose()
    } catch {
      notify('No se pudo registrar el pago', 'error')
    }
  }

  if (!open) return null

  return (
    <RegisterPaymentModal
      open
      onClose={onClose}
      defaultAmount={member.monthlyCost ?? 0}
      title={`Registrar pago — ${member.fullName}`}
      onSubmit={handleSubmit}
      saving={register.isPending}
    />
  )
}

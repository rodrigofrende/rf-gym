import type { Member } from '@/types'
import { useRegisterMemberPayment } from '@/hooks/usePayments'
import { useToastAction } from '@/hooks/useToastAction'
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
  const run = useToastAction()
  const register = useRegisterMemberPayment(gymId, member.id)

  const handleSubmit = async (v: PaymentFormValue) => {
    const ok = await run(
      () =>
        register.mutateAsync({
          payment: { amount: v.amount, date: v.date, comment: v.comment, createdBy: adminUid },
          currentDueDate: toDate(member.paymentDate) ?? undefined,
        }),
      { success: 'Pago registrado', error: 'No se pudo registrar el pago' },
    )
    if (ok) onClose()
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

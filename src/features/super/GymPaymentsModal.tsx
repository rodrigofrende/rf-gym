import { useState } from 'react'
import { Plus } from 'lucide-react'
import type { Gym, GymSubscription } from '@/types'
import { useAuth } from '@/providers/AuthProvider'
import { useToast } from '@/providers/ToastProvider'
import { useGymPayments, useRegisterGymPayment, useRemoveGymPayment } from '@/hooks/usePayments'
import { Button, ConfirmDialog, FormField, Input, Modal, MoneyInput, Spinner } from '@/components/ui'
import { toDateInput } from '@/utils/format'
import { PaymentSummary } from '@/features/payments/PaymentSummary'
import { PaymentHistoryList } from '@/features/payments/PaymentHistoryList'

/** Detalle de suscripción + registrar pago + historial de un gym (super-admin). */
export function GymPaymentsModal({ gym, onClose }: { gym: Gym; onClose: () => void }) {
  const { user } = useAuth()
  const { notify } = useToast()
  const { data: payments = [], isLoading } = useGymPayments(gym.id)
  const register = useRegisterGymPayment(gym.id)
  const removePayment = useRemoveGymPayment(gym.id)
  const sub = gym.subscription

  const [amount, setAmount] = useState(sub?.monthlyCost ?? 0)
  const [date, setDate] = useState(() => toDateInput(new Date()))
  const [comment, setComment] = useState('')
  const [toDelete, setToDelete] = useState<string | null>(null)

  const handleRegister = async () => {
    if (amount <= 0) return
    const subscription: GymSubscription = sub ?? { monthlyCost: amount, status: 'active' }
    try {
      await register.mutateAsync({
        payment: {
          amount,
          date: new Date(date),
          comment: comment.trim() || undefined,
          createdBy: user?.uid ?? '',
        },
        subscription,
      })
      notify('Pago registrado', 'success')
      setComment('')
    } catch {
      notify('No se pudo registrar el pago', 'error')
    }
  }

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
    <Modal open onClose={onClose} title={`Suscripción — ${gym.name}`} size="lg">
      <div className="space-y-4">
        <PaymentSummary
          subject="gym"
          monthlyCost={sub?.monthlyCost}
          lastPaymentDate={sub?.lastPaymentDate}
          dueDate={sub?.dueDate}
        />

        <div className="space-y-3 rounded-lg border border-zinc-200 p-3">
          <p className="text-sm font-medium text-zinc-700">Registrar pago</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <FormField label="Monto">
              <MoneyInput value={amount} onChange={setAmount} />
            </FormField>
            <FormField label="Fecha">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </FormField>
            <FormField label="Comentario (opcional)">
              <Input
                placeholder="Ej. Transferencia"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </FormField>
          </div>
          <div className="flex justify-end">
            <Button
              leftIcon={<Plus className="size-4" />}
              loading={register.isPending}
              disabled={amount <= 0}
              onClick={handleRegister}
            >
              Registrar pago
            </Button>
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-zinc-700">Historial</p>
          {isLoading ? (
            <Spinner />
          ) : (
            <PaymentHistoryList payments={payments} onDelete={(id) => setToDelete(id)} />
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        title="Eliminar pago"
        description="¿Querés eliminar este pago del historial? Esta acción no se puede deshacer."
        loading={removePayment.isPending}
      />
    </Modal>
  )
}

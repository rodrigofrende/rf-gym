import { useState } from 'react'
import { Button, FormField, Input, Modal, MoneyInput } from '@/components/ui'
import { toDateInput } from '@/utils/format'

export interface PaymentFormValue {
  amount: number
  date: Date
  comment?: string
}

/**
 * Modal para registrar un pago. El padre debe montarlo recién al abrir
 * (`open && <RegisterPaymentModal .../>`) para resetear el estado por apertura.
 */
export function RegisterPaymentModal({
  open,
  onClose,
  defaultAmount = 0,
  onSubmit,
  saving,
  title = 'Registrar pago',
}: {
  open: boolean
  onClose: () => void
  defaultAmount?: number
  onSubmit: (value: PaymentFormValue) => void
  saving?: boolean
  title?: string
}) {
  const [amount, setAmount] = useState(defaultAmount)
  const [date, setDate] = useState(() => toDateInput(new Date()))
  const [comment, setComment] = useState('')

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="space-y-4">
        <FormField label="Monto">
          <MoneyInput value={amount} onChange={setAmount} autoFocus />
        </FormField>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Fecha del pago">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </FormField>
          <FormField label="Comentario (opcional)">
            <Input
              placeholder="Ej. Pago en efectivo"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </FormField>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            loading={saving}
            disabled={amount <= 0 || !date}
            onClick={() =>
              onSubmit({ amount, date: new Date(date), comment: comment.trim() || undefined })
            }
          >
            Registrar pago
          </Button>
        </div>
      </div>
    </Modal>
  )
}

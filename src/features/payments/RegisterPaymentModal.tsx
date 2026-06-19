import { useState } from 'react'
import { Button, DateInput, FormField, Input, Modal, MoneyInput } from '@/components/ui'
import { parseDateInput, todayDateInput } from '@/utils/dates'

export interface PaymentFormValue {
  amount: number
  date: Date
  comment?: string
}

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
  const [date, setDate] = useState(() => todayDateInput())
  const [comment, setComment] = useState('')

  const canSubmit = amount > 0 && !!date

  const submit = () => {
    if (!canSubmit) return
    onSubmit({ amount, date: parseDateInput(date), comment: comment.trim() || undefined })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      closeOnBackdrop={!saving}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" fullWidth className="sm:w-auto" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            fullWidth
            className="sm:w-auto"
            loading={saving}
            disabled={!canSubmit}
            onClick={submit}
          >
            Registrar pago
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <FormField label="Monto">
          <MoneyInput value={amount} onChange={setAmount} autoFocus className="h-11 text-base sm:h-10 sm:text-sm" />
        </FormField>
        <FormField label="Fecha del pago">
          <DateInput value={date} onChange={(e) => setDate(e.target.value)} />
        </FormField>
        <FormField label="Comentario">
          <Input
            placeholder="Ej. Pago en efectivo"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="h-11 text-base sm:h-10 sm:text-sm"
          />
        </FormField>
        {!canSubmit && amount <= 0 && (
          <p className="text-xs text-zinc-500">Ingresá un monto mayor a cero para registrar el pago.</p>
        )}
      </div>
    </Modal>
  )
}

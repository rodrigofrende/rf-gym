import { Trash2 } from 'lucide-react'
import type { Payment } from '@/types'
import { formatCurrency, formatDate } from '@/utils/format'

export function PaymentHistoryList({
  payments,
  onDelete,
}: {
  payments: Payment[]
  onDelete?: (paymentId: string) => void
}) {
  if (!payments.length) {
    return <p className="text-sm text-slate-500">Todavía no hay pagos registrados.</p>
  }
  return (
    <ul className="space-y-2">
      {payments.map((p) => (
        <li
          key={p.id}
          className="flex items-center justify-between gap-3 border-b border-slate-50 pb-2 text-sm last:border-0"
        >
          <div className="min-w-0">
            <p className="font-medium text-slate-800">{formatCurrency(p.amount)}</p>
            {p.comment && <p className="truncate text-xs text-slate-500">{p.comment}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="text-xs text-slate-400">{formatDate(p.date)}</span>
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(p.id)}
                aria-label="Eliminar pago"
                className="text-slate-400 hover:text-red-500"
              >
                <Trash2 className="size-4" />
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}

import { Minus, Plus } from 'lucide-react'
import { IconButton } from '@/components/ui'

/** Stepper de cantidad (−/qty/+). Bajar a 0 elimina el producto del carrito. */
export function QtyStepper({
  qty,
  onChange,
  productName,
  max = 99,
}: {
  qty: number
  onChange: (qty: number) => void
  productName: string
  max?: number
}) {
  return (
    <div className="flex shrink-0 items-center gap-0.5 rounded-[var(--radius-control)] border border-zinc-200 bg-surface">
      <IconButton
        size="sm"
        icon={<Minus className="size-4" />}
        label={`Quitar uno de ${productName}`}
        onClick={() => onChange(qty - 1)}
      />
      <span className="w-6 text-center text-sm font-semibold tabular-nums text-zinc-900">
        {qty}
      </span>
      <IconButton
        size="sm"
        icon={<Plus className="size-4" />}
        label={`Agregar uno de ${productName}`}
        onClick={() => onChange(qty + 1)}
        disabled={qty >= max}
      />
    </div>
  )
}

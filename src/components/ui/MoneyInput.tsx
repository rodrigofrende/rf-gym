import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'
import { formatThousands, parseMoney } from '@/utils/format'

type MoneyInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'type'
> & {
  value: number
  onChange: (value: number) => void
  invalid?: boolean
}

/**
 * Input de dinero: muestra el monto con `.` de miles y prefijo `$`, sin
 * decimales. Trabaja siempre con números enteros (pesos redondos).
 */
export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(function MoneyInput(
  { className, value, onChange, invalid, ...props },
  ref,
) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
        $
      </span>
      <input
        ref={ref}
        inputMode="numeric"
        value={value ? formatThousands(value) : ''}
        onChange={(e) => onChange(parseMoney(e.target.value))}
        className={cn(
          'h-10 w-full rounded-lg border bg-surface pl-7 pr-3 text-sm text-slate-900 transition-colors',
          'placeholder:text-slate-400 focus:outline-none focus:ring-2',
          invalid
            ? 'border-red-400 focus:ring-red-300'
            : 'border-slate-200 focus:border-brand-400 focus:ring-brand-200',
          'disabled:cursor-not-allowed disabled:bg-slate-50',
          className,
        )}
        {...props}
      />
    </div>
  )
})

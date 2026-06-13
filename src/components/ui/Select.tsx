import { forwardRef, type SelectHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

type Option = { value: string; label: string }

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  options: Option[]
  invalid?: boolean
  placeholder?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, options, invalid, placeholder, ...props },
  ref,
) {
  return (
    <select
      ref={ref}
      className={cn(
        'h-10 w-full rounded-lg border bg-surface px-3 text-sm text-zinc-900 transition-colors',
        'focus-visible:outline-none focus-visible:ring-2',
        invalid
          ? 'border-red-400 focus-visible:ring-red-300'
          : 'border-zinc-200 focus-visible:border-brand-400 focus-visible:ring-brand-200',
        className,
      )}
      {...props}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
})

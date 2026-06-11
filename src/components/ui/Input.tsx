import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

type InputProps = InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(
        'h-10 w-full rounded-lg border bg-surface px-3 text-sm text-slate-900 transition-colors',
        'placeholder:text-slate-400 focus:outline-none focus:ring-2',
        invalid
          ? 'border-red-400 focus:ring-red-300'
          : 'border-slate-200 focus:border-brand-400 focus:ring-brand-200',
        'disabled:cursor-not-allowed disabled:bg-slate-50',
        className,
      )}
      {...props}
    />
  )
})

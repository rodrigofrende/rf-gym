import type { ReactNode } from 'react'

export function FormField({
  label,
  hint,
  error,
  required,
  children,
}: {
  label: string
  hint?: string
  error?: string
  required?: boolean
  children: ReactNode
}) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      {hint && <span className="-mt-1 block text-xs text-slate-400">{hint}</span>}
      {children}
      {error && <span className="block text-xs text-red-500">{error}</span>}
    </label>
  )
}

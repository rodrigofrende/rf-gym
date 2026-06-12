import type { ReactNode } from 'react'
import { InfoTooltip } from './InfoTooltip'

export function FormField({
  label,
  hint,
  tooltip,
  error,
  required,
  children,
}: {
  label: string
  hint?: string
  tooltip?: string
  error?: string
  required?: boolean
  children: ReactNode
}) {
  return (
    <label className="block space-y-1.5">
      <span className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
        <span>
          {label}
          {required && <span className="text-red-500"> *</span>}
        </span>
        {tooltip && <InfoTooltip text={tooltip} />}
      </span>
      {hint && <span className="-mt-1 block text-xs text-slate-400">{hint}</span>}
      {children}
      {error && <span className="block text-xs text-red-500">{error}</span>}
    </label>
  )
}

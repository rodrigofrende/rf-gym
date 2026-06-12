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
  // El hint deja de ser una línea extra debajo del label (genera saltos y
  // satura): se muestra como tooltip en el ícono de info. `tooltip` tiene
  // prioridad si se pasan ambos.
  const help = tooltip || hint
  return (
    <label className="block space-y-1.5">
      <span className="flex items-center gap-1.5 text-sm font-medium text-zinc-700">
        <span>
          {label}
          {required && <span className="text-red-500"> *</span>}
        </span>
        {help && <InfoTooltip text={help} />}
      </span>
      {children}
      {error && <span className="block text-xs text-red-500">{error}</span>}
    </label>
  )
}

import type { ReactNode } from 'react'

export function InfoGrid({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
      {items.map((it) => (
        <div key={it.label}>
          <dt className="text-xs uppercase tracking-wide text-slate-400">{it.label}</dt>
          <dd className="mt-0.5 text-sm font-medium text-slate-800">{it.value}</dd>
        </div>
      ))}
    </dl>
  )
}

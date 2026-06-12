import { Info } from 'lucide-react'

/** Ícono de info con tooltip al hover/focus. Pensado para aclarar un campo. */
export function InfoTooltip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex align-middle" tabIndex={0}>
      <Info className="size-3.5 cursor-help text-slate-400" aria-hidden />
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-30 mt-1.5 hidden w-60 -translate-x-1/2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-normal leading-relaxed text-white shadow-lg group-hover:block group-focus:block"
      >
        {text}
      </span>
    </span>
  )
}

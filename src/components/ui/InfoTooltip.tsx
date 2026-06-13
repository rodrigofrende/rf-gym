import { useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Info } from 'lucide-react'

const WIDTH = 240
const MARGIN = 8

/**
 * Ícono de info con tooltip al hover/focus. Tooltip oscuro para buen contraste
 * sobre cualquier fondo de la app.
 */
export function InfoTooltip({ text }: { text: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const id = useId()
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)

  const show = () => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const half = WIDTH / 2
    const center = Math.min(
      Math.max(r.left + r.width / 2, MARGIN + half),
      window.innerWidth - MARGIN - half,
    )
    setCoords({ top: r.bottom + MARGIN, left: center })
  }
  const hide = () => setCoords(null)

  return (
    <span
      ref={ref}
      tabIndex={0}
      aria-describedby={coords ? id : undefined}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      className="inline-flex cursor-help align-middle text-zinc-500 outline-none hover:text-zinc-700 focus-visible:text-zinc-700"
    >
      <Info className="size-3.5" aria-hidden />
      {coords &&
        createPortal(
          <span
            id={id}
            role="tooltip"
            style={{ top: coords.top, left: coords.left, width: WIDTH }}
            className="pointer-events-none fixed z-[60] -translate-x-1/2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-normal leading-relaxed text-zinc-50 shadow-xl"
          >
            {text}
          </span>,
          document.body,
        )}
    </span>
  )
}

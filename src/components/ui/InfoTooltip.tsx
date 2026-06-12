import { useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Info } from 'lucide-react'

const WIDTH = 240 // ancho del tooltip (w-60)
const MARGIN = 8 // separación del borde de la pantalla y del ícono

/**
 * Ícono de info con tooltip al hover/focus. El tooltip se renderiza en un
 * portal con posición `fixed`, para que no lo recorte el `overflow` de un modal
 * y nunca se salga de la pantalla.
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
    // Centrado bajo el ícono, pero recortado para que quepa en el viewport.
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
      className="inline-flex cursor-help align-middle text-zinc-400 outline-none hover:text-zinc-600 focus-visible:text-zinc-600"
    >
      <Info className="size-3.5" aria-hidden />
      {coords &&
        createPortal(
          <span
            id={id}
            role="tooltip"
            style={{ top: coords.top, left: coords.left, width: WIDTH }}
            className="pointer-events-none fixed z-[60] -translate-x-1/2 rounded-lg border border-zinc-200 bg-surface px-3 py-2 text-xs font-normal leading-relaxed text-zinc-600 shadow-lg"
          >
            {text}
          </span>,
          document.body,
        )}
    </span>
  )
}

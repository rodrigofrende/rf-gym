import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { Check, Copy, ExternalLink, Mail } from 'lucide-react'
import { cn } from '@/utils/cn'
import { gmailComposeUrl, mailtoLink } from '@/utils/contact'

const MENU_WIDTH = 240 // = w-60
const GAP = 8 // separación trigger ↔ menú
const MARGIN = 8 // margen mínimo al borde del viewport

type TriggerRender = (opts: { toggle: () => void; isOpen: boolean }) => ReactNode

/**
 * Botón de contacto por email que, en lugar de disparar `mailto:` directo (que
 * abre el cliente de correo por defecto del SO —a veces uno que el usuario no
 * usa, ej. Outlook—), ofrece opciones: copiar la dirección, abrir el compositor
 * de Gmail en el navegador, o el cliente de correo del sistema.
 *
 * El trigger lo provee el caller vía render-prop para conservar su estilo. El
 * panel se monta en un PORTAL con `position: fixed`, así escapa de cualquier
 * `overflow-hidden`, `@container` o stacking context del ancestro (si no, sobre
 * la landing quedaba tapado por contenedores vecinos). Panel claro y
 * self-contained: colores propios, sirve sobre fondo oscuro o claro.
 */
export function ContactMenu({
  email,
  subject,
  body,
  align = 'start',
  direction = 'down',
  block = false,
  className,
  children,
}: {
  email: string
  subject?: string
  body?: string
  align?: 'start' | 'end'
  direction?: 'down' | 'up'
  block?: boolean
  className?: string
  children: TriggerRender
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Posiciona el menú (fixed) respecto del trigger, con clamp al viewport.
  const place = useCallback(() => {
    const trigger = wrapRef.current
    if (!trigger) return
    const r = trigger.getBoundingClientRect()
    const menuH = menuRef.current?.offsetHeight ?? 0

    let left = align === 'end' ? r.right - MENU_WIDTH : r.left
    left = Math.min(Math.max(MARGIN, left), window.innerWidth - MENU_WIDTH - MARGIN)

    const below = r.bottom + GAP
    const above = r.top - GAP - menuH
    let top: number
    if (direction === 'up') {
      top = above >= MARGIN ? above : below
    } else {
      // Abajo por defecto; si no entra y arriba sí, abre hacia arriba.
      top = below + menuH <= window.innerHeight - MARGIN || above < MARGIN ? below : above
    }
    setPos({ top, left })
  }, [align, direction])

  // Mide y posiciona al abrir; recalcula en scroll/resize mientras está abierto.
  useLayoutEffect(() => {
    if (!isOpen) return
    place()
    const onReflow = () => place()
    window.addEventListener('scroll', onReflow, true)
    window.addEventListener('resize', onReflow)
    return () => {
      window.removeEventListener('scroll', onReflow, true)
      window.removeEventListener('resize', onReflow)
    }
  }, [isOpen, place])

  useEffect(() => {
    if (!isOpen) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (!wrapRef.current?.contains(t) && !menuRef.current?.contains(t)) setIsOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [isOpen])

  useEffect(() => () => clearTimeout(copyTimer.current), [])

  const close = () => {
    setIsOpen(false)
    setPos(null)
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(email)
    } catch {
      // Fallback para contextos sin Clipboard API (http, permisos denegados).
      const ta = document.createElement('textarea')
      ta.value = email
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      try {
        document.execCommand('copy')
      } catch {
        /* noop: no se pudo copiar */
      }
      document.body.removeChild(ta)
    }
    setCopied(true)
    clearTimeout(copyTimer.current)
    copyTimer.current = setTimeout(close, 1200)
  }

  const openGmail = () => {
    window.open(gmailComposeUrl(email, subject, body), '_blank', 'noopener,noreferrer')
    close()
  }

  const openMailto = () => {
    const href = mailtoLink(email, subject)
    if (href) window.location.href = href
    close()
  }

  return (
    <div
      ref={wrapRef}
      className={cn('relative', block ? 'block w-full' : 'inline-block', className)}
    >
      {children({ toggle: () => setIsOpen((v) => !v), isOpen })}
      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{
              position: 'fixed',
              top: pos?.top ?? -9999,
              left: pos?.left ?? -9999,
              width: MENU_WIDTH,
            }}
            className={cn(
              'z-[100] overflow-hidden rounded-xl border border-zinc-200 bg-white p-1 text-left shadow-xl shadow-black/25',
              pos ? '' : 'invisible',
            )}
          >
            <p className="truncate px-3 py-2 text-xs font-medium text-zinc-400">{email}</p>
            <MenuItem
              icon={
                copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />
              }
              onClick={copy}
            >
              {copied ? '¡Copiado!' : 'Copiar dirección'}
            </MenuItem>
            <MenuItem icon={<ExternalLink className="size-4" />} onClick={openGmail}>
              Abrir en Gmail
            </MenuItem>
            <MenuItem icon={<Mail className="size-4" />} onClick={openMailto}>
              Abrir en mi app de correo
            </MenuItem>
          </div>,
          document.body,
        )}
    </div>
  )
}

function MenuItem({
  icon,
  onClick,
  children,
}: {
  icon: ReactNode
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
    >
      <span className="shrink-0 text-zinc-400">{icon}</span>
      {children}
    </button>
  )
}

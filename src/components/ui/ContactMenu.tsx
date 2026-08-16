import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Check, Copy, ExternalLink, Mail } from 'lucide-react'
import { cn } from '@/utils/cn'
import { gmailComposeUrl, mailtoLink } from '@/utils/contact'

type TriggerRender = (opts: { toggle: () => void; isOpen: boolean }) => ReactNode

/**
 * Botón de contacto por email que, en lugar de disparar `mailto:` directo (que
 * abre el cliente de correo por defecto del SO —a veces uno que el usuario no
 * usa, ej. Outlook—), ofrece opciones: copiar la dirección, abrir el compositor
 * de Gmail en el navegador, o el cliente de correo del sistema.
 *
 * El trigger lo provee el caller vía render-prop para conservar su estilo. El
 * panel es claro y self-contained: funciona sobre la landing oscura y la app.
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
  const wrapRef = useRef<HTMLDivElement>(null)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    if (!isOpen) return
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setIsOpen(false)
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

  const close = () => setIsOpen(false)

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
    copyTimer.current = setTimeout(() => {
      setCopied(false)
      setIsOpen(false)
    }, 1200)
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
      {isOpen && (
        <div
          role="menu"
          className={cn(
            'absolute z-50 w-60 overflow-hidden rounded-xl border border-zinc-200 bg-white p-1 text-left shadow-xl shadow-black/20',
            direction === 'up' ? 'bottom-full mb-2' : 'top-full mt-2',
            align === 'end' ? 'right-0' : 'left-0',
          )}
        >
          <p className="truncate px-3 py-2 text-xs font-medium text-zinc-400">{email}</p>
          <MenuItem
            icon={copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
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
        </div>
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

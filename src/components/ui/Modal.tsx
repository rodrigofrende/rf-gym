import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/utils/cn'

export function Modal({
  open,
  onClose,
  title,
  children,
  size = 'md',
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  children: ReactNode
  size?: 'md' | 'lg'
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-zinc-900/50 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative z-10 flex max-h-[90vh] w-full flex-col rounded-t-2xl bg-surface shadow-xl sm:rounded-2xl',
          size === 'md' ? 'sm:max-w-lg' : 'sm:max-w-2xl',
        )}
      >
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
          <h3 className="text-base font-semibold text-zinc-900">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
            aria-label="Cerrar"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  )
}

import type { ReactNode } from 'react'
import { MessageSquareText } from 'lucide-react'
import { cn } from '@/utils/cn'

/**
 * Comentario del coach (descripción de rutina o nota de ejercicio).
 * Bloque suave compartido entre vista alumno y admin para look & feel unificado.
 * Icono size-4 + mt-0.5 queda centrado exacto con la primera línea (leading-5).
 */
export function CoachNote({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        'flex items-start gap-2 rounded-lg bg-surface-muted px-3 py-2 text-sm text-zinc-600',
        className,
      )}
    >
      <MessageSquareText className="mt-0.5 size-4 shrink-0 text-zinc-400" aria-hidden />
      <span className="min-w-0">{children}</span>
    </p>
  )
}

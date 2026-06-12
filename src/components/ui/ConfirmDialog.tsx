import type { ReactNode } from 'react'
import { Button } from './Button'
import { Modal } from './Modal'

/**
 * Diálogo de confirmación on-brand para acciones destructivas o sensibles.
 * Reemplaza al `confirm()` nativo del navegador para mantener el look & feel.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Eliminar',
  cancelLabel = 'Cancelar',
  tone = 'danger',
  loading = false,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'danger' | 'primary'
  loading?: boolean
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      {description && <p className="text-sm leading-relaxed text-zinc-600">{description}</p>}
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button
          variant={tone === 'danger' ? 'danger' : 'primary'}
          loading={loading}
          onClick={onConfirm}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}

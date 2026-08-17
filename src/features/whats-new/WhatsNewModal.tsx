import { Badge, Modal } from '@/components/ui'
import { CHANGELOG, type ChangeKind } from '@/config/changelog'

const KIND_META: Record<ChangeKind, { label: string; tone: 'green' | 'violet' | 'amber' }> = {
  new: { label: 'Nuevo', tone: 'green' },
  improved: { label: 'Mejora', tone: 'violet' },
  fixed: { label: 'Arreglo', tone: 'amber' },
}

/** Fecha YYYY-MM-DD → "17 ago 2026" sin corrimiento de zona horaria. */
function formatReleaseDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium' }).format(new Date(y, m - 1, d))
}

/** Listado de versiones (la más nueva primero) con sus mejoras en lenguaje simple. */
export function WhatsNewModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Novedades">
      <div className="space-y-6">
        {CHANGELOG.map((release, idx) => (
          <section key={release.version}>
            <div className="flex items-baseline gap-2">
              <h3 className="text-sm font-bold text-zinc-900">Versión {release.version}</h3>
              <span className="text-xs text-zinc-400">{formatReleaseDate(release.date)}</span>
              {idx === 0 && <Badge tone="green">Actual</Badge>}
            </div>
            <ul className="mt-2.5 space-y-2.5">
              {release.items.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="shrink-0 pt-px">
                    <Badge tone={KIND_META[item.kind].tone}>{KIND_META[item.kind].label}</Badge>
                  </span>
                  <span className="text-sm leading-relaxed text-zinc-600">{item.text}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Modal>
  )
}

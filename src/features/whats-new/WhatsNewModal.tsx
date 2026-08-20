import { Badge, Modal } from '@/components/ui'
import { CHANGELOG, LATEST_VERSION, type ChangeKind } from '@/config/changelog'
import { useTenant } from '@/providers/TenantProvider'

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
  const { role, isSuperAdmin } = useTenant()
  const seesAdminItems = role === 'admin' || isSuperAdmin

  // Un socio no ve las novedades de pantallas de gestión: no son suyas y sólo
  // agregan ruido. Las versiones que quedan sin items se omiten enteras, para no
  // mostrar una versión vacía.
  const releases = CHANGELOG.map((release) => ({
    ...release,
    items: release.items.filter((item) => seesAdminItems || item.audience !== 'admin'),
  })).filter((release) => release.items.length > 0)

  return (
    <Modal open={open} onClose={onClose} title="Novedades">
      <div className="space-y-6">
        {releases.map((release) => (
          <section key={release.version}>
            <div className="flex items-baseline gap-2">
              <h3 className="text-sm font-bold text-zinc-900">Versión {release.version}</h3>
              <span className="text-xs text-zinc-400">{formatReleaseDate(release.date)}</span>
              {/* Contra LATEST_VERSION y no contra el índice: al filtrar por
                  audiencia, la primera versión que ve un socio puede no ser la
                  actual. */}
              {release.version === LATEST_VERSION && <Badge tone="green">Actual</Badge>}
            </div>
            <ul className="mt-2.5 space-y-2.5">
              {release.items.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="flex shrink-0 flex-wrap items-center gap-1 pt-px">
                    <Badge tone={KIND_META[item.kind].tone}>{KIND_META[item.kind].label}</Badge>
                    {/* El tag de audiencia SOLO se le muestra al admin: es el
                        único que ve la lista mezclada, y le sirve para saber qué
                        van a leer también sus socios. A un socio le aparecería
                        "Socio" en todas las líneas, que es puro ruido. */}
                    {seesAdminItems && (
                      <Badge tone={item.audience === 'admin' ? 'sky' : 'neutral'}>
                        {item.audience === 'admin' ? 'Admin' : 'Socio'}
                      </Badge>
                    )}
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

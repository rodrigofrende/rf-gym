import { useMemo, useState } from 'react'
import { ChevronDown, History, Pencil, TrendingUp, Trash2 } from 'lucide-react'
import type { Routine, WorkoutLog } from '@/types'
import { Badge, Card, EmptyState } from '@/components/ui'
import { cn } from '@/utils/cn'
import { formatDate } from '@/utils/format'
import { formatLogSet, loadTypeMeta } from '@/utils/loadTypes'
import { exerciseProgressList, formatDelta, loadTypesByExercise } from '@/utils/logs'

const MAX_BARS = 24 // límite de barras en la mini-tendencia para no saturar

/**
 * Historial de cargas agrupado por ejercicio, con la progresión (primer → último
 * registro) y una mini-tendencia. Editable si se pasan `onEdit`/`onDelete`
 * (vista del socio); de solo lectura si no (vista del admin).
 */
export function WorkoutLogHistory({
  logs,
  routines,
  onEdit,
  onDelete,
  emptyDescription = 'Todavía no hay cargas registradas.',
}: {
  logs: WorkoutLog[]
  routines: Routine[]
  onEdit?: (log: WorkoutLog) => void
  onDelete?: (log: WorkoutLog) => void
  emptyDescription?: string
}) {
  const progress = useMemo(
    () => exerciseProgressList(logs, loadTypesByExercise(routines)),
    [logs, routines],
  )
  const [open, setOpen] = useState<Set<string>>(() => new Set())
  const toggle = (name: string) =>
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })

  if (progress.length === 0) {
    return <EmptyState icon={History} title="Sin registros" description={emptyDescription} />
  }

  return (
    <div className="space-y-3">
      {progress.map((ex) => {
        const isOpen = open.has(ex.exerciseName)
        const deltaTone = ex.delta > 0 ? 'green' : ex.delta < 0 ? 'red' : 'neutral'
        const Icon = loadTypeMeta(ex.loadType).icon
        return (
          <Card key={ex.exerciseName} className="overflow-hidden">
            <button
              type="button"
              onClick={() => toggle(ex.exerciseName)}
              aria-expanded={isOpen}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <Icon className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-zinc-900">{ex.exerciseName}</p>
                <p className="text-xs text-zinc-500">
                  Último: <span className="font-medium text-zinc-700">{ex.last.metricLabel}</span> ·{' '}
                  {ex.sessions.length} {ex.sessions.length === 1 ? 'registro' : 'registros'}
                </p>
              </div>
              {ex.sessions.length > 1 && (
                <Badge tone={deltaTone}>
                  <TrendingUp className="mr-1 inline size-3" />
                  {formatDelta(ex.delta, ex.unit)}
                </Badge>
              )}
              <ChevronDown
                className={cn(
                  'size-5 shrink-0 text-zinc-400 transition-transform',
                  isOpen && 'rotate-180',
                )}
              />
            </button>

            {isOpen && (
              <div className="space-y-4 border-t border-zinc-100 px-4 pb-4 pt-3">
                {ex.sessions.length > 1 && <Trend ex={ex} />}

                <ul className="space-y-2">
                  {[...ex.sessions].reverse().map((s) => (
                    <li
                      key={s.log.id}
                      className="flex flex-col gap-2 rounded-lg border border-zinc-100 p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-zinc-700">{formatDate(s.log.date)}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-1">
                          {s.log.sets.length === 0 ? (
                            <span className="text-xs text-zinc-400">Sin series</span>
                          ) : (
                            s.log.sets.map((set, i) => (
                              <Badge key={i} tone="neutral">
                                {formatLogSet(set, ex.loadType)}
                              </Badge>
                            ))
                          )}
                        </div>
                      </div>
                      {(onEdit || onDelete) && (
                        <div className="flex shrink-0 gap-1">
                          {onEdit && (
                            <button
                              type="button"
                              onClick={() => onEdit(s.log)}
                              aria-label={`Editar registro del ${formatDate(s.log.date)}`}
                              className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                            >
                              <Pencil className="size-4" />
                            </button>
                          )}
                          {onDelete && (
                            <button
                              type="button"
                              onClick={() => onDelete(s.log)}
                              aria-label={`Eliminar registro del ${formatDate(s.log.date)}`}
                              className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}

/** Mini-gráfico de barras de la métrica titular por sesión (viejo → nuevo). */
function Trend({ ex }: { ex: ReturnType<typeof exerciseProgressList>[number] }) {
  const sessions = ex.sessions.slice(-MAX_BARS)
  const max = Math.max(1, ex.best)
  return (
    <div className="rounded-lg bg-surface-muted p-3">
      <div className="flex h-16 items-end gap-0.5">
        {sessions.map((s, i) => {
          const isLast = i === sessions.length - 1
          return (
            <div
              key={s.log.id}
              title={`${formatDate(s.log.date)} · ${s.metricLabel}`}
              style={{ height: `${Math.max(8, (s.metric / max) * 100)}%` }}
              className={cn(
                'min-w-[3px] flex-1 rounded-t',
                isLast ? 'bg-brand-600' : 'bg-brand-300',
              )}
            />
          )
        })}
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
        <span>
          {formatDate(ex.first.date)} · {ex.first.metricLabel}
        </span>
        <span className="font-medium text-zinc-700">
          {formatDate(ex.last.date)} · {ex.last.metricLabel}
        </span>
      </div>
    </div>
  )
}

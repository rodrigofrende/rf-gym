import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { Exercise, LogSet } from '@/types'
import { Button, InfoTooltip, Input, Modal } from '@/components/ui'
import { loadTypeMeta, SHAPE_FIELDS } from '@/utils/loadTypes'

export function LogExerciseModal({
  open,
  onClose,
  exercise,
  defaultSets,
  initialSets,
  onSave,
  saving,
}: {
  open: boolean
  onClose: () => void
  exercise: Exercise | null
  defaultSets: number
  /** Si se pasan, el modal arranca en modo edición con estas series. */
  initialSets?: LogSet[]
  onSave: (sets: LogSet[]) => void
  saving?: boolean
}) {
  const meta = loadTypeMeta(exercise?.loadType)
  const fields = SHAPE_FIELDS[meta.shape]
  const Icon = meta.icon
  const editing = !!initialSets

  // En edición arranca con las series guardadas; si no, filas vacías según lo
  // planificado. El padre remonta por ejercicio/registro (key).
  const [sets, setSets] = useState<LogSet[]>(() =>
    initialSets?.length
      ? initialSets.map((s) => ({ ...s }))
      : Array.from({ length: Math.max(defaultSets, 1) }, () => ({}) as LogSet),
  )

  const update = (i: number, key: keyof LogSet, value: number) =>
    setSets((prev) => prev.map((s, idx) => (idx === i ? { ...s, [key]: value } : s)))

  const hasValue = (s: LogSet) => fields.some((f) => (s[f.key] ?? 0) > 0)

  // Columnas dinámicas: serie + un input por campo + botón borrar.
  const gridCols = { gridTemplateColumns: `2.5rem repeat(${fields.length}, 1fr) 2rem` }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={exercise ? `${editing ? 'Editar' : 'Registrar'} — ${exercise.name}` : 'Registrar'}
    >
      <div className="space-y-2">
        {/* Tipo de carga + explicación */}
        <div className="flex items-center gap-1.5 pb-1 text-sm">
          <Icon className="size-4 text-brand-600" />
          <span className="font-medium text-zinc-700">{meta.label}</span>
          <InfoTooltip text={meta.tooltip} />
        </div>

        {/* Encabezados (oficial de label de cada input del grid repetido) */}
        <div className="grid items-center gap-2 px-2 text-xs font-medium text-zinc-400" style={gridCols}>
          <span>Serie</span>
          {fields.map((f) => (
            <span key={f.key}>
              {f.label}
              {f.unit ? ` (${f.unit})` : ''}
              {f.optional ? ' · opc.' : ''}
            </span>
          ))}
          <span />
        </div>

        {sets.map((s, i) => (
          <div
            key={i}
            className="grid items-center gap-2 rounded-lg bg-surface-muted p-2"
            style={gridCols}
          >
            <span className="flex size-7 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
              {i + 1}
            </span>
            {fields.map((f) => (
              <div key={f.key} className="relative">
                <Input
                  type="number"
                  min={0}
                  className={f.unit ? 'pr-10' : undefined}
                  value={s[f.key] || ''}
                  onChange={(e) => update(i, f.key, Number(e.target.value))}
                />
                {f.unit && (
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-zinc-400">
                    {f.unit}
                  </span>
                )}
              </div>
            ))}
            <button
              type="button"
              aria-label="Eliminar serie"
              onClick={() => setSets((prev) => prev.filter((_, idx) => idx !== i))}
              className="flex items-center justify-center text-zinc-400 hover:text-red-500"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}

        <Button
          type="button"
          variant="ghost"
          size="sm"
          leftIcon={<Plus className="size-4" />}
          onClick={() => setSets((prev) => [...prev, {} as LogSet])}
        >
          Agregar serie
        </Button>

        <div className="flex justify-end gap-2 border-t border-zinc-100 pt-3">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            loading={saving}
            onClick={() => {
              onSave(sets.filter(hasValue))
              setSets([])
            }}
          >
            Guardar
          </Button>
        </div>
      </div>
    </Modal>
  )
}

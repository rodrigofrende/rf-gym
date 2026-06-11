import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { Exercise, LogSet } from '@/types'
import { Button, Input, Modal } from '@/components/ui'

export function LogExerciseModal({
  open,
  onClose,
  exercise,
  defaultSets,
  onSave,
  saving,
}: {
  open: boolean
  onClose: () => void
  exercise: Exercise | null
  defaultSets: number
  onSave: (sets: LogSet[]) => void
  saving?: boolean
}) {
  // Filas inicializadas según las series planificadas. El padre remonta este
  // modal por ejercicio (con `key`), así que el initializer corre en cada apertura.
  const [sets, setSets] = useState<LogSet[]>(() =>
    Array.from({ length: Math.max(defaultSets, 1) }, () => ({ weight: 0, reps: 0 })),
  )

  const update = (i: number, key: keyof LogSet, value: number) =>
    setSets((prev) => prev.map((s, idx) => (idx === i ? { ...s, [key]: value } : s)))

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={exercise ? `Registrar — ${exercise.name}` : 'Registrar'}
    >
      <div className="space-y-2">
        {/* Títulos de columna: ofician de label de cada input del grid repetido. */}
        <div className="grid grid-cols-[2.5rem_1fr_1fr_2rem] items-center gap-2 px-2 text-xs font-medium text-slate-400">
          <span>Serie</span>
          <span>Peso (kg)</span>
          <span>Reps</span>
          <span />
        </div>
        {sets.map((s, i) => (
          <div
            key={i}
            className="grid grid-cols-[2.5rem_1fr_1fr_2rem] items-center gap-2 rounded-lg bg-surface-muted p-2"
          >
            <span className="flex size-7 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
              {i + 1}
            </span>
            <div className="relative">
              <Input
                type="number"
                min={0}
                value={s.weight || ''}
                onChange={(e) => update(i, 'weight', Number(e.target.value))}
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-slate-400">
                kg
              </span>
            </div>
            <Input
              type="number"
              min={0}
              value={s.reps || ''}
              onChange={(e) => update(i, 'reps', Number(e.target.value))}
            />
            <button
              type="button"
              aria-label="Eliminar serie"
              onClick={() => setSets((prev) => prev.filter((_, idx) => idx !== i))}
              className="flex items-center justify-center text-slate-400 hover:text-red-500"
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
          onClick={() => setSets((prev) => [...prev, { weight: 0, reps: 0 }])}
        >
          Agregar serie
        </Button>

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            loading={saving}
            onClick={() => {
              onSave(sets.filter((s) => s.weight > 0 || s.reps > 0))
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

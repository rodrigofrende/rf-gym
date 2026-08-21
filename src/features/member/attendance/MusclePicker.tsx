import { useState } from 'react'
import type { MuscleGroup } from '@/types'
import { Button } from '@/components/ui'
import { cn } from '@/utils/cn'
import { MUSCLE_GROUP_OPTIONS, muscleGroupIcon, muscleGroupLabel } from '@/utils/exercises'

export function MusclePicker({
  value,
  onChange,
  disabled,
}: {
  value: MuscleGroup[]
  onChange: (next: MuscleGroup[]) => void
  disabled?: boolean
}) {
  const selected = new Set(value)

  const toggle = (muscle: MuscleGroup) => {
    if (disabled) return
    if (selected.has(muscle)) onChange(value.filter((m) => m !== muscle))
    else onChange([...value, muscle])
  }

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-3">
      {MUSCLE_GROUP_OPTIONS.map((muscle) => {
        const Icon = muscleGroupIcon(muscle)
        const active = selected.has(muscle)
        return (
          <button
            key={muscle}
            type="button"
            disabled={disabled}
            aria-pressed={active}
            onClick={() => toggle(muscle)}
            className={cn(
              'flex min-h-16 flex-col items-center justify-center gap-1 rounded-[var(--radius-control)] border px-2 py-2 text-center transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1',
              'disabled:cursor-not-allowed disabled:opacity-60',
              active
                ? 'border-brand-500 bg-brand-50 text-brand-800'
                : 'border-zinc-200 bg-surface text-zinc-700 hover:bg-zinc-50',
            )}
          >
            <Icon className={cn('size-5', active ? 'text-brand-600' : 'text-zinc-400')} aria-hidden />
            <span className="text-xs font-medium leading-tight">{muscleGroupLabel(muscle)}</span>
          </button>
        )
      })}
    </div>
  )
}

export function CheckInMuscleStep({
  initial,
  saving,
  onSave,
}: {
  initial?: MuscleGroup[]
  saving?: boolean
  onSave: (muscles: MuscleGroup[]) => void | Promise<void>
}) {
  const [selected, setSelected] = useState<MuscleGroup[]>(initial ?? [])
  const hasSelection = selected.length > 0

  return (
    <div className="mt-5 space-y-3 text-left">
      <div>
        <p className="text-sm font-semibold text-zinc-900">¿Qué vas a entrenar hoy?</p>
        <p className="mt-0.5 text-xs text-zinc-500">Opcional. Podés elegir uno o varios, o saltear.</p>
      </div>
      <MusclePicker value={selected} onChange={setSelected} disabled={saving} />
      <div className="flex flex-col gap-2 sm:flex-row">
      {hasSelection || (initial?.length ?? 0) > 0 ? (
        <Button type="button" fullWidth loading={saving} onClick={() => onSave(selected)}>
          {initial?.length ? 'Guardar músculos' : 'Guardar'}
        </Button>
      ) : (
        <p className="text-center text-xs text-zinc-500">Podés saltear y elegir más tarde el mismo día.</p>
      )}
      </div>
    </div>
  )
}

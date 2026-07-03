import { useMemo, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Dumbbell, Info, QrCode } from 'lucide-react'
import { useTenant } from '@/providers/TenantProvider'
import { useMemberMonthAttendance } from '@/hooks/useAttendance'
import { useLogs } from '@/hooks/useLogs'
import { useRoutines } from '@/hooks/useRoutines'
import { AppLayout } from '@/components/layout/AppLayout'
import { Badge, Card, CardBody, Heading, IconButton, Spinner, Text } from '@/components/ui'
import {
  MONTHS_LONG,
  WEEKDAYS_SHORT,
  dayKeyFromDateValue,
  daysInMonth,
  firstWeekdayOffset,
  localDayKey,
} from '@/utils/dates'
import { cn } from '@/utils/cn'

export function MyAttendancePage() {
  const { activeGymId, activeMembership } = useTenant()
  const gymId = activeGymId ?? ''
  const memberId = activeMembership?.memberId ?? ''

  const now = new Date()
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() })
  const [selected, setSelected] = useState<string | null>(null)

  const { data: attendance = [], isLoading } = useMemberMonthAttendance(gymId, memberId, cursor.year, cursor.month)
  const { data: logs = [] } = useLogs(gymId, memberId)
  const { data: routines = [] } = useRoutines(gymId)

  const todayKey = localDayKey(now)
  const isCurrentMonth = cursor.year === now.getFullYear() && cursor.month === now.getMonth()

  const attendedSet = useMemo(() => new Set(attendance.map((a) => a.dayKey)), [attendance])

  // Rutinas registradas por día (a partir de los logs del socio): dayKey → set de routineId.
  const routineNameById = useMemo(
    () => new Map(routines.map((r) => [r.id, r.name])),
    [routines],
  )
  const monthPrefix = `${cursor.year}-${String(cursor.month + 1).padStart(2, '0')}`
  const routinesByDay = useMemo(() => {
    const map = new Map<string, Set<string>>()
    for (const log of logs) {
      const key = log.dayKey ?? dayKeyFromDateValue(log.trainingDate) ?? dayKeyFromDateValue(log.date)
      if (!key || !key.startsWith(monthPrefix)) continue
      if (!map.has(key)) map.set(key, new Set())
      if (log.routineId) map.get(key)!.add(log.routineId)
    }
    return map
  }, [logs, monthPrefix])

  const dayCount = daysInMonth(cursor.year, cursor.month)
  const offset = firstWeekdayOffset(cursor.year, cursor.month)
  const days = Array.from({ length: dayCount }, (_, i) => {
    const dayNum = i + 1
    const dayKey = localDayKey(new Date(cursor.year, cursor.month, dayNum))
    const attended = attendedSet.has(dayKey) || routinesByDay.has(dayKey)
    return {
      dayNum,
      dayKey,
      attended,
      hasRoutine: (routinesByDay.get(dayKey)?.size ?? 0) > 0,
      isToday: dayKey === todayKey,
      isFuture: dayKey > todayKey,
    }
  })

  const attendedInMonth = days.filter((d) => d.attended).length

  const goPrev = () => {
    setSelected(null)
    setCursor((c) => (c.month === 0 ? { year: c.year - 1, month: 11 } : { ...c, month: c.month - 1 }))
  }
  const goNext = () => {
    if (isCurrentMonth) return
    setSelected(null)
    setCursor((c) => (c.month === 11 ? { year: c.year + 1, month: 0 } : { ...c, month: c.month + 1 }))
  }

  const selectedRoutines = selected
    ? [...(routinesByDay.get(selected) ?? [])].map((id) => routineNameById.get(id) ?? 'Rutina')
    : []
  const selectedAttended = selected ? attendedSet.has(selected) || routinesByDay.has(selected) : false

  return (
    <AppLayout title="Mi asistencia" subtitle="Los días que fuiste al gimnasio y qué entrenaste.">
      <div className="mx-auto max-w-2xl space-y-4">
        <Card>
          <CardBody className="space-y-4">
            {/* Header del mes */}
            <div className="flex items-center justify-between">
              <IconButton icon={<ChevronLeft className="size-5" />} label="Mes anterior" onClick={goPrev} />
              <div className="text-center">
                <Heading variant="card">
                  {MONTHS_LONG[cursor.month]} {cursor.year}
                </Heading>
                <Text variant="caption">
                  Fuiste {attendedInMonth} {attendedInMonth === 1 ? 'día' : 'días'} este mes
                </Text>
              </div>
              <IconButton
                icon={<ChevronRight className="size-5" />}
                label="Mes siguiente"
                onClick={goNext}
                disabled={isCurrentMonth}
              />
            </div>

            {isLoading ? (
              <div className="flex justify-center py-10">
                <Spinner />
              </div>
            ) : (
              <>
                {/* Encabezado de días */}
                <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-zinc-400">
                  {WEEKDAYS_SHORT.map((d) => (
                    <div key={d} className="py-1">
                      {d}
                    </div>
                  ))}
                </div>

                {/* Grilla de días */}
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: offset }, (_, i) => (
                    <div key={`empty-${i}`} />
                  ))}
                  {days.map((d) => {
                    const clickable = !d.isFuture
                    return (
                      <button
                        key={d.dayKey}
                        type="button"
                        disabled={!clickable}
                        onClick={() => setSelected(d.dayKey)}
                        aria-pressed={selected === d.dayKey}
                        aria-label={`${d.dayNum}${d.attended ? ' · asististe' : ''}`}
                        className={cn(
                          'relative flex aspect-square flex-col items-center justify-center rounded-lg text-sm transition-colors',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                          d.attended
                            ? 'bg-brand-600 font-semibold text-white hover:bg-brand-700'
                            : d.isFuture
                              ? 'text-zinc-300'
                              : 'border border-zinc-200 text-zinc-600 hover:bg-zinc-50',
                          selected === d.dayKey && 'ring-2 ring-brand-500 ring-offset-1',
                          d.isToday && selected !== d.dayKey && 'ring-1 ring-brand-400',
                        )}
                      >
                        {d.dayNum}
                        {d.hasRoutine && (
                          <span
                            className={cn(
                              'absolute bottom-1 size-1.5 rounded-full',
                              d.attended ? 'bg-white/80' : 'bg-brand-500',
                            )}
                          />
                        )}
                      </button>
                    )
                  })}
                </div>

                {/* Leyenda */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
                  <span className="flex items-center gap-1.5">
                    <span className="size-3 rounded bg-brand-600" /> Asististe
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-brand-500" /> Rutina registrada
                  </span>
                </div>
              </>
            )}
          </CardBody>
        </Card>

        {/* Detalle del día seleccionado */}
        {selected && (
          <Card>
            <CardBody className="space-y-2">
              <div className="flex items-center gap-2">
                <CalendarDays className="size-4 text-brand-600" />
                <Text variant="label">{formatSelected(selected)}</Text>
              </div>
              {!selectedAttended ? (
                <Text variant="caption">No registramos tu asistencia este día.</Text>
              ) : selectedRoutines.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {selectedRoutines.map((name) => (
                    <Badge key={name} tone="brand">
                      <Dumbbell className="mr-1 inline size-3.5 align-[-2px]" />
                      {name}
                    </Badge>
                  ))}
                </div>
              ) : (
                <Text variant="caption">Asististe, pero no registraste ninguna rutina.</Text>
              )}
            </CardBody>
          </Card>
        )}

        {/* Nota amigable */}
        <div className="flex gap-3 rounded-[var(--radius-card)] border border-brand-100 bg-brand-50/60 p-4 text-sm text-brand-900">
          <Info className="mt-0.5 size-5 shrink-0 text-brand-600" />
          <div className="space-y-1">
            <p className="font-medium">¿Cómo se llena este calendario?</p>
            <p className="flex items-start gap-1.5 text-brand-800">
              <QrCode className="mt-0.5 size-4 shrink-0" />
              Los días se marcan cuando <strong>escaneás el QR</strong> del gimnasio al entrar.
            </p>
            <p className="flex items-start gap-1.5 text-brand-800">
              <Dumbbell className="mt-0.5 size-4 shrink-0" />
              La rutina de cada día aparece si <strong>registrás tus ejercicios</strong> ese día en "Mis rutinas".
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

/** "Viernes 3 de julio" a partir de un dayKey YYYY-MM-DD. */
function formatSelected(dayKey: string): string {
  const d = new Date(`${dayKey}T12:00:00`)
  const weekday = d.toLocaleDateString('es-AR', { weekday: 'long' })
  const day = d.getDate()
  const month = MONTHS_LONG[d.getMonth()].toLowerCase()
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${day} de ${month}`
}

import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Info, QrCode, RefreshCw, Share2, Trophy } from 'lucide-react'
import type { MonthlyAttendance, MuscleGroup } from '@/types'
import { useTenant } from '@/providers/TenantProvider'
import { useToast } from '@/providers/ToastProvider'
import { useMonthlyLeaderboard, useRecomputeLeaderboard } from '@/hooks/useRanking'
import { useToastAction } from '@/hooks/useToastAction'
import { AppLayout } from '@/components/layout/AppLayout'
import { Avatar, Badge, Button, Card, EmptyState, IconButton, Spinner } from '@/components/ui'
import { MONTHS_LONG, isoMonthKey } from '@/utils/dates'
import { PLATFORM_DEFAULT_THEME } from '@/utils/theme'
import { shareOrDownloadPng } from '@/utils/share'
import { cn } from '@/utils/cn'
import {
  daysLabel,
  groupByRank,
  podiumIsReadable,
  rankByDays,
  type Ranked,
} from '@/utils/ranking'
import { aggregateGymMuscleCounts, topMuscle } from '@/utils/muscles'
import { muscleGroupLabel } from '@/utils/exercises'
import { drawRankingStoryImage } from './rankingImage'

type RankedRow = Ranked<MonthlyAttendance>

const AVATAR_STACK = 5

export function RankingPage() {
  const { activeGymId, activeMembership, role } = useTenant()
  const gymId = activeGymId ?? ''
  const myMemberId = activeMembership?.memberId ?? ''
  const { notify } = useToast()
  const run = useToastAction()

  const now = new Date()
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() })
  const monthKey = isoMonthKey(cursor.year, cursor.month)
  const isCurrentMonth = cursor.year === now.getFullYear() && cursor.month === now.getMonth()

  const { data: rows = [], isLoading } = useMonthlyLeaderboard(gymId, monthKey)
  const recompute = useRecomputeLeaderboard(gymId)
  const [sharing, setSharing] = useState(false)

  const ranked = useMemo(() => rankByDays(rows), [rows])
  const top = ranked.slice(0, 10)
  const listGroups = useMemo(() => groupByRank(top), [top])
  const mine = ranked.find((r) => r.memberId === myMemberId) ?? null
  const mineOutsideTop = mine ? !top.some((r) => r.memberId === mine.memberId) : false

  const first = useMemo(() => ranked.filter((r) => r.rank === 1), [ranked])
  const second = useMemo(() => ranked.filter((r) => r.rank === 2), [ranked])
  const third = useMemo(() => ranked.filter((r) => r.rank === 3), [ranked])
  const showPodium = podiumIsReadable(first, second, third)
  const gymMuscles = useMemo(() => aggregateGymMuscleCounts(rows), [rows])
  const gymMuscleMax = gymMuscles[0]?.count ?? 0

  const goPrev = () =>
    setCursor((c) => (c.month === 0 ? { year: c.year - 1, month: 11 } : { ...c, month: c.month - 1 }))
  const goNext = () => {
    if (isCurrentMonth) return
    setCursor((c) => (c.month === 11 ? { year: c.year + 1, month: 0 } : { ...c, month: c.month + 1 }))
  }

  const handleRecompute = () =>
    run(() => recompute.mutateAsync(monthKey), {
      success: 'Ranking actualizado.',
      error: 'No pudimos actualizar el ranking.',
    })

  const handleShare = async () => {
    if (!activeMembership || ranked.length === 0) return
    setSharing(true)
    try {
      const blob = await drawRankingStoryImage({
        gymName: activeMembership.gymName,
        logoURL: activeMembership.gymLogoURL,
        theme: activeMembership.gymTheme ?? PLATFORM_DEFAULT_THEME,
        monthLabel: `${MONTHS_LONG[cursor.month]} ${cursor.year}`,
        rows: ranked.slice(0, 10),
        mine,
      })
      const outcome = await shareOrDownloadPng(blob, `ranking-${monthKey}.png`, {
        title: `Ranking ${activeMembership.gymName}`,
        text: mine
          ? `¡Puesto #${mine.rank} del mes en ${activeMembership.gymName}!`
          : `Ranking del mes en ${activeMembership.gymName}`,
      })
      if (outcome === 'downloaded') notify('Imagen descargada. ¡Subila a tus historias!', 'success')
    } catch {
      notify('No pudimos generar la imagen.', 'error')
    } finally {
      setSharing(false)
    }
  }

  const canShare = ranked.length > 0 && (role === 'admin' || !!mine)
  const monthLabel = `${MONTHS_LONG[cursor.month]} ${cursor.year}`

  return (
    <AppLayout
      title="Ranking"
      subtitle="Quiénes más días entrenaron este mes."
      actions={
        <>
          {role === 'admin' && (
            <Button
              variant="secondary"
              leftIcon={<RefreshCw className="size-4" />}
              loading={recompute.isPending}
              onClick={handleRecompute}
              className="px-3 sm:px-4"
            >
              <span className="sr-only sm:not-sr-only">Actualizar</span>
            </Button>
          )}
          {canShare && (
            <Button leftIcon={<Share2 className="size-4" />} loading={sharing} onClick={handleShare}>
              {mine ? 'Compartir mi puesto' : 'Compartir'}
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-4 lg:space-y-6">
        <div className="flex items-center justify-between gap-2 rounded-[var(--radius-card)] border border-zinc-200 bg-surface px-2 py-1 sm:px-3">
          <IconButton
            icon={<ChevronLeft className="size-5" />}
            label="Mes anterior"
            onClick={goPrev}
            className="size-11"
          />
          <p className="min-w-0 truncate text-center text-base font-semibold text-zinc-900">{monthLabel}</p>
          <IconButton
            icon={<ChevronRight className="size-5" />}
            label="Mes siguiente"
            onClick={goNext}
            disabled={isCurrentMonth}
            className="size-11"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : ranked.length === 0 ? (
          <EmptyState
            icon={Trophy}
            title="Todavía no hay asistencias este mes"
            description={
              role === 'admin'
                ? 'Tocá Actualizar para armar el ranking con las asistencias del mes.'
                : 'Escaneá el QR del gimnasio al entrar para sumar tu primer día.'
            }
            action={
              role === 'admin' ? (
                <Button
                  leftIcon={<RefreshCw className="size-4" />}
                  loading={recompute.isPending}
                  onClick={handleRecompute}
                >
                  Actualizar ranking
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="grid items-start gap-4 lg:grid-cols-12 lg:gap-6">
            <aside className="space-y-4 lg:col-span-4">
              {mine ? <MyStanding row={mine} /> : null}

              {showPodium ? (
                <Card className="px-3 pb-0 pt-5 sm:px-4">
                  <div className="flex items-end justify-center gap-3">
                    {second.length > 0 ? (
                      <PodiumColumn rows={second} place={2} myMemberId={myMemberId} />
                    ) : null}
                    <PodiumColumn rows={first} place={1} myMemberId={myMemberId} />
                    {third.length > 0 ? (
                      <PodiumColumn rows={third} place={3} myMemberId={myMemberId} />
                    ) : null}
                  </div>
                </Card>
              ) : (
                <LeadersCard rows={first} myMemberId={myMemberId} />
              )}

              {gymMuscles.length > 0 ? (
                <GymMusclesCard stats={gymMuscles} max={gymMuscleMax} />
              ) : null}

              <HowItWorks className="hidden lg:block" />
            </aside>

            <div className="lg:col-span-8">
              <Card className="overflow-hidden">
                <div className="flex items-baseline justify-between gap-3 border-b border-zinc-100 px-4 py-3">
                  <h2 className="text-sm font-semibold text-zinc-900">Tabla del mes</h2>
                  <p className="text-xs text-zinc-500">
                    {top.length} {top.length === 1 ? 'socio' : 'socios'}
                  </p>
                </div>
                <ul>
                  {listGroups.flatMap((group) => {
                    const header =
                      group.items.length > 1 ? (
                        <li
                          key={`group-${group.rank}`}
                          className="bg-zinc-50 px-4 py-1.5 text-xs font-medium text-zinc-500"
                        >
                          Puesto {group.rank} · {daysLabel(group.days)} · {group.items.length} socios
                        </li>
                      ) : null
                    const items = group.items.map((row) => (
                      <li key={row.memberId} className="border-t border-zinc-100">
                        <RankRow row={row} isMine={row.memberId === myMemberId} />
                      </li>
                    ))
                    return header ? [header, ...items] : items
                  })}
                </ul>
                {mine && mineOutsideTop ? (
                  <>
                    <p className="border-t border-zinc-100 py-2 text-center text-xs tracking-widest text-zinc-400">
                      ···
                    </p>
                    <RankRow row={mine} isMine />
                  </>
                ) : null}
              </Card>
            </div>
          </div>
        )}

        {ranked.length > 0 ? <HowItWorks className="lg:hidden" /> : null}
      </div>
    </AppLayout>
  )
}

function GymMusclesCard({
  stats,
  max,
}: {
  stats: { muscle: MuscleGroup; count: number }[]
  max: number
}) {
  return (
    <Card className="px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Este mes en el gym</p>
      <p className="mt-0.5 text-sm font-semibold text-zinc-900">Qué se entrenó más</p>
      <ul className="mt-3 space-y-2" aria-label="Totales anónimos de músculos del gym">
        {stats.slice(0, 6).map((row) => (
          <li key={row.muscle} className="space-y-1">
            <div className="flex items-baseline justify-between gap-2 text-xs">
              <span className="font-medium text-zinc-800">{muscleGroupLabel(row.muscle)}</span>
              <span className="tabular-nums text-zinc-500">{row.count}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">
              <div
                className="h-full rounded-full bg-brand-500"
                style={{ width: `${max > 0 ? Math.round((row.count / max) * 100) : 0}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}

function MyStanding({ row }: { row: RankedRow }) {
  const favorite = topMuscle(row.muscleCounts)
  return (
    <Card className="border-brand-200 bg-brand-50/80 px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-brand-700">Tu puesto</p>
      <div className="mt-1 flex items-end justify-between gap-3">
        <p className="text-3xl font-bold tabular-nums text-zinc-900">#{row.rank}</p>
        <p className="pb-0.5 text-sm font-medium text-zinc-600">{daysLabel(row.days)}</p>
      </div>
      {favorite ? (
        <div className="mt-2">
          <Badge tone="brand">Más frecuente: {muscleGroupLabel(favorite)}</Badge>
        </div>
      ) : null}
    </Card>
  )
}

function LeadersCard({ rows, myMemberId }: { rows: RankedRow[]; myMemberId: string }) {
  if (rows.length === 0) return null
  const days = rows[0]?.days ?? 0
  const shown = rows.slice(0, AVATAR_STACK)
  const extra = rows.length - shown.length

  return (
    <Card className="overflow-hidden">
      <div className="bg-amber-50 px-4 py-4">
        <p className="text-xs font-medium uppercase tracking-wide text-amber-800">Puesto 1</p>
        <p className="mt-1 text-4xl font-bold tabular-nums tracking-tight text-zinc-900">{days}</p>
        <p className="text-sm text-zinc-600">
          {days === 1 ? 'día' : 'días'}
          {rows.length > 1 ? ` · ${rows.length} socios empatados` : ''}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {shown.map((row) => (
            <div key={row.memberId} className="flex items-center gap-1.5">
              <span
                className={cn(
                  'rounded-full ring-2 ring-amber-300',
                  row.memberId === myMemberId && 'ring-brand-500',
                )}
              >
                <Avatar name={row.displayName} size="sm" />
              </span>
              <span className="max-w-[7rem] truncate text-xs font-medium text-zinc-800">{row.displayName}</span>
            </div>
          ))}
          {extra > 0 ? <span className="self-center text-xs text-zinc-500">+{extra}</span> : null}
        </div>
      </div>
    </Card>
  )
}

function HowItWorks({ className }: { className?: string }) {
  return (
    <details
      className={cn('rounded-[var(--radius-card)] border border-zinc-200 bg-surface', className)}
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium text-zinc-800 marker:content-none [&::-webkit-details-marker]:hidden">
        <Info className="size-4 shrink-0 text-zinc-400" aria-hidden />
        ¿Cómo se arma el ranking?
      </summary>
      <div className="space-y-2 border-t border-zinc-100 px-4 py-3 text-sm text-zinc-600">
        <p className="flex items-start gap-2">
          <QrCode className="mt-0.5 size-4 shrink-0 text-zinc-400" aria-hidden />
          <span>
            Un punto por cada día que escaneás el QR al entrar. El mismo día no suma de nuevo.
          </span>
        </p>
        <p className="flex items-start gap-2">
          <Trophy className="mt-0.5 size-4 shrink-0 text-zinc-400" aria-hidden />
          <span>
            Los empatados comparten puesto. Cada mes arranca de cero. Los músculos son opcionales y
            el total del gym es anónimo.
          </span>
        </p>
      </div>
    </details>
  )
}

const PLACE_STYLES: Record<1 | 2 | 3, { ring: string; pedestal: string; height: string }> = {
  1: { ring: 'ring-amber-400', pedestal: 'bg-amber-400 text-amber-950', height: 'h-20' },
  2: { ring: 'ring-zinc-300', pedestal: 'bg-zinc-300 text-zinc-700', height: 'h-14' },
  3: { ring: 'ring-orange-400', pedestal: 'bg-orange-300 text-orange-950', height: 'h-10' },
}

function PodiumColumn({
  rows,
  place,
  myMemberId,
}: {
  rows: RankedRow[]
  place: 1 | 2 | 3
  myMemberId: string
}) {
  const style = PLACE_STYLES[place]
  const days = rows[0]?.days

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
      <div className="flex -space-x-2">
        {rows.map((r) => (
          <div
            key={r.memberId}
            className={cn(
              'rounded-full ring-2',
              style.ring,
              r.memberId === myMemberId && 'ring-brand-500',
            )}
          >
            <Avatar name={r.displayName} size="sm" />
          </div>
        ))}
      </div>
      <p className="max-w-full truncate text-center text-xs font-semibold text-zinc-900">
        {rows.length === 1 ? rows[0]?.displayName : `${rows.length} socios`}
      </p>
      <p className="text-xs text-zinc-500">{daysLabel(days ?? 0)}</p>
      <div
        className={cn(
          'flex w-full items-start justify-center rounded-t-lg pt-1 text-lg font-bold',
          style.pedestal,
          style.height,
        )}
      >
        {place}
      </div>
    </div>
  )
}

function rankTone(rank: number): string {
  if (rank === 1) return 'text-amber-600'
  if (rank === 2) return 'text-zinc-500'
  if (rank === 3) return 'text-orange-600'
  return 'text-zinc-400'
}

function RankRow({ row, isMine }: { row: RankedRow; isMine?: boolean }) {
  const favorite = topMuscle(row.muscleCounts)
  return (
    <div className={cn('flex min-h-12 items-center gap-3 px-4 py-2', isMine && 'bg-brand-50')}>
      <span className={cn('w-8 shrink-0 text-sm font-bold tabular-nums', rankTone(row.rank))}>
        #{row.rank}
      </span>
      <Avatar name={row.displayName} size="sm" />
      <div className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-zinc-900">{row.displayName}</span>
        {favorite ? (
          <span className="mt-0.5 inline-flex rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600">
            {muscleGroupLabel(favorite)}
          </span>
        ) : null}
      </div>
      {isMine ? <Badge tone="brand">Vos</Badge> : null}
      <span className="shrink-0 text-sm font-semibold tabular-nums text-zinc-900">{daysLabel(row.days)}</span>
    </div>
  )
}

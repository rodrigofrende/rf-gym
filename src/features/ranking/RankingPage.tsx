import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, FlaskConical, Info, QrCode, RefreshCw, Share2, Trophy } from 'lucide-react'
import type { MonthlyAttendance } from '@/types'
import { useTenant } from '@/providers/TenantProvider'
import { useToast } from '@/providers/ToastProvider'
import { seedTestLeaderboard } from '@/services/rankingService'
import { useMonthlyLeaderboard, useRecomputeLeaderboard } from '@/hooks/useRanking'
import { useToastAction } from '@/hooks/useToastAction'
import { AppLayout } from '@/components/layout/AppLayout'
import { Avatar, Badge, Button, Card, CardBody, EmptyState, Heading, IconButton, Spinner, Text } from '@/components/ui'
import { MONTHS_LONG, isoMonthKey } from '@/utils/dates'
import { PLATFORM_DEFAULT_THEME } from '@/utils/theme'
import { shareOrDownloadPng } from '@/utils/share'
import { cn } from '@/utils/cn'
import { drawRankingStoryImage } from './rankingImage'

interface RankedRow extends MonthlyAttendance {
  rank: number
}

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

  // TEMP — SOLO PRUEBAS (eliminar junto con seedTestLeaderboard): siembra
  // contadores fake del mes actual y el anterior para ver el ranking lleno.
  const qc = useQueryClient()
  const [seeding, setSeeding] = useState(false)
  const handleSeedTest = async () => {
    setSeeding(true)
    await run(() => seedTestLeaderboard(gymId), {
      success: 'Datos de prueba sembrados (mes actual y anterior).',
      error: 'No pudimos sembrar los datos de prueba.',
    })
    await qc.invalidateQueries({ queryKey: ['monthlyLeaderboard', gymId] })
    setSeeding(false)
  }

  // Competition ranking (1, 2, 2, 4): empatados comparten puesto.
  const ranked = useMemo<RankedRow[]>(() => {
    const sorted = [...rows].sort(
      (a, b) => b.days - a.days || a.displayName.localeCompare(b.displayName, 'es'),
    )
    const out: RankedRow[] = []
    sorted.forEach((r, i) => {
      const rank = i > 0 && sorted[i - 1].days === r.days ? out[i - 1].rank : i + 1
      out.push({ ...r, rank })
    })
    return out
  }, [rows])

  const top = ranked.slice(0, 10)
  const mine = ranked.find((r) => r.memberId === myMemberId) ?? null
  const mineOutsideTop = mine ? !top.some((r) => r.memberId === mine.memberId) : false

  // Podio por PUESTO, no por fila: los empatados comparten pedestal (criterio
  // deportivo — sin desempates arbitrarios). Un empate puede dejar vacante el
  // puesto siguiente (1, 1, 3 → sin pedestal 2).
  const podiumGroups = useMemo(
    () =>
      [1, 2, 3].map((place) => ranked.filter((r) => r.rank === place)) as [
        RankedRow[],
        RankedRow[],
        RankedRow[],
      ],
    [ranked],
  )
  const PODIUM_CAP = 2 // avatares visibles por pedestal; el resto va como "+N más"
  const podiumShown = useMemo(
    () => new Set(podiumGroups.flatMap((g) => g.slice(0, PODIUM_CAP)).map((r) => r.memberId)),
    [podiumGroups],
  )
  const listRows = top.filter((r) => !podiumShown.has(r.memberId))

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

  return (
    <AppLayout
      title="Ranking"
      subtitle="Los socios que más días entrenaron este mes."
      actions={
        <>
          {/* TEMP — SOLO PRUEBAS: eliminar este botón junto con seedTestLeaderboard. */}
          {role === 'admin' && (
            <Button
              variant="ghost"
              leftIcon={<FlaskConical className="size-4" />}
              loading={seeding}
              onClick={handleSeedTest}
            >
              Sembrar prueba
            </Button>
          )}
          {role === 'admin' && (
            <Button
              variant="secondary"
              leftIcon={<RefreshCw className="size-4" />}
              loading={recompute.isPending}
              onClick={handleRecompute}
            >
              Actualizar
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
      <div className="mx-auto max-w-3xl space-y-4">
        <Card>
          <CardBody className="space-y-5">
            {/* Header del mes */}
            <div className="flex items-center justify-between">
              <IconButton icon={<ChevronLeft className="size-5" />} label="Mes anterior" onClick={goPrev} />
              <div className="text-center">
                <Heading variant="card">
                  {MONTHS_LONG[cursor.month]} {cursor.year}
                </Heading>
                {mine && (
                  <Text variant="caption">
                    Vas {mine.days} {mine.days === 1 ? 'día' : 'días'} · puesto #{mine.rank}
                  </Text>
                )}
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
            ) : ranked.length === 0 ? (
              <EmptyState
                icon={Trophy}
                title="Todavía no hay asistencias este mes"
                description={
                  role === 'admin'
                    ? 'Tocá "Actualizar" para recalcular el ranking desde las asistencias registradas.'
                    : 'Escaneá el QR del gimnasio al entrar para sumar tu primer día.'
                }
              />
            ) : (
              <>
                {/* Podio por puesto (orden visual 2° - 1° - 3°); empates comparten pedestal */}
                <div className="flex items-end justify-center gap-2 sm:gap-4">
                  <PodiumColumn rows={podiumGroups[1]} place={2} myMemberId={myMemberId} />
                  <PodiumColumn rows={podiumGroups[0]} place={1} myMemberId={myMemberId} />
                  <PodiumColumn rows={podiumGroups[2]} place={3} myMemberId={myMemberId} />
                </div>

                {/* Resto del top 10 (lo que no entró en el podio) */}
                {listRows.length > 0 && (
                  <div className="space-y-2">
                    {listRows.map((r) => (
                      <RankRow key={r.memberId} row={r} isMine={r.memberId === myMemberId} />
                    ))}
                  </div>
                )}

                {/* Tu puesto fuera del top 10 */}
                {mine && mineOutsideTop && (
                  <>
                    <div className="text-center text-lg leading-none tracking-widest text-zinc-300">···</div>
                    <RankRow row={mine} isMine />
                  </>
                )}
              </>
            )}
          </CardBody>
        </Card>

        {/* Nota amigable. OJO: el texto va en un <span> — si queda suelto dentro
            del flex, los nodos de texto se vuelven flex items y se desalinean. */}
        <div className="flex gap-3 rounded-[var(--radius-card)] border border-brand-100 bg-brand-50/60 p-4 text-sm text-brand-900">
          <Info className="mt-0.5 size-5 shrink-0 text-brand-600" />
          <div className="space-y-1.5">
            <p className="font-medium">¿Cómo se arma el ranking?</p>
            <p className="flex items-start gap-2 text-brand-800">
              <QrCode className="mt-0.5 size-4 shrink-0" />
              <span>
                Sumás un punto por cada día que <strong>escaneás el QR</strong> al entrar. Los
                escaneos extra del mismo día no suman.
              </span>
            </p>
            <p className="flex items-start gap-2 text-brand-800">
              <Trophy className="mt-0.5 size-4 shrink-0" />
              <span>
                Los empatados comparten puesto. El ranking arranca de cero cada mes.
              </span>
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

const PLACE_STYLES: Record<1 | 2 | 3, { ring: string; pedestal: string; height: string }> = {
  1: { ring: 'ring-amber-400', pedestal: 'bg-amber-400 text-amber-950', height: 'h-28' },
  2: { ring: 'ring-zinc-300', pedestal: 'bg-zinc-300 text-zinc-700', height: 'h-20' },
  3: { ring: 'ring-orange-400', pedestal: 'bg-orange-300 text-orange-950', height: 'h-14' },
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
  const shown = rows.slice(0, 2)
  const extra = rows.length - shown.length
  const days = rows[0]?.days
  const vacant = rows.length === 0

  return (
    <div className={cn('flex w-24 flex-col items-center gap-2 sm:w-32', vacant && 'opacity-40')}>
      {!vacant && (
        <>
          <div className="flex -space-x-3">
            {shown.map((r) => (
              <div
                key={r.memberId}
                className={cn(
                  'rounded-full ring-4',
                  style.ring,
                  r.memberId === myMemberId && 'ring-brand-500',
                )}
              >
                <Avatar name={r.displayName} size={shown.length > 1 ? 'md' : 'lg'} />
              </div>
            ))}
          </div>
          <div className="flex flex-col items-center gap-0.5 text-center">
            {shown.map((r) => (
              <p
                key={r.memberId}
                className="max-w-24 truncate text-sm font-semibold text-zinc-900 sm:max-w-32"
              >
                {r.displayName}
              </p>
            ))}
            {extra > 0 && <Text variant="caption">+{extra} más</Text>}
            <Text variant="caption">
              {days} {days === 1 ? 'día' : 'días'}
            </Text>
            {rows.some((r) => r.memberId === myMemberId) && <Badge tone="brand">Vos</Badge>}
          </div>
        </>
      )}
      {/* Pedestal vacante (ej: 1, 1, 3 → sin puesto 2): queda atenuado. */}
      <div
        className={cn(
          'flex w-full items-start justify-center rounded-t-xl pt-2 text-2xl font-bold',
          style.pedestal,
          style.height,
        )}
      >
        {place}
      </div>
    </div>
  )
}

function RankRow({ row, isMine }: { row: RankedRow; isMine?: boolean }) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-[var(--radius-control)] border border-zinc-100 px-4 py-2.5',
        isMine && 'border-transparent bg-brand-50 ring-2 ring-brand-500',
      )}
    >
      <span className="w-9 shrink-0 text-base font-bold text-zinc-400">#{row.rank}</span>
      <Avatar name={row.displayName} size="sm" />
      <span className="min-w-0 flex-1 truncate text-base font-medium text-zinc-900">
        {row.displayName}
      </span>
      {isMine && <Badge tone="brand">Vos</Badge>}
      <Badge tone="neutral">
        {row.days} {row.days === 1 ? 'día' : 'días'}
      </Badge>
    </div>
  )
}

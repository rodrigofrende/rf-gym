import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, CalendarCheck, ChevronRight, RefreshCw, Repeat2, Search } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Attendance, AttendancePaymentState, MemberStatus } from '@/types'
import { useTenant } from '@/providers/TenantProvider'
import { useTodayAttendance } from '@/hooks/useAttendance'
import { AppLayout } from '@/components/layout/AppLayout'
import { Avatar, Badge, Button, Card, EmptyState, FullPageSpinner, Input, Text } from '@/components/ui'
import { adminMemberDetail } from '@/routes/routePaths'
import { formatDate, toDate } from '@/utils/format'
import { todayDateInput } from '@/utils/dates'
import { STATUS_LABEL } from '@/utils/roles'

const PAYMENT_LABEL: Record<AttendancePaymentState, string> = {
  al_dia: 'Al día',
  overdue: 'Pago pendiente',
  blocked: 'Hablar con admin',
}

const PAYMENT_TONE: Record<AttendancePaymentState, 'green' | 'amber' | 'red'> = {
  al_dia: 'green',
  overdue: 'amber',
  blocked: 'red',
}

const MEMBER_TONE: Record<MemberStatus, 'green' | 'amber' | 'red'> = {
  active: 'green',
  paused: 'amber',
  overdue: 'red',
}

function formatTime(value: Attendance['checkedInAt']) {
  const date = toDate(value)
  if (!date) return '—'
  return new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit' }).format(date)
}

export function TodayAttendancePage() {
  const { activeGymId } = useTenant()
  const gymId = activeGymId as string
  const navigate = useNavigate()
  const dayKey = todayDateInput()
  const {
    data: attendance = [],
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useTodayAttendance(gymId, dayKey)
  const [search, setSearch] = useState('')

  const stats = useMemo(
    () => ({
      total: attendance.length,
      attention: attendance.filter((a) => a.paymentState !== 'al_dia' || a.memberStatus !== 'active').length,
      repeated: attendance.filter((a) => a.scanCount > 1).length,
    }),
    [attendance],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return attendance
    return attendance.filter(
      (a) => a.memberName.toLowerCase().includes(q) || a.email.toLowerCase().includes(q),
    )
  }, [attendance, search])

  return (
    <AppLayout
      title="Hoy en el gym"
      subtitle={`${formatDate(new Date())} · actualización en vivo cuando esta pantalla está abierta`}
      actions={
        <Button
          size="sm"
          variant="secondary"
          leftIcon={<RefreshCw className="size-4" />}
          loading={isFetching}
          onClick={() => refetch()}
        >
          Actualizar
        </Button>
      }
    >
      <div className="mb-5 grid gap-3 md:grid-cols-[minmax(0,20rem)_1fr] md:items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
          <Input
            className="pl-9"
            placeholder="Buscar socio"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <MiniStat icon={CalendarCheck} label="Asistencias" value={stats.total} tone="brand" />
          <MiniStat icon={AlertTriangle} label="A revisar" value={stats.attention} tone="amber" />
          <MiniStat icon={Repeat2} label="Reescaneos" value={stats.repeated} tone="neutral" />
        </div>
      </div>

      {isLoading ? (
        <FullPageSpinner />
      ) : isError ? (
        <EmptyState
          icon={RefreshCw}
          title="No se pudo cargar la asistencia"
          description="Revisá la conexión o los permisos de Firestore."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={CalendarCheck}
          title={search.trim() ? 'Sin resultados' : 'Todavía no ingresó nadie'}
          description={
            search.trim()
              ? 'No hay asistencias que coincidan con la búsqueda.'
              : 'Cuando un socio escanee el QR, va a aparecer acá automáticamente.'
          }
        />
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {filtered.map((a) => (
            <Card key={a.id} className="overflow-hidden border-l-4 border-l-brand-400">
              <button
                type="button"
                onClick={() => navigate(adminMemberDetail(a.memberId))}
                className="grid w-full gap-3 p-4 text-left transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div className="shrink-0">
                    <Avatar name={a.memberName} size="md" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Text variant="listItem" className="block break-words leading-snug">
                          {a.memberName}
                        </Text>
                        <p className="mt-0.5 truncate text-xs text-zinc-500">{a.email}</p>
                      </div>
                      <ChevronRight className="mt-1 size-5 shrink-0 text-zinc-300" />
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pl-[3.25rem]">
                  <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-xs font-medium text-zinc-500">
                    {formatTime(a.checkedInAt)}
                  </span>
                  <Badge tone={PAYMENT_TONE[a.paymentState]}>{PAYMENT_LABEL[a.paymentState]}</Badge>
                  <Badge tone={MEMBER_TONE[a.memberStatus]}>{STATUS_LABEL[a.memberStatus]}</Badge>
                  {a.scanCount > 1 ? (
                    <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600">
                      {a.scanCount} escaneos
                    </span>
                  ) : null}
                </div>
              </button>
            </Card>
          ))}
        </div>
      )}
    </AppLayout>
  )
}

function MiniStat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon
  label: string
  value: number
  tone: 'brand' | 'amber' | 'neutral'
}) {
  const toneClass = {
    brand: 'bg-brand-50 text-brand-600',
    amber: 'bg-amber-50 text-amber-600',
    neutral: 'bg-zinc-100 text-zinc-600',
  }[tone]

  return (
    <Card className="flex items-center gap-3 px-4 py-3">
      <div className={`flex size-9 items-center justify-center rounded-xl ${toneClass}`}>
        <Icon className="size-5" />
      </div>
      <div>
        <p className="text-xl font-bold text-zinc-900">{value}</p>
        <Text variant="caption">{label}</Text>
      </div>
    </Card>
  )
}

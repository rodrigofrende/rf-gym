import { useEffect, useRef, type ReactNode } from 'react'
import { Navigate, useLocation, useParams } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, Clock, Dumbbell, LogIn } from 'lucide-react'
import type { AttendancePaymentState, MemberStatus } from '@/types'
import { useAuth } from '@/providers/AuthProvider'
import { useTenant } from '@/providers/TenantProvider'
import { useCheckIn } from '@/hooks/useAttendance'
import { useGymPresentation } from '@/hooks/useGymPresentation'
import { Badge, Button, Card, FullPageSpinner, Heading, Text } from '@/components/ui'
import { ROUTES } from '@/routes/routePaths'
import { formatDate } from '@/utils/format'
import { resolvePresentation } from '@/utils/presentation'
import { SponsorSpot } from '@/features/sponsors/SponsorsShowcase'

const PAYMENT_COPY: Record<AttendancePaymentState, { title: string; description: string; tone: 'green' | 'amber' | 'red' }> = {
  al_dia: {
    title: 'Membresía al día',
    description: 'Tu asistencia quedó registrada. Ya podés cargar los pesos de tu rutina de hoy.',
    tone: 'green',
  },
  overdue: {
    title: 'Pago pendiente',
    description: 'Tu ingreso quedó registrado, pero acercate a administración para regularizar tu cuota.',
    tone: 'amber',
  },
  blocked: {
    title: 'Hablá con administración',
    description: 'Registramos tu visita. Antes de entrenar, acercate a recepción para revisar tu membresía.',
    tone: 'red',
  },
}

const MEMBER_COPY: Record<MemberStatus, string> = {
  active: 'Socio activo',
  paused: 'Membresía pausada',
  overdue: 'Membresía vencida',
}

export function CheckInPage() {
  const { gymId } = useParams()
  const location = useLocation()
  const { user, isInitialized } = useAuth()
  const { memberships, isLoading, selectGym, activeGymId } = useTenant()
  const membership = memberships.find((m) => m.gymId === gymId)
  const checkIn = useCheckIn(gymId ?? '', membership?.memberId ?? '')
  const { data: presentation } = useGymPresentation(gymId ?? '')
  const fired = useRef(false)

  useEffect(() => {
    if (!gymId || !membership || membership.role !== 'user' || fired.current) return
    if (activeGymId !== gymId) selectGym(gymId)
    fired.current = true
    checkIn.mutate()
  }, [activeGymId, checkIn, gymId, membership, selectGym])

  if (!gymId) return <Navigate to="/" replace />
  if (!isInitialized || (user && isLoading)) return <FullPageSpinner />
  if (!user) {
    const redirect = `${location.pathname}${location.search}`
    return <Navigate to={`${ROUTES.LOGIN}?redirect=${encodeURIComponent(redirect)}`} replace />
  }

  if (!membership) {
    return (
      <CheckInShell>
        <StatusCard
          icon={<AlertTriangle className="size-7" />}
          tone="red"
          title="No encontramos tu membresía"
          description="Iniciá sesión con el email que el gimnasio usó para darte de alta, o hablá con administración."
        />
      </CheckInShell>
    )
  }

  if (membership.role !== 'user') {
    return (
      <CheckInShell>
        <StatusCard
          icon={<LogIn className="size-7" />}
          tone="amber"
          title="Este QR es para socios"
          description="Entraste con una cuenta de administración. Pedile al socio que escanee el QR desde su cuenta."
        />
      </CheckInShell>
    )
  }

  if (checkIn.isError) {
    return (
      <CheckInShell>
        <StatusCard
          icon={<AlertTriangle className="size-7" />}
          tone="red"
          title="No pudimos registrar tu ingreso"
          description="Revisá tu conexión e intentá escanear el QR nuevamente."
        />
      </CheckInShell>
    )
  }

  if (checkIn.isPending || !checkIn.data) {
    return (
      <CheckInShell>
        <Card className="flex flex-col items-center p-8 text-center">
          <FullPageSpinner />
          <Heading variant="display" className="mt-4">
            Registrando asistencia
          </Heading>
          <Text className="mt-2">Estamos validando tu membresía.</Text>
        </Card>
      </CheckInShell>
    )
  }

  const copy = PAYMENT_COPY[checkIn.data.paymentState]
  const isPaused = checkIn.data.memberStatus === 'paused'
  const sponsors = resolvePresentation(presentation).sponsors

  return (
    <CheckInShell>
      <StatusCard
        icon={<CheckCircle2 className="size-7" />}
        tone={isPaused ? 'amber' : copy.tone}
        title={isPaused ? 'Membresía pausada' : copy.title}
        description={isPaused ? 'Tu visita quedó registrada. Hablá con administración antes de entrenar.' : copy.description}
      >
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Badge tone={isPaused ? 'amber' : copy.tone}>{MEMBER_COPY[checkIn.data.memberStatus]}</Badge>
          <Badge tone={copy.tone}>{copy.title}</Badge>
        </div>
        <div className="mt-5 rounded-xl bg-surface-muted p-3 text-sm text-zinc-600">
          <Clock className="mr-1 inline size-4 align-[-2px]" />
          Ingreso registrado: {formatDate(checkIn.data.checkedInAt)}
        </div>
      </StatusCard>
      <div className="mt-4">
        <SponsorSpot sponsors={sponsors} variant="light" />
      </div>
    </CheckInShell>
  )
}

function CheckInShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full items-center justify-center bg-gradient-to-br from-brand-50 to-zinc-100 p-4">
      <div className="w-full max-w-md">
        <div className="mb-5 flex flex-col items-center text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/30">
            <Dumbbell className="size-7" />
          </div>
          <p className="mt-3 text-sm font-medium text-brand-700">Ingreso al gimnasio</p>
        </div>
        {children}
      </div>
    </div>
  )
}

function StatusCard({
  icon,
  tone,
  title,
  description,
  children,
}: {
  icon: ReactNode
  tone: 'green' | 'amber' | 'red'
  title: string
  description: string
  children?: ReactNode
}) {
  const toneClass = {
    green: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    red: 'bg-red-100 text-red-700',
  }[tone]

  return (
    <Card className="p-8 text-center">
      <div className={`mx-auto flex size-14 items-center justify-center rounded-2xl ${toneClass}`}>{icon}</div>
      <Heading variant="display" className="mt-4">
        {title}
      </Heading>
      <Text className="mt-2">{description}</Text>
      {children}
      <Button className="mt-6" fullWidth onClick={() => window.location.assign(ROUTES.APP_ROUTINES)}>
        Ir a mis rutinas
      </Button>
    </Card>
  )
}

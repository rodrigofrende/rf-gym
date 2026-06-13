import type { ReactNode } from 'react'
import { AlertTriangle, Lock, LogOut } from 'lucide-react'
import type { Member } from '@/types'
import { useAuth } from '@/providers/AuthProvider'
import { useTenant } from '@/providers/TenantProvider'
import { useMember } from '@/hooks/useMembers'
import { Button, Heading, Text } from '@/components/ui'
import { formatCurrency, formatDate } from '@/utils/format'
import { amountOwed, getPaymentStatus, GRACE_DAYS, type PaymentStatus } from '@/utils/payments'

const MESSAGE = `Si tu cuota está impaga por más de ${Math.round(GRACE_DAYS / 7)} semanas perdés el acceso a la app. Regularizá tu pago con el gimnasio.`

/**
 * Controla el acceso del socio según su deuda:
 * - bloqueado (>14 días): pantalla de bloqueo a pantalla completa.
 * - vencido (1-14 días): banner de aviso sobre el contenido.
 * Admin/super-admin nunca se bloquean.
 */
export function SocioPaymentGate({ children }: { children: ReactNode }) {
  const { role, activeGymId, activeMembership } = useTenant()
  const { data: member } = useMember(activeGymId ?? '', activeMembership?.memberId ?? '')

  if (role !== 'user' || !member) return <>{children}</>

  const status = getPaymentStatus(member.paymentDate, member.lastPaymentDate)

  if (status.state === 'blocked') return <PaymentBlockedScreen member={member} status={status} />

  if (status.state === 'overdue') {
    return (
      <div className="flex h-full flex-col">
        <PaymentBanner member={member} status={status} />
        <div className="min-h-0 flex-1">{children}</div>
      </div>
    )
  }

  return <>{children}</>
}

function owedText(member: Member, status: PaymentStatus) {
  const owed = amountOwed(member.monthlyCost, status.monthsOwed)
  return `Debés ${formatCurrency(owed)} desde el ${formatDate(status.owesSince)} (${status.daysOverdue} días).`
}

function PaymentBanner({ member, status }: { member: Member; status: PaymentStatus }) {
  return (
    <div className="flex items-start gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 lg:px-8">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <p>
        <strong>Pago pendiente.</strong> {owedText(member, status)} {MESSAGE}
      </p>
    </div>
  )
}

function PaymentBlockedScreen({ member, status }: { member: Member; status: PaymentStatus }) {
  const { logout } = useAuth()
  return (
    <div className="flex min-h-full items-center justify-center bg-surface-muted p-4">
      <div className="w-full max-w-md rounded-[var(--radius-card)] border border-zinc-200 bg-surface p-8 text-center shadow-sm">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-red-100 text-red-600">
          <Lock className="size-7" />
        </div>
        <Heading variant="display" className="mt-4">
          Acceso suspendido
        </Heading>
        <Text className="mt-2">{MESSAGE}</Text>
        <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-zinc-700">{owedText(member, status)}</div>
        <Button
          variant="secondary"
          fullWidth
          className="mt-5"
          leftIcon={<LogOut className="size-4" />}
          onClick={() => logout()}
        >
          Cerrar sesión
        </Button>
      </div>
    </div>
  )
}

import { Users, DollarSign, Dumbbell, AlertTriangle, RefreshCw } from 'lucide-react'
import { useTenant } from '@/providers/TenantProvider'
import { useToast } from '@/providers/ToastProvider'
import { useAdminStats, useRecomputeStats } from '@/hooks/useAdminStats'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button, FullPageSpinner, StatCard } from '@/components/ui'
import { formatCurrency, formatDate } from '@/utils/format'

export function AdminDashboardPage() {
  const { activeGymId } = useTenant()
  const gymId = activeGymId as string
  const { notify } = useToast()
  const { data: stats, isLoading } = useAdminStats(gymId)
  const recompute = useRecomputeStats(gymId)

  const onRefresh = async () => {
    try {
      await recompute.mutateAsync()
      notify('Métricas actualizadas', 'success')
    } catch {
      notify('No se pudieron actualizar las métricas', 'error')
    }
  }

  return (
    <AppLayout title="Panel">
      <div className="mb-5 flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {stats?.updatedAt
            ? `Última actualización: ${formatDate(stats.updatedAt)}`
            : 'Sin métricas calculadas todavía'}
        </p>
        <Button
          variant="secondary"
          leftIcon={<RefreshCw className="size-4" />}
          loading={recompute.isPending}
          onClick={onRefresh}
        >
          Actualizar
        </Button>
      </div>

      {isLoading ? (
        <FullPageSpinner />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Users} label="Socios" value={stats?.memberCount ?? 0} />
          <StatCard
            icon={DollarSign}
            label="Ingresos mensuales"
            value={formatCurrency(stats?.monthlyRevenue ?? 0)}
            tone="green"
          />
          <StatCard
            icon={Dumbbell}
            label="Rutinas asignadas"
            value={stats?.routinesSent ?? 0}
            tone="brand"
          />
          <StatCard
            icon={AlertTriangle}
            label="Pagos vencidos"
            value={stats?.overdueCount ?? 0}
            tone="red"
          />
        </div>
      )}
    </AppLayout>
  )
}

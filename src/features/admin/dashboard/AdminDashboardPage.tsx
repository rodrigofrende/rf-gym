import type { ReactNode } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Activity, AlertTriangle, DollarSign, Dumbbell, RefreshCw, Users } from 'lucide-react'
import { useTenant } from '@/providers/TenantProvider'
import { usePrivacy } from '@/providers/PrivacyProvider'
import { useGymDashboard } from '@/hooks/useDashboard'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button, Card, CardHeader, FullPageSpinner, Money, StatCard } from '@/components/ui'
import { cn } from '@/utils/cn'
import { formatCurrency, formatDate } from '@/utils/format'

const STATUS_COLORS: Record<string, string> = {
  al_dia: '#10b981',
  overdue: '#f59e0b',
  blocked: '#ef4444',
  paused: '#a1a1aa',
}

const compactMoney = (v: number) => (v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${v}`)

export function AdminDashboardPage() {
  const { activeGymId } = useTenant()
  const gymId = activeGymId as string
  const { blurred } = usePrivacy()
  const { data, isLoading, isFetching, refetch, dataUpdatedAt } = useGymDashboard(gymId)

  return (
    <AppLayout
      title="Panel"
      subtitle={
        dataUpdatedAt
          ? `Última actualización: ${formatDate(new Date(dataUpdatedAt))}`
          : 'Cargando…'
      }
      actions={
        <Button
          variant="secondary"
          leftIcon={<RefreshCw className="size-4" />}
          loading={isFetching}
          onClick={() => refetch()}
        >
          Actualizar
        </Button>
      }
    >
      {isLoading || !data ? (
        <FullPageSpinner />
      ) : (
        <div className="space-y-4">
          {/* KPIs */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <StatCard
              icon={Users}
              label="Socios activos"
              value={data.sociosActivos}
              hint={`de ${data.sociosTotal} socios`}
            />
            <StatCard
              icon={DollarSign}
              label="Cobrado este mes"
              value={<Money value={data.cobradoEsteMes} />}
              tone="green"
            />
            <StatCard
              icon={AlertTriangle}
              label="Deuda"
              value={<Money value={data.deudaTotal} />}
              hint={`${data.vencidosCount} con deuda`}
              tone="red"
            />
            <StatCard
              icon={Dumbbell}
              label="Rutinas asignadas"
              value={data.rutinasActivas}
              tone="amber"
            />
            <StatCard
              icon={Activity}
              label="Registros de alumnos"
              value={data.logsTotal}
            />
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard title="Ingresos cobrados" subtitle="Últimos 6 meses" className="lg:col-span-2">
              <div className={cn('transition-[filter]', blurred && 'select-none blur-sm')}>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data.revenueByMonth} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} stroke="#a1a1aa" />
                  <YAxis tickFormatter={compactMoney} tickLine={false} axisLine={false} fontSize={12} stroke="#a1a1aa" width={48} />
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} cursor={{ fill: '#f4f4f5' }} />
                  <Bar dataKey="value" name="Cobrado" fill="var(--color-brand-600)" radius={[6, 6, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Socios por estado" subtitle="Estado de pago actual">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={data.statusBreakdown.filter((s) => s.value > 0)}
                    dataKey="value"
                    nameKey="label"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {data.statusBreakdown
                      .filter((s) => s.value > 0)
                      .map((s) => (
                        <Cell key={s.key} fill={STATUS_COLORS[s.key]} />
                      ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Actividad" subtitle="Entrenamientos registrados por semana">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={data.activityByWeek} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} stroke="#a1a1aa" />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} stroke="#a1a1aa" width={28} />
                  <Tooltip cursor={{ stroke: '#e4e4e7' }} />
                  <Line
                    type="monotone"
                    dataKey="value"
                    name="Registros"
                    stroke="var(--color-brand-600)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Altas de socios" subtitle="Nuevos por mes" className="lg:col-span-2">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.altasByMonth} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} stroke="#a1a1aa" />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} stroke="#a1a1aa" width={28} />
                  <Tooltip cursor={{ fill: '#f4f4f5' }} />
                  <Bar dataKey="value" name="Altas" fill="var(--color-brand-400)" radius={[6, 6, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </div>
      )}
    </AppLayout>
  )
}

function ChartCard({
  title,
  subtitle,
  className,
  children,
}: {
  title: string
  subtitle?: string
  className?: string
  children: ReactNode
}) {
  return (
    <Card className={className}>
      <CardHeader title={title} subtitle={subtitle} />
      <div className="p-3 pt-4">{children}</div>
    </Card>
  )
}

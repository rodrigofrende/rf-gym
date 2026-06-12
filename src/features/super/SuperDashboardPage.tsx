import { useNavigate } from 'react-router-dom'
import { Building2, LogIn, Plus, ShieldCheck, Wallet } from 'lucide-react'
import { useTenant } from '@/providers/TenantProvider'
import { useGyms } from '@/hooks/useGyms'
import { AppLayout } from '@/components/layout/AppLayout'
import { ROUTES } from '@/routes/routePaths'
import { getPaymentStatus } from '@/utils/payments'
import { Badge, Button, Card, CardHeader, EmptyState, FullPageSpinner, StatCard } from '@/components/ui'

export function SuperDashboardPage() {
  const navigate = useNavigate()
  const { selectGym } = useTenant()
  const { data: gyms = [], isLoading } = useGyms()

  const totalAdmins = gyms.reduce((sum, g) => sum + (g.adminUids?.length ?? 0), 0)
  const withDebt = gyms.filter(
    (g) => getPaymentStatus(g.subscription?.dueDate).state !== 'al_dia',
  ).length

  const enterGym = (gymId: string) => {
    selectGym(gymId)
    navigate(ROUTES.ADMIN_DASHBOARD)
  }

  return (
    <AppLayout title="Panel">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Plataforma RF Gym</h2>
          <p className="text-sm text-slate-500">
            Gestioná los gimnasios y sus administradores desde un solo lugar.
          </p>
        </div>

        {isLoading ? (
          <FullPageSpinner />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard icon={Building2} label="Gimnasios" value={gyms.length} tone="brand" />
              <StatCard icon={ShieldCheck} label="Administradores" value={totalAdmins} tone="green" />
              <StatCard icon={Wallet} label="Gimnasios con deuda" value={withDebt} tone="amber" />
            </div>

            <Card>
              <CardHeader
                title="Gimnasios"
                subtitle="Entrá a operar como admin o gestioná altas y administradores."
                action={
                  <Button
                    size="sm"
                    leftIcon={<Plus className="size-4" />}
                    onClick={() => navigate(ROUTES.SUPER_GYMS)}
                  >
                    Gestionar
                  </Button>
                }
              />
              {gyms.length === 0 ? (
                <EmptyState
                  icon={Building2}
                  title="Sin gimnasios"
                  description="Creá el primer gimnasio desde Gimnasios."
                />
              ) : (
                <div className="divide-y divide-slate-100">
                  {gyms.map((g) => (
                    <div key={g.id} className="flex items-center gap-3 px-5 py-3">
                      {g.logoURL ? (
                        <img src={g.logoURL} alt={g.name} className="size-9 rounded-xl object-cover" />
                      ) : (
                        <div className="flex size-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                          <Building2 className="size-5" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-slate-900">{g.name}</p>
                        <Badge tone={g.adminUids?.length ? 'neutral' : 'amber'}>
                          {g.adminUids?.length ?? 0} admin{(g.adminUids?.length ?? 0) === 1 ? '' : 's'}
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        leftIcon={<LogIn className="size-4" />}
                        onClick={() => enterGym(g.id)}
                      >
                        Entrar
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  )
}

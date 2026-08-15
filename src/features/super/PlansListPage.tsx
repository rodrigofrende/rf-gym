import { useState } from 'react'
import { Check, Layers, Pencil, Plus, Sparkles, Trash2 } from 'lucide-react'
import type { SubscriptionPlan } from '@/types'
import { useCreatePlan, usePlans, useRemovePlan, useUpdatePlan } from '@/hooks/usePlans'
import { useToastAction } from '@/hooks/useToastAction'
import { AppLayout } from '@/components/layout/AppLayout'
import { Badge, Button, Card, ConfirmDialog, EmptyState, FullPageSpinner, Heading, IconButton, InfoTooltip, Text } from '@/components/ui'
import { cn } from '@/utils/cn'
import { formatCurrency } from '@/utils/format'
import { limitLabel, logsCapabilityLabel, whiteLabelLabel } from '@/utils/plans'
import { PlanFormModal } from './PlanFormModal'

/**
 * Plantilla del plan pay-as-you-go ("A medida") para crearlo en un click.
 * El precio no se publica (customPricing) — solo ordena las cards de la landing.
 */
const CUSTOM_PLAN_TEMPLATE: Omit<SubscriptionPlan, 'id'> = {
  name: 'Alto Rendimiento',
  price: 60001, // apenas arriba del plan más caro para quedar último en la landing
  maxAdmins: 0,
  maxMembers: 0,
  maxRoutines: 0,
  maxExercises: 0,
  maxSponsors: 6, // tope real de la vidriera pública
  logsEnabled: true,
  maxLogsPerMember: 0,
  whiteLabel: 'full',
  features: [
    'Socios, admins y rutinas sin límite',
    'Todo lo de los otros planes, sin topes',
    'White-label completo con tu marca',
    'Dashboard y reportes completos',
    '6 espacios de patrocinadores destacados',
    'Soporte prioritario y onboarding asistido',
    'Precio que acompaña el tamaño de tu gimnasio',
  ],
  active: true,
  customPricing: true,
  highlighted: false,
}

/**
 * Plantillas sugeridas para completar los dos primeros tiers (se conservan los
 * nombres del owner; se pisan límites, beneficios, flags y el precio del medio).
 * Los textos de features están alineados con los límites — mantener en sync.
 */
const ENTRY_TEMPLATE: Partial<SubscriptionPlan> = {
  maxAdmins: 1,
  maxMembers: 30,
  maxRoutines: 10,
  maxExercises: 30,
  maxSponsors: 1,
  logsEnabled: false,
  maxLogsPerMember: 0,
  whiteLabel: 'none',
  features: [
    'Hasta 30 socios activos',
    'Gestión de socios, pagos y vencimientos',
    '10 rutinas y 30 ejercicios propios',
    'Check-in con QR y asistencia del día',
    'Página pública de tu gimnasio',
    '1 espacio para patrocinador',
  ],
  customPricing: false,
  highlighted: false,
}

const MEDIUM_TEMPLATE: Partial<SubscriptionPlan> = {
  price: 35000, // ~3.5× el tier de entrada — ratio Good-Better-Best estándar
  maxAdmins: 3,
  maxMembers: 150,
  maxRoutines: 50,
  maxExercises: 150,
  maxSponsors: 5,
  logsEnabled: true,
  maxLogsPerMember: 100,
  whiteLabel: 'basic',
  features: [
    'Hasta 150 socios y 3 administradores',
    'Todo lo del plan anterior',
    'Registro de cargas y progreso para tus socios',
    '50 rutinas y 150 ejercicios propios',
    'Tu logo y tus colores en la app',
    'Dashboard con métricas e ingresos',
    'Tienda con pedidos por WhatsApp',
    'Ranking mensual con imagen para compartir',
    'Hasta 5 patrocinadores',
  ],
  customPricing: false,
  highlighted: true,
}

export function PlansListPage() {
  const run = useToastAction()
  const { data: plans = [], isLoading } = usePlans()
  const create = useCreatePlan()
  const update = useUpdatePlan()
  const remove = useRemovePlan()

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<SubscriptionPlan | null>(null)
  const [toDelete, setToDelete] = useState<SubscriptionPlan | null>(null)
  const [templateConfirm, setTemplateConfirm] = useState(false)

  // Los dos primeros tiers con precio publicado (para completarlos con plantilla).
  const priced = plans
    .filter((p) => p.active && !p.customPricing)
    .sort((a, b) => a.price - b.price)
  const entryPlan = priced[0]
  const mediumPlan = priced[1]
  const needsTemplates =
    !!entryPlan && !!mediumPlan && (!entryPlan.features?.length || !mediumPlan.features?.length)

  const applyTemplates = async () => {
    if (!entryPlan || !mediumPlan) return
    const ok = await run(
      async () => {
        await update.mutateAsync({ planId: entryPlan.id, data: ENTRY_TEMPLATE })
        await update.mutateAsync({ planId: mediumPlan.id, data: MEDIUM_TEMPLATE })
      },
      {
        success: 'Planes completados. La landing ya muestra los beneficios.',
        error: 'No se pudieron completar los planes',
      },
    )
    if (ok) setTemplateConfirm(false)
  }

  const openNew = () => {
    setEditing(null)
    setModalOpen(true)
  }
  const openEdit = (p: SubscriptionPlan) => {
    setEditing(p)
    setModalOpen(true)
  }

  const handleSubmit = async (data: Omit<SubscriptionPlan, 'id'>) => {
    const ok = await run(
      () =>
        editing ? update.mutateAsync({ planId: editing.id, data }) : create.mutateAsync(data),
      {
        success: editing ? 'Plan actualizado' : 'Plan creado',
        error: 'No se pudo guardar el plan',
      },
    )
    if (ok) setModalOpen(false)
  }

  const confirmDelete = async () => {
    if (!toDelete) return
    const ok = await run(() => remove.mutateAsync(toDelete.id), {
      success: 'Plan eliminado',
      error: 'No se pudo eliminar',
    })
    if (ok) setToDelete(null)
  }

  return (
    <AppLayout
      title="Planes"
      subtitle={
        <span className="inline-flex items-center gap-1.5">
          Planes de suscripción que pagan los gimnasios.
          <InfoTooltip text="Los límites del plan se comparan contra el uso real del gym: socios, admins, rutinas y ejercicios." />
        </span>
      }
      actions={
        <>
          {/* Un click completa límites/beneficios/precio sugerido de los 2 primeros
              tiers; desaparece cuando ya tienen features cargadas. */}
          {needsTemplates && (
            <Button
              variant="secondary"
              leftIcon={<Sparkles className="size-4" />}
              onClick={() => setTemplateConfirm(true)}
            >
              Completar planes sugeridos
            </Button>
          )}
          {/* Un click crea el plan pay-as-you-go sugerido; desaparece cuando ya existe. */}
          {!plans.some((p) => p.customPricing && p.active) && (
            <Button
              variant="secondary"
              leftIcon={<Sparkles className="size-4" />}
              loading={create.isPending}
              onClick={() =>
                run(() => create.mutateAsync(CUSTOM_PLAN_TEMPLATE), {
                  success: 'Plan "A medida" creado. Ya aparece en la landing.',
                  error: 'No se pudo crear el plan',
                })
              }
            >
              Crear plan a medida
            </Button>
          )}
          <Button leftIcon={<Plus className="size-4" />} onClick={openNew}>
            Nuevo plan
          </Button>
        </>
      }
    >
      {isLoading ? (
        <FullPageSpinner />
      ) : plans.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="Sin planes"
          description="Creá los planes de suscripción (precio y límites) que ofrecés a los gimnasios."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((p) => (
            <Card key={p.id} className={cn('flex flex-col p-5', !p.active && 'opacity-60')}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Heading variant="card">{p.name}</Heading>
                    {p.highlighted && <Badge tone="brand">Recomendado</Badge>}
                    {!p.active && <Badge tone="amber">Inactivo</Badge>}
                  </div>
                  <Text variant="metric" className="mt-1">
                    {p.customPricing ? (
                      'A convenir'
                    ) : (
                      <>
                        {formatCurrency(p.price)}
                        <span className="text-sm font-normal text-zinc-400"> /mes</span>
                      </>
                    )}
                  </Text>
                </div>
                <div className="flex gap-1">
                  <IconButton
                    icon={<Pencil className="size-4" />}
                    label={`Editar ${p.name}`}
                    onClick={() => openEdit(p)}
                  />
                  <IconButton
                    icon={<Trash2 className="size-4" />}
                    label={`Eliminar ${p.name}`}
                    tone="danger"
                    onClick={() => setToDelete(p)}
                  />
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge tone="neutral">{limitLabel(p.maxAdmins)} admins</Badge>
                <Badge tone="neutral">{limitLabel(p.maxMembers)} socios</Badge>
                <Badge tone="neutral">{limitLabel(p.maxRoutines)} rutinas</Badge>
                <Badge tone="neutral">{limitLabel(p.maxExercises)} ejercicios</Badge>
                <Badge tone="neutral">{limitLabel(p.maxSponsors)} patrocinadores</Badge>
                <Badge tone={p.logsEnabled ? 'neutral' : 'amber'}>{logsCapabilityLabel(p)}</Badge>
                <Badge tone={p.whiteLabel === 'none' ? 'neutral' : 'brand'}>
                  {whiteLabelLabel(p.whiteLabel)}
                </Badge>
              </div>

              {p.features && p.features.length > 0 && (
                <ul className="mt-4 space-y-1.5 border-t border-zinc-100 pt-3">
                  {p.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-zinc-600">
                      <Check className="size-4 shrink-0 text-brand-600" />
                      {f}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ))}
        </div>
      )}

      <PlanFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        initial={editing}
        saving={create.isPending || update.isPending}
      />

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        title="Eliminar plan"
        description={`¿Querés eliminar el plan "${toDelete?.name}"? Esta acción no se puede deshacer.`}
        loading={remove.isPending}
      />

      <ConfirmDialog
        open={templateConfirm}
        onClose={() => setTemplateConfirm(false)}
        onConfirm={applyTemplates}
        title="Completar planes sugeridos"
        description={`Se completan límites, beneficios y flags de "${entryPlan?.name}" y "${mediumPlan?.name}" (que pasa a $35.000/mes y queda como Recomendado). Los nombres se conservan y podés retocar todo después.`}
        confirmLabel="Completar"
        tone="primary"
        loading={update.isPending}
      />
    </AppLayout>
  )
}

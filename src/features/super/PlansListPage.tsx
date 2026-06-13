import { useState } from 'react'
import { Check, Layers, Pencil, Plus, Trash2 } from 'lucide-react'
import type { SubscriptionPlan } from '@/types'
import { useCreatePlan, usePlans, useRemovePlan, useUpdatePlan } from '@/hooks/usePlans'
import { useToastAction } from '@/hooks/useToastAction'
import { AppLayout } from '@/components/layout/AppLayout'
import { Badge, Button, Card, ConfirmDialog, EmptyState, FullPageSpinner, Heading, IconButton, Text } from '@/components/ui'
import { cn } from '@/utils/cn'
import { formatCurrency } from '@/utils/format'
import { limitLabel, logsCapabilityLabel, whiteLabelLabel } from '@/utils/plans'
import { PlanFormModal } from './PlanFormModal'

export function PlansListPage() {
  const run = useToastAction()
  const { data: plans = [], isLoading } = usePlans()
  const create = useCreatePlan()
  const update = useUpdatePlan()
  const remove = useRemovePlan()

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<SubscriptionPlan | null>(null)
  const [toDelete, setToDelete] = useState<SubscriptionPlan | null>(null)

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
      subtitle="Planes de suscripción que pagan los gimnasios."
      actions={
        <Button leftIcon={<Plus className="size-4" />} onClick={openNew}>
          Nuevo plan
        </Button>
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
                  <div className="flex items-center gap-2">
                    <Heading variant="card">{p.name}</Heading>
                    {!p.active && <Badge tone="amber">Inactivo</Badge>}
                  </div>
                  <Text variant="metric" className="mt-1">
                    {formatCurrency(p.price)}
                    <span className="text-sm font-normal text-zinc-400"> /mes</span>
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
    </AppLayout>
  )
}

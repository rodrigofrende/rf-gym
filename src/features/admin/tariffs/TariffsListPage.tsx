import { useState } from 'react'
import { Pencil, Plus, Tags, Trash2 } from 'lucide-react'
import type { Tariff } from '@/types'
import { useTenant } from '@/providers/TenantProvider'
import { useToast } from '@/providers/ToastProvider'
import {
  useCreateTariff,
  useRemoveTariff,
  useTariffs,
  useUpdateTariff,
} from '@/hooks/useTariffs'
import { AppLayout } from '@/components/layout/AppLayout'
import { Badge, Button, Card, ConfirmDialog, EmptyState, FullPageSpinner } from '@/components/ui'
import { cn } from '@/utils/cn'
import { formatCurrency } from '@/utils/format'
import { frequencyLabel } from '@/utils/tariffs'
import { TariffFormModal } from './TariffFormModal'

export function TariffsListPage() {
  const { activeGymId } = useTenant()
  const gymId = activeGymId as string
  const { notify } = useToast()
  const { data: tariffs = [], isLoading } = useTariffs(gymId)
  const create = useCreateTariff(gymId)
  const update = useUpdateTariff(gymId)
  const remove = useRemoveTariff(gymId)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Tariff | null>(null)
  const [toDelete, setToDelete] = useState<Tariff | null>(null)

  const openNew = () => {
    setEditing(null)
    setModalOpen(true)
  }
  const openEdit = (t: Tariff) => {
    setEditing(t)
    setModalOpen(true)
  }

  const handleSubmit = async (data: Omit<Tariff, 'id'>) => {
    try {
      if (editing) await update.mutateAsync({ tariffId: editing.id, data })
      else await create.mutateAsync(data)
      notify(editing ? 'Tarifa actualizada' : 'Tarifa creada', 'success')
      setModalOpen(false)
    } catch {
      notify('No se pudo guardar la tarifa', 'error')
    }
  }

  const confirmDelete = async () => {
    if (!toDelete) return
    try {
      await remove.mutateAsync(toDelete.id)
      notify('Tarifa eliminada', 'success')
      setToDelete(null)
    } catch {
      notify('No se pudo eliminar', 'error')
    }
  }

  return (
    <AppLayout
      title="Tarifas"
      subtitle="Planes y precios que ofrece tu gimnasio."
      actions={
        <Button leftIcon={<Plus className="size-4" />} onClick={openNew}>
          Nueva tarifa
        </Button>
      }
    >
      {isLoading ? (
        <FullPageSpinner />
      ) : tariffs.length === 0 ? (
        <EmptyState
          icon={Tags}
          title="Sin tarifas"
          description="Creá los planes que ofrecés (servicio, frecuencia y precio) para asignarlos a tus socios."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tariffs.map((t) => (
            <Card key={t.id} className={cn('flex flex-col p-5', !t.active && 'opacity-60')}>
              <div className="flex items-start justify-between">
                <div className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <Tags className="size-5" />
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEdit(t)}
                    aria-label={`Editar ${t.name}`}
                    className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    onClick={() => setToDelete(t)}
                    aria-label={`Eliminar ${t.name}`}
                    className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <h3 className="font-semibold text-zinc-900">{t.name}</h3>
                <Badge tone="neutral">{frequencyLabel(t.weeklyFrequency)}</Badge>
                {!t.active && <Badge tone="amber">Inactiva</Badge>}
              </div>
              {t.description && <p className="mt-1 text-sm text-zinc-500">{t.description}</p>}
              <p className="mt-3 text-xl font-bold text-zinc-900">
                {formatCurrency(t.price)}
                <span className="text-sm font-normal text-zinc-400"> /mes</span>
              </p>
            </Card>
          ))}
        </div>
      )}

      <TariffFormModal
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
        title="Eliminar tarifa"
        description={`¿Querés eliminar la tarifa "${toDelete?.name}"? Esta acción no se puede deshacer.`}
        loading={remove.isPending}
      />
    </AppLayout>
  )
}

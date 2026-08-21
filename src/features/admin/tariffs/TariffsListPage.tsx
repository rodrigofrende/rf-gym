import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import type { Tariff } from '@/types'
import { useTenant } from '@/providers/TenantProvider'
import { useMembers } from '@/hooks/useMembers'
import {
  useCreateTariff,
  useRemoveTariff,
  useTariffs,
  useUpdateTariff,
} from '@/hooks/useTariffs'
import { useToastAction } from '@/hooks/useToastAction'
import { AppLayout } from '@/components/layout/AppLayout'
import {
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  FullPageSpinner,
  Money,
  Text,
} from '@/components/ui'
import { cn } from '@/utils/cn'
import { frequencyLongLabel, groupTariffsByName, type TariffGroup } from '@/utils/tariffs'
import { tariffIconMeta } from '@/utils/tariffIcons'
import { TariffFormModal } from './TariffFormModal'

function memberCountLabel(count: number): string {
  if (count <= 0) return ''
  return count === 1 ? '1 socio' : `${count} socios`
}

function TariffGroupCard({
  group,
  memberCountByTariff,
  onEdit,
}: {
  group: TariffGroup
  memberCountByTariff: Map<string, number>
  onEdit: (tariff: Tariff) => void
}) {
  const { icon: TariffIcon } = tariffIconMeta(group.icon)

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3">
        <div
          className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600"
          aria-hidden
        >
          <TariffIcon className="size-4" />
        </div>
        <h2 className="min-w-0 truncate text-sm font-semibold text-zinc-900">{group.name}</h2>
      </div>

      <ul>
        {group.items.map((tariff, index) => {
          const membersOnPlan = memberCountByTariff.get(tariff.id) ?? 0
          const countLabel = memberCountLabel(membersOnPlan)
          return (
            <li key={tariff.id}>
              <button
                type="button"
                onClick={() => onEdit(tariff)}
                aria-label={`Editar ${tariff.name}, ${frequencyLongLabel(tariff.weeklyFrequency)}`}
                className={cn(
                  'flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left hover:bg-zinc-50',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500',
                  index > 0 && 'border-t border-zinc-100',
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-zinc-900">
                    {frequencyLongLabel(tariff.weeklyFrequency)}
                  </p>
                  {tariff.description ? (
                    <p className="mt-0.5 truncate text-xs text-zinc-500">{tariff.description}</p>
                  ) : null}
                  {countLabel ? <p className="mt-0.5 text-xs text-zinc-500">{countLabel}</p> : null}
                </div>
                <div className="shrink-0 text-right">
                  <Money className="text-base font-semibold tabular-nums text-zinc-900" value={tariff.price} />
                  <span className="block text-xs text-zinc-400">/mes</span>
                </div>
              </button>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

export function TariffsListPage() {
  const { activeGymId } = useTenant()
  const gymId = activeGymId as string
  const run = useToastAction()
  const { data: tariffs = [], isLoading } = useTariffs(gymId)
  const { data: members = [] } = useMembers(gymId)
  const create = useCreateTariff(gymId)
  const update = useUpdateTariff(gymId)
  const remove = useRemoveTariff(gymId)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Tariff | null>(null)
  const [toDelete, setToDelete] = useState<Tariff | null>(null)

  const memberCountByTariff = useMemo(() => {
    const counts = new Map<string, number>()
    for (const member of members) {
      if (member.role !== 'user' || !member.tariffId) continue
      counts.set(member.tariffId, (counts.get(member.tariffId) ?? 0) + 1)
    }
    return counts
  }, [members])

  const activeGroups = useMemo(
    () => groupTariffsByName(tariffs.filter((tariff) => tariff.active)),
    [tariffs],
  )
  const inactiveGroups = useMemo(
    () => groupTariffsByName(tariffs.filter((tariff) => !tariff.active)),
    [tariffs],
  )

  const activeCount = tariffs.filter((tariff) => tariff.active).length
  const inactiveCount = tariffs.length - activeCount
  const membersOnDelete = toDelete ? (memberCountByTariff.get(toDelete.id) ?? 0) : 0

  const openNew = () => {
    setEditing(null)
    setModalOpen(true)
  }
  const openEdit = (tariff: Tariff) => {
    setEditing(tariff)
    setModalOpen(true)
  }

  const handleSubmit = async (data: Omit<Tariff, 'id'>) => {
    const ok = await run(
      () =>
        editing ? update.mutateAsync({ tariffId: editing.id, data }) : create.mutateAsync(data),
      {
        success: editing ? 'Tarifa actualizada' : 'Tarifa creada',
        error: 'No se pudo guardar la tarifa',
      },
    )
    if (ok) setModalOpen(false)
  }

  const confirmDelete = async () => {
    if (!toDelete) return
    const ok = await run(() => remove.mutateAsync(toDelete.id), {
      success: 'Tarifa eliminada',
      error: 'No se pudo eliminar',
    })
    if (ok) {
      setToDelete(null)
      setModalOpen(false)
    }
  }

  const summary = [
    activeCount > 0 ? (activeCount === 1 ? '1 plan activo' : `${activeCount} planes activos`) : null,
    inactiveCount > 0
      ? inactiveCount === 1
        ? '1 inactivo'
        : `${inactiveCount} inactivos`
      : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <AppLayout
      title="Tarifas"
      subtitle="Lo que cobrás por cada plan. Se usa al dar de alta un socio."
      actions={
        <Button leftIcon={<Plus className="size-4" />} fullWidth className="sm:w-auto" onClick={openNew}>
          Nueva tarifa
        </Button>
      }
    >
      {isLoading ? (
        <FullPageSpinner />
      ) : tariffs.length === 0 ? (
        <EmptyState
          icon={tariffIconMeta().icon}
          title="Sin tarifas"
          description="Creá los planes que ofrecés (servicio, días por semana y precio) para asignarlos a tus socios."
          action={
            <Button leftIcon={<Plus className="size-4" />} onClick={openNew}>
              Crear primera tarifa
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          {activeGroups.length > 0 && summary ? (
            <Text variant="caption" as="p">
              {summary}
            </Text>
          ) : null}

          {activeGroups.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {activeGroups.map((group) => (
                <TariffGroupCard
                  key={group.name}
                  group={group}
                  memberCountByTariff={memberCountByTariff}
                  onEdit={openEdit}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={tariffIconMeta().icon}
              title="Ningún plan activo"
              description="Los planes inactivos no aparecen al asignar el servicio a un socio. Activá uno o creá uno nuevo."
            />
          )}

          {inactiveGroups.length > 0 ? (
            <section className="space-y-3" aria-labelledby="inactive-tariffs-heading">
              <div>
                <h2 id="inactive-tariffs-heading" className="text-sm font-semibold text-zinc-900">
                  Inactivas
                </h2>
                <p className="mt-0.5 text-xs text-zinc-500">
                  No aparecen al asignar un plan a un socio.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {inactiveGroups.map((group) => (
                  <TariffGroupCard
                    key={group.name}
                    group={group}
                    memberCountByTariff={memberCountByTariff}
                    onEdit={openEdit}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}

      <TariffFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        onRequestDelete={editing ? () => setToDelete(editing) : undefined}
        initial={editing}
        saving={create.isPending || update.isPending}
      />

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        title="Eliminar tarifa"
        description={
          toDelete ? (
            <>
              ¿Querés eliminar{' '}
              <span className="font-medium text-zinc-800">
                {toDelete.name} · {frequencyLongLabel(toDelete.weeklyFrequency)}
              </span>
              ?
              {membersOnDelete > 0 ? (
                <>
                  {' '}
                  {membersOnDelete === 1
                    ? '1 socio tiene este plan y va a quedar sin tarifa asignada.'
                    : `${membersOnDelete} socios tienen este plan y van a quedar sin tarifa asignada.`}
                </>
              ) : null}{' '}
              Esta acción no se puede deshacer.
            </>
          ) : null
        }
        loading={remove.isPending}
      />
    </AppLayout>
  )
}

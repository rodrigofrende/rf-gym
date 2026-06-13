import { useState } from 'react'
import { Eye, Pencil, Plus, Trash2 } from 'lucide-react'
import type { Routine } from '@/types'
import { useAuth } from '@/providers/AuthProvider'
import { useTenant } from '@/providers/TenantProvider'
import {
  useCreateRoutine,
  useRemoveRoutine,
  useRoutines,
  useUpdateRoutine,
} from '@/hooks/useRoutines'
import { useToastAction } from '@/hooks/useToastAction'
import { AppLayout } from '@/components/layout/AppLayout'
import { Badge, Button, Card, ConfirmDialog, EmptyState, FullPageSpinner } from '@/components/ui'
import { routineIconMeta } from '@/utils/routineIcons'
import { RoutineFormModal } from './RoutineFormModal'
import { RoutineViewModal } from './RoutineViewModal'

const iconActionClass =
  'rounded-lg p-1.5 text-zinc-400 transition-colors focus-visible:outline-none focus-visible:ring-2'

export function RoutinesListPage() {
  const { user } = useAuth()
  const { activeGymId } = useTenant()
  const gymId = activeGymId as string
  const run = useToastAction()
  const { data: routines = [], isLoading } = useRoutines(gymId)
  const createRoutine = useCreateRoutine(gymId)
  const updateRoutine = useUpdateRoutine(gymId)
  const removeRoutine = useRemoveRoutine(gymId)

  const [modalOpen, setModalOpen] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const [editing, setEditing] = useState<Routine | null>(null)
  const [viewing, setViewing] = useState<Routine | null>(null)
  const [toDelete, setToDelete] = useState<Routine | null>(null)

  const openNew = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const openEdit = (r: Routine) => {
    setEditing(r)
    setViewOpen(false)
    setModalOpen(true)
  }

  const openView = (r: Routine) => {
    setViewing(r)
    setViewOpen(true)
  }

  const handleSubmit = async (data: Omit<Routine, 'id'>) => {
    const ok = await run(
      () =>
        editing
          ? updateRoutine.mutateAsync({ routineId: editing.id, data })
          : createRoutine.mutateAsync(data),
      {
        success: editing ? 'Rutina actualizada' : 'Rutina creada',
        error: 'No se pudo guardar la rutina',
      },
    )
    if (ok) setModalOpen(false)
  }

  const confirmDelete = async () => {
    if (!toDelete) return
    const ok = await run(() => removeRoutine.mutateAsync(toDelete.id), {
      success: 'Rutina eliminada',
      error: 'No se pudo eliminar',
    })
    if (ok) setToDelete(null)
  }

  return (
    <AppLayout
      title="Rutinas"
      subtitle="Plantillas de entrenamiento que asignás a tus socios."
      actions={
        <Button leftIcon={<Plus className="size-4" />} onClick={openNew}>
          Nueva rutina
        </Button>
      }
    >
      {isLoading ? (
        <FullPageSpinner />
      ) : routines.length === 0 ? (
        <EmptyState
          icon={routineIconMeta().icon}
          title="Sin rutinas"
          description="Creá rutinas con sus ejercicios y luego asignalas a tus socios."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {routines.map((r) => {
            const { icon: RoutineIcon } = routineIconMeta(r.icon)
            return (
              <Card key={r.id} className="flex flex-col p-5">
                <div className="flex items-start justify-between">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <RoutineIcon className="size-5" />
                  </div>
                  <div className="flex gap-0.5">
                    <button
                      onClick={() => openView(r)}
                      aria-label={`Ver ${r.name}`}
                      className={`${iconActionClass} hover:bg-brand-50 hover:text-brand-600 focus-visible:ring-brand-500`}
                    >
                      <Eye className="size-4" />
                    </button>
                    <button
                      onClick={() => openEdit(r)}
                      aria-label={`Editar ${r.name}`}
                      className={`${iconActionClass} hover:bg-zinc-100 hover:text-zinc-600 focus-visible:ring-brand-500`}
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      onClick={() => setToDelete(r)}
                      aria-label={`Eliminar ${r.name}`}
                      className={`${iconActionClass} hover:bg-red-50 hover:text-red-500 focus-visible:ring-red-500`}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
                <h3 className="mt-3 font-semibold text-zinc-900">{r.name}</h3>
                {r.description && <p className="mt-1 text-sm text-zinc-500">{r.description}</p>}
                <div className="mt-3">
                  <Badge tone="neutral">{r.exercises.length} ejercicios</Badge>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <RoutineViewModal
        open={viewOpen}
        onClose={() => setViewOpen(false)}
        routine={viewing}
        onEdit={openEdit}
      />

      <RoutineFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        initial={editing}
        createdBy={user?.uid ?? ''}
        saving={createRoutine.isPending || updateRoutine.isPending}
      />

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        title="Eliminar rutina"
        description={`¿Querés eliminar la rutina "${toDelete?.name}"? Esta acción no se puede deshacer.`}
        loading={removeRoutine.isPending}
      />
    </AppLayout>
  )
}

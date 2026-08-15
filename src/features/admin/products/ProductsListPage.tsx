import { useState } from 'react'
import { Pencil, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import type { Product } from '@/types'
import { useTenant } from '@/providers/TenantProvider'
import {
  useCreateProduct,
  useProducts,
  useRemoveProduct,
  useUpdateProduct,
} from '@/hooks/useProducts'
import { useToastAction } from '@/hooks/useToastAction'
import { AppLayout } from '@/components/layout/AppLayout'
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  FullPageSpinner,
  Heading,
  IconButton,
  LogoImage,
  Text,
} from '@/components/ui'
import { cn } from '@/utils/cn'
import { formatCurrency } from '@/utils/format'
import { discountedPrice } from '@/utils/products'
import { ProductFormModal } from './ProductFormModal'

export function ProductsListPage() {
  const { activeGymId } = useTenant()
  const gymId = activeGymId as string
  const run = useToastAction()
  const { data: products = [], isLoading } = useProducts(gymId)
  const create = useCreateProduct(gymId)
  const update = useUpdateProduct(gymId)
  const remove = useRemoveProduct(gymId)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [toDelete, setToDelete] = useState<Product | null>(null)

  const openNew = () => {
    setEditing(null)
    setModalOpen(true)
  }
  const openEdit = (p: Product) => {
    setEditing(p)
    setModalOpen(true)
  }

  const handleSubmit = async (data: Omit<Product, 'id'>) => {
    const ok = await run(
      () =>
        editing ? update.mutateAsync({ productId: editing.id, data }) : create.mutateAsync(data),
      {
        success: editing ? 'Producto actualizado' : 'Producto creado',
        error: 'No se pudo guardar el producto',
      },
    )
    if (ok) setModalOpen(false)
  }

  const confirmDelete = async () => {
    if (!toDelete) return
    const ok = await run(() => remove.mutateAsync(toDelete.id), {
      success: 'Producto eliminado',
      error: 'No se pudo eliminar',
    })
    if (ok) setToDelete(null)
  }

  return (
    <AppLayout
      title="Productos"
      subtitle="Suplementos y artículos que vende tu gimnasio."
      actions={
        <Button leftIcon={<Plus className="size-4" />} onClick={openNew}>
          Nuevo producto
        </Button>
      }
    >
      {isLoading ? (
        <FullPageSpinner />
      ) : products.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="Sin productos"
          description="Cargá los productos que vendés (suplementos, merch, accesorios) para que tus socios los pidan desde la tienda."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((p) => (
            <Card
              key={p.id}
              className={cn('flex flex-col overflow-hidden', !p.available && 'opacity-60')}
            >
              <LogoImage
                src={p.photoURL}
                alt={p.name}
                fallbackIcon={ShoppingBag}
                className="aspect-square w-full"
                iconClassName="size-10"
              />
              <div className="flex flex-1 flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <Heading variant="card">{p.name}</Heading>
                    {p.discountPct > 0 && <Badge tone="red">-{p.discountPct}%</Badge>}
                    {!p.available && <Badge tone="amber">No disponible</Badge>}
                  </div>
                  <div className="flex shrink-0 gap-1">
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
                <Text variant="caption" className="mt-1 line-clamp-2">
                  {p.description}
                </Text>
                <Text variant="metric" className="mt-auto pt-3 text-lg">
                  {p.discountPct > 0 && (
                    <span className="mr-1.5 text-xs font-normal text-zinc-400 line-through">
                      {formatCurrency(p.price)}
                    </span>
                  )}
                  {formatCurrency(discountedPrice(p.price, p.discountPct))}
                </Text>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ProductFormModal
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
        title="Eliminar producto"
        description={`¿Querés eliminar el producto "${toDelete?.name}"? Esta acción no se puede deshacer.`}
        loading={remove.isPending}
      />
    </AppLayout>
  )
}

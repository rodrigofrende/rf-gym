import { Plus, ShoppingBag } from 'lucide-react'
import type { Product } from '@/types'
import { Badge, Button, LogoImage, Modal, Text } from '@/components/ui'
import { formatCurrency } from '@/utils/format'
import { discountedPrice } from '@/utils/products'
import { QtyStepper } from './QtyStepper'

/**
 * Detalle del producto (se abre al clickear la card): foto grande, descripción
 * completa sin clamp y la acción de compra en el footer.
 */
export function ProductDetailModal({
  product,
  onClose,
  qty,
  onSetQty,
}: {
  product: Product | null
  onClose: () => void
  qty: number
  onSetQty: (productId: string, qty: number) => void
}) {
  if (!product) return null

  return (
    <Modal
      open
      onClose={onClose}
      title={product.name}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Text variant="metric">
            {product.discountPct > 0 && (
              <span className="mr-2 text-sm font-normal text-zinc-400 line-through">
                {formatCurrency(product.price)}
              </span>
            )}
            {formatCurrency(discountedPrice(product.price, product.discountPct))}
          </Text>
          {qty === 0 ? (
            <Button leftIcon={<Plus className="size-4" />} onClick={() => onSetQty(product.id, 1)}>
              Agregar al pedido
            </Button>
          ) : (
            <QtyStepper
              qty={qty}
              onChange={(q) => onSetQty(product.id, q)}
              productName={product.name}
            />
          )}
        </div>
      }
    >
      <div className="space-y-4">
        <LogoImage
          src={product.photoURL}
          alt={product.name}
          fallbackIcon={ShoppingBag}
          className="mx-auto aspect-square w-full max-w-sm rounded-xl"
          iconClassName="size-12"
        />
        {product.discountPct > 0 && (
          <Badge tone="red">-{product.discountPct}% de descuento</Badge>
        )}
        {/* whitespace-pre-line: respeta los saltos de línea que cargó el admin. */}
        <Text variant="body" className="whitespace-pre-line">
          {product.description}
        </Text>
      </div>
    </Modal>
  )
}

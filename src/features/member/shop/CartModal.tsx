import { MessageCircle, ShoppingCart } from 'lucide-react'
import { Button, EmptyState, LogoImage, Modal, Text } from '@/components/ui'
import { formatCurrency } from '@/utils/format'
import { discountedPrice, orderTotal, type OrderLine } from '@/utils/products'
import { QtyStepper } from './QtyStepper'

/**
 * Modal del pedido: líneas con stepper, total y CTA de WhatsApp. Componente
 * "tonto": la page arma las líneas (precios vivos) y la URL de wa.me.
 * El carrito NO se vacía al abrir WhatsApp: el pedido todavía no está confirmado.
 */
export function CartModal({
  open,
  onClose,
  lines,
  onSetQty,
  onClear,
  whatsappUrl,
}: {
  open: boolean
  onClose: () => void
  lines: OrderLine[]
  onSetQty: (productId: string, qty: number) => void
  onClear: () => void
  whatsappUrl: string | null
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Tu pedido"
      footer={
        lines.length > 0 ? (
          <div className="space-y-2">
            {!whatsappUrl && (
              <Text variant="caption">
                El gimnasio todavía no cargó su WhatsApp. Consultá en recepción.
              </Text>
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
              <Button type="button" variant="ghost" onClick={onClear}>
                Vaciar
              </Button>
              <Button
                type="button"
                leftIcon={<MessageCircle className="size-4" />}
                disabled={!whatsappUrl}
                onClick={() => whatsappUrl && window.open(whatsappUrl, '_blank', 'noopener,noreferrer')}
                fullWidth
                className="sm:w-auto"
              >
                Pedir por WhatsApp
              </Button>
            </div>
          </div>
        ) : undefined
      }
    >
      {lines.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="Tu pedido está vacío"
          description="Agregá productos de la tienda para armar tu pedido."
        />
      ) : (
        <>
          <div className="divide-y divide-zinc-100">
            {lines.map((l) => {
              const unit = discountedPrice(l.product.price, l.product.discountPct)
              return (
                <div key={l.product.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <LogoImage
                    src={l.product.photoURL}
                    alt={l.product.name}
                    fallbackIcon={ShoppingCart}
                    className="size-14 shrink-0 rounded-xl"
                    iconClassName="size-5"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-900">{l.product.name}</p>
                    <p className="text-xs text-zinc-500">
                      {formatCurrency(unit)} c/u
                      {l.product.discountPct > 0 && (
                        <span className="ml-1.5 text-zinc-400 line-through">
                          {formatCurrency(l.product.price)}
                        </span>
                      )}
                    </p>
                  </div>
                  <QtyStepper
                    qty={l.qty}
                    onChange={(q) => onSetQty(l.product.id, q)}
                    productName={l.product.name}
                  />
                  <span className="w-20 text-right text-sm font-semibold tabular-nums text-zinc-900">
                    {formatCurrency(l.qty * unit)}
                  </span>
                </div>
              )
            })}
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-4">
            <Text variant="label">Total</Text>
            <Text variant="metric">{formatCurrency(orderTotal(lines))}</Text>
          </div>
        </>
      )}
    </Modal>
  )
}

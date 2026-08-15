import { useEffect, useMemo, useState } from 'react'
import { Plus, ShoppingBag, ShoppingCart, Store } from 'lucide-react'
import type { Product } from '@/types'
import { useAuth } from '@/providers/AuthProvider'
import { useTenant } from '@/providers/TenantProvider'
import { useCart } from '@/providers/CartProvider'
import { useProducts } from '@/hooks/useProducts'
import { useGymPresentation } from '@/hooks/useGymPresentation'
import { AppLayout } from '@/components/layout/AppLayout'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  FullPageSpinner,
  Heading,
  LogoImage,
  Text,
} from '@/components/ui'
import { formatCurrency } from '@/utils/format'
import { whatsappLink } from '@/utils/contact'
import { buildOrderMessage, discountedPrice, orderTotal, type OrderLine } from '@/utils/products'
import { CartModal } from './CartModal'
import { ProductDetailModal } from './ProductDetailModal'
import { QtyStepper } from './QtyStepper'

export function ShopPage() {
  const { activeGymId, activeMembership } = useTenant()
  const gymId = activeGymId as string
  const { user } = useAuth()
  const { data: products = [], isLoading, isSuccess } = useProducts(gymId)
  const { data: presentation } = useGymPresentation(gymId)
  const cart = useCart()
  const [cartOpen, setCartOpen] = useState(false)
  const [detail, setDetail] = useState<Product | null>(null)

  const visible = useMemo(() => products.filter((p) => p.available), [products])

  // Depura el carrito cuando el catálogo carga OK (nunca en estados transitorios):
  // saca productos eliminados o que dejaron de estar disponibles.
  const { prune } = cart
  useEffect(() => {
    if (isSuccess) prune(new Set(visible.map((p) => p.id)))
  }, [isSuccess, visible, prune])

  // Líneas del pedido: join carrito → catálogo vivo (precio siempre actual).
  const lines: OrderLine[] = useMemo(
    () =>
      cart.items.flatMap((i) => {
        const product = visible.find((p) => p.id === i.productId)
        return product ? [{ product, qty: i.qty }] : []
      }),
    [cart.items, visible],
  )
  const lineCount = lines.reduce((sum, l) => sum + l.qty, 0)
  const total = orderTotal(lines)

  const gymName = activeMembership?.gymName ?? 'el gimnasio'
  const whatsappUrl =
    lines.length > 0
      ? whatsappLink(
          presentation?.whatsapp,
          buildOrderMessage(lines, gymName, user?.displayName ?? undefined),
        )
      : null

  return (
    <AppLayout title="Tienda" subtitle="Armá tu pedido y envialo por WhatsApp al gimnasio.">
      {isLoading ? (
        <FullPageSpinner />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={Store}
          title="Sin productos"
          description="Tu gimnasio todavía no cargó productos a la tienda."
        />
      ) : (
        <>
          {/* Grilla densa estilo e-commerce: 2 col en mobile, 4 en desktop (imagen
              1:1 → la foto se achica sola al angostarse la card). */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {visible.map((p) => {
              const qty = cart.qtyOf(p.id)
              return (
                <Card
                  key={p.id}
                  onClick={() => setDetail(p)}
                  className="flex cursor-pointer flex-col overflow-hidden transition-shadow hover:shadow-md"
                >
                  <LogoImage
                    src={p.photoURL}
                    alt={p.name}
                    fallbackIcon={ShoppingBag}
                    className="aspect-square w-full"
                    iconClassName="size-10"
                  />
                  <div className="flex flex-1 flex-col p-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Heading variant="card">{p.name}</Heading>
                      {p.discountPct > 0 && <Badge tone="red">-{p.discountPct}%</Badge>}
                    </div>
                    <Text variant="caption" className="mt-1 line-clamp-2">
                      {p.description}
                    </Text>
                    {/* stopPropagation: agregar/steppear no debe abrir el detalle. */}
                    <div
                      className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Text variant="metric" className="text-lg">
                        {p.discountPct > 0 && (
                          <span className="mr-1.5 text-xs font-normal text-zinc-400 line-through">
                            {formatCurrency(p.price)}
                          </span>
                        )}
                        {formatCurrency(discountedPrice(p.price, p.discountPct))}
                      </Text>
                      {qty === 0 ? (
                        <Button
                          size="sm"
                          leftIcon={<Plus className="size-4" />}
                          onClick={() => cart.setQty(p.id, 1)}
                        >
                          Agregar
                        </Button>
                      ) : (
                        <QtyStepper
                          qty={qty}
                          onChange={(q) => cart.setQty(p.id, q)}
                          productName={p.name}
                        />
                      )}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>

          {/* Barra sticky del pedido: visible mientras haya productos en el carrito. */}
          {lines.length > 0 && (
            <div className="sticky bottom-4 z-30 mt-6">
              <button
                type="button"
                onClick={() => setCartOpen(true)}
                className="flex w-full items-center justify-between gap-3 rounded-[var(--radius-card)] bg-brand-600 px-5 py-3.5 text-white shadow-lg transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  <ShoppingCart className="size-5" />
                  Ver pedido ({lineCount})
                </span>
                <span className="text-base font-semibold tabular-nums">
                  {formatCurrency(total)}
                </span>
              </button>
            </div>
          )}
        </>
      )}

      <ProductDetailModal
        product={detail}
        onClose={() => setDetail(null)}
        qty={detail ? cart.qtyOf(detail.id) : 0}
        onSetQty={cart.setQty}
      />

      <CartModal
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        lines={lines}
        onSetQty={cart.setQty}
        onClear={cart.clear}
        whatsappUrl={whatsappUrl}
      />
    </AppLayout>
  )
}

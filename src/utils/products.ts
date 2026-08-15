import type { Product } from '@/types'
import { formatCurrency } from './format'

/** Precio final con promo aplicada, redondeado a peso entero (sin decimales). */
export function discountedPrice(price: number, discountPct?: number): number {
  const pct = Math.min(Math.max(discountPct ?? 0, 0), 100)
  return pct > 0 ? Math.round((price * (100 - pct)) / 100) : price
}

/** Línea del pedido: producto vivo (precio actual) + cantidad elegida. */
export interface OrderLine {
  product: Product
  qty: number
}

export function orderTotal(lines: OrderLine[]): number {
  return lines.reduce(
    (sum, l) => sum + l.qty * discountedPrice(l.product.price, l.product.discountPct),
    0,
  )
}

/** Mensaje del pedido para WhatsApp (whatsappLink se encarga del URL-encode). */
export function buildOrderMessage(
  lines: OrderLine[],
  gymName: string,
  memberName?: string,
): string {
  const items = lines.map((l) => {
    const subtotal = formatCurrency(l.qty * discountedPrice(l.product.price, l.product.discountPct))
    const promo = l.product.discountPct > 0 ? ` (-${l.product.discountPct}%)` : ''
    return `- ${l.qty}x ${l.product.name} — ${subtotal}${promo}`
  })
  return [
    `Hola! Quiero hacer un pedido en ${gymName}:`,
    ...items,
    `Total: ${formatCurrency(orderTotal(lines))}`,
    ...(memberName ? [`Soy ${memberName}.`] : []),
  ].join('\n')
}

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useTenant } from './TenantProvider'

/**
 * Carrito de la tienda del socio. Guarda SOLO `{ productId, qty }`: precio y
 * nombre se re-derivan siempre de la query de productos, así un cambio de
 * precio o una baja nunca dejan datos viejos en el pedido.
 */
export interface CartItem {
  productId: string
  qty: number
}

const STORAGE_PREFIX = 'gym:cart:' // gym:cart:<gymId> — carrito aislado por gym
const MAX_QTY = 99

function storageKey(gymId: string) {
  return STORAGE_PREFIX + gymId
}

function readCart(gymId: string | null): CartItem[] {
  if (!gymId) return []
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(storageKey(gymId)) ?? '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (i): i is CartItem =>
        !!i &&
        typeof i === 'object' &&
        typeof (i as CartItem).productId === 'string' &&
        typeof (i as CartItem).qty === 'number' &&
        (i as CartItem).qty > 0,
    )
  } catch {
    return [] // JSON corrupto → carrito vacío
  }
}

interface CartContextValue {
  items: CartItem[]
  /** Suma de cantidades (para el badge del carrito). */
  count: number
  qtyOf: (productId: string) => number
  /** qty <= 0 elimina la línea; el máximo por producto es 99. */
  setQty: (productId: string, qty: number) => void
  clear: () => void
  /** Saca del carrito productos eliminados o que dejaron de estar disponibles. */
  prune: (validIds: Set<string>) => void
}

const CartContext = createContext<CartContextValue | null>(null)

interface CartState {
  gymId: string | null
  items: CartItem[]
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { activeGymId } = useTenant()
  const [state, setState] = useState<CartState>(() => ({
    gymId: activeGymId,
    items: readCart(activeGymId),
  }))

  // Cambio de gym: se re-lee el carrito ajustando estado durante el render
  // (patrón de react.dev; el render con estado viejo se descarta).
  if (state.gymId !== activeGymId) {
    setState({ gymId: activeGymId, items: readCart(activeGymId) })
  }

  // Sync entre pestañas: el evento 'storage' dispara SOLO en las otras
  // pestañas; la que escribe ya actualizó su estado en setQty/clear/prune.
  useEffect(() => {
    if (!activeGymId) return
    const onStorage = (e: StorageEvent) => {
      if (e.key === storageKey(activeGymId)) {
        setState({ gymId: activeGymId, items: readCart(activeGymId) })
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [activeGymId])

  const items = state.items
  const value = useMemo<CartContextValue>(() => {
    const persist = (next: CartItem[]) => {
      setState({ gymId: activeGymId, items: next })
      if (activeGymId) localStorage.setItem(storageKey(activeGymId), JSON.stringify(next))
    }
    return {
      items,
      count: items.reduce((sum, i) => sum + i.qty, 0),
      qtyOf: (productId) => items.find((i) => i.productId === productId)?.qty ?? 0,
      setQty: (productId, qty) => {
        if (qty <= 0) {
          persist(items.filter((i) => i.productId !== productId))
          return
        }
        const capped = Math.min(qty, MAX_QTY)
        persist(
          items.some((i) => i.productId === productId)
            ? items.map((i) => (i.productId === productId ? { ...i, qty: capped } : i))
            : [...items, { productId, qty: capped }],
        )
      },
      clear: () => persist([]),
      prune: (validIds) => {
        const next = items.filter((i) => validIds.has(i.productId))
        if (next.length !== items.length) persist(next)
      },
    }
  }, [items, activeGymId])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart debe usarse dentro de CartProvider')
  return ctx
}
